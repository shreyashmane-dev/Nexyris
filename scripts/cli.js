#!/usr/bin/env node
/**
 * Nexyris Local - Interactive Console CLI
 * 100% Terminal-Based Portable AI Studio (Gemini CLI / Antigravity Style)
 * Runs completely from USB pendrive without browser or host C: drive dependencies.
 */

import readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import path from 'node:path';
import fs from 'node:fs';

// Strictly configure dynamic USB paths & temp confinement before anything else
import { PATHS, APPLICATION_ROOT, ensureDirectoryStructure } from '../server/dynamic-root.js';
import { detectHardware } from '../server/hardware.js';
import { getStorageInfo } from '../server/storage.js';
import { modelManager } from '../server/model-manager.js';
import { runtimeManager } from '../server/runtime-manager.js';
import { downloadManager } from '../server/download-manager.js';
import { getDatabase, createConversation, addMessage, getConversationMessages, listConversations } from '../server/db.js';
import { getLiveHuggingFaceModels, searchHuggingFace } from '../server/providers/hf-catalog.js';

// Modern ANSI styling (Gemini / Antigravity CLI Palette)
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[38;5;51m',
  sky: '\x1b[38;5;39m',
  emerald: '\x1b[38;5;48m',
  green: '\x1b[32m',
  yellow: '\x1b[38;5;220m',
  magenta: '\x1b[38;5;213m',
  purple: '\x1b[38;5;141m',
  red: '\x1b[38;5;203m',
  gray: '\x1b[38;5;244m',
  darkGray: '\x1b[38;5;238m',
  white: '\x1b[38;5;255m',
};

ensureDirectoryStructure();

let activeConversationId = null;
let activeModel = null;
let isExiting = false;

// Command registry for slash completion & help
const COMMANDS = [
  { name: '/model', desc: 'Switch active model or download new models from Hugging Face' },
  { name: '/models', desc: 'List and switch installed AI models on your USB drive' },
  { name: '/download', desc: 'Fetch & download verified GGUF models directly to USB' },
  { name: '/status', desc: 'Display host hardware specs, RAM usage & USB storage' },
  { name: '/storage', desc: 'Display USB volume capacity and free space' },
  { name: '/hardware', desc: 'Display host CPU, RAM, and GPU detection details' },
  { name: '/new', desc: 'Start a fresh conversation thread' },
  { name: '/history', desc: 'View past conversations saved in USB SQLite database' },
  { name: '/clear', desc: 'Clear the terminal screen' },
  { name: '/help', desc: 'Show interactive slash commands reference' },
  { name: '/exit', desc: 'Safely stop local AI engine and exit' },
];

function completer(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('/')) {
    const hits = COMMANDS.filter(c => c.name.startsWith(trimmed)).map(c => c.name);
    return [hits.length ? hits : COMMANDS.map(c => c.name), line];
  }
  return [[], line];
}

async function refreshModels() {
  const hardware = detectHardware();
  const { models } = await modelManager.scanAndSyncModels(hardware);
  return models;
}

async function ensureActiveModel(models) {
  if (models.length === 0) {
    activeModel = null;
    return null;
  }
  if (!activeModel || !models.find(m => m.id === activeModel.id)) {
    activeModel = models[0];
  }
  return activeModel;
}

function printHelpTable() {
  console.log(`\n${C.purple}╭─ ${C.bold}${C.white}Available Slash Commands${C.reset}${C.purple} ──────────────────────────────────────────╮${C.reset}`);
  COMMANDS.forEach(cmd => {
    const pad = ' '.repeat(14 - cmd.name.length);
    console.log(`${C.purple}│${C.reset}  ${C.cyan}${C.bold}${cmd.name}${C.reset}${pad} ${C.gray}${cmd.desc}${C.reset}${' '.repeat(Math.max(0, 52 - cmd.desc.length))}${C.purple}│${C.reset}`);
  });
  console.log(`${C.purple}╰───────────────────────────────────────────────────────────────────────────╯${C.reset}\n`);
}

async function printBanner() {
  console.clear();
  console.log(`${C.sky}${C.bold}`);
  console.log(`  _   _                 _       `);
  console.log(` | \\ | | _____  ___   _| |_ __(_)___ `);
  console.log(` |  \\| |/ _ \\ \\/ / | | | '__| / __|`);
  console.log(` | |\\  |  __/>  <| |_| | |  | \\__ \\`);
  console.log(` |_| \\_|\\___/_/\\_\\\\__, |_|  |_|___/`);
  console.log(`                  |___/   ${C.emerald}LOCAL AI STUDIO [GEMINI CLI MODE]${C.sky}`);
  console.log(`${C.darkGray}───────────────────────────────────────────────────────────────────${C.reset}`);
  
  const storage = getStorageInfo();
  const hw = detectHardware();
  const models = await refreshModels();
  await ensureActiveModel(models);

  console.log(`${C.purple}✦${C.reset} ${C.white}${C.bold}Pendrive:${C.reset}  ${storage.freeGB} GB Free / ${storage.totalGB} GB Total (${storage.driveLetter}) • 100% Confinded`);
  console.log(`${C.purple}✦${C.reset} ${C.white}${C.bold}Hardware:${C.reset}  ${hw.cpu.model} • ${hw.ram.totalGB} GB RAM`);
  if (hw.gpu?.detected) {
    console.log(`${C.purple}✦${C.reset} ${C.white}${C.bold}GPU:${C.reset}       ${hw.gpu.name} (${hw.gpu.acceleration})`);
  }
  if (activeModel) {
    console.log(`${C.emerald}✦${C.reset} ${C.white}${C.bold}Active Model:${C.reset} ${C.cyan}${C.bold}${activeModel.name}${C.reset} (${activeModel.sizeGB} GB • ${activeModel.quantization || 'Q4_K_M'})`);
  } else {
    console.log(`${C.yellow}✦${C.reset} ${C.yellow}${C.bold}Active Model:${C.reset} None installed. Type ${C.bold}/download${C.reset} to get one!`);
  }
  console.log(`${C.darkGray}───────────────────────────────────────────────────────────────────${C.reset}`);
  console.log(`${C.gray}Type your message to chat, or type ${C.cyan}${C.bold}/${C.gray} to see available commands.${C.reset}\n`);
}

async function handleChat(prompt) {
  const models = await refreshModels();
  if (models.length === 0) {
    console.log(`\n${C.red}${C.bold}⚠️  No AI model found on your USB pendrive.${C.reset}`);
    console.log(`${C.yellow}Type ${C.bold}/download${C.reset}${C.yellow} to fetch a live model from Hugging Face Hub.${C.reset}\n`);
    return;
  }

  await ensureActiveModel(models);

  if (!activeConversationId) {
    const title = prompt.slice(0, 30);
    const conv = createConversation('conv-' + Date.now(), title, activeModel.id);
    activeConversationId = conv.id;
  }

  const userMsgId = 'msg-' + Date.now();
  addMessage(userMsgId, activeConversationId, 'user', prompt, 0, 0, activeModel.id);

  if (runtimeManager.status !== 'READY' || !runtimeManager.currentModel || (!runtimeManager.process && runtimeManager.engineType !== 'ollama')) {
    process.stdout.write(`\n${C.yellow}⚡ Booting neural engine for ${activeModel.name}... ${C.reset}`);
    try {
      await runtimeManager.startModel(activeModel);
      console.log(`${C.emerald}Ready!${C.reset}\n`);
    } catch (err) {
      console.log(`${C.red}Failed: ${err.message}${C.reset}\n`);
      return;
    }
  }

  const history = getConversationMessages(activeConversationId);
  const messagesPayload = history.map(m => ({ role: m.role, content: m.content }));

  process.stdout.write(`\n${C.sky}${C.bold}Nexyris${C.reset} ${C.gray}[${activeModel.name}]${C.reset}\n`);

  let accumulated = '';
  try {
    await runtimeManager.streamChat(
      messagesPayload,
      { modelId: activeModel.id },
      (tokenData) => {
        accumulated += tokenData.text;
        process.stdout.write(tokenData.text);
      },
      (metrics) => {
        const asstMsgId = 'msg-' + Date.now();
        addMessage(asstMsgId, activeConversationId, 'assistant', accumulated, metrics.tokensGenerated, metrics.speedTokPerSec, activeModel.id);
        console.log(`\n\n${C.darkGray}─── ${C.emerald}● ${metrics.speedTokPerSec} tok/s${C.darkGray} • ${metrics.tokensGenerated} tokens • ${activeModel.name} • 100% Offline ───${C.reset}\n`);
      },
      (err) => {
        console.log(`\n${C.red}Inference error: ${err.message}${C.reset}\n`);
      }
    );
  } catch (err) {
    console.log(`\n${C.red}Chat error: ${err.message}${C.reset}\n`);
  }
}

async function handleListModels(rl) {
  const models = await refreshModels();
  console.log(`\n${C.sky}${C.bold}Installed AI Models on USB Pendrive:${C.reset}`);
  if (models.length === 0) {
    console.log(`  ${C.yellow}No GGUF models found in models/gguf/${C.reset}`);
    console.log(`  Use ${C.bold}/download${C.reset} to download one directly onto your USB drive.\n`);
    return;
  }

  models.forEach((m, idx) => {
    const isActive = activeModel && (m.id === activeModel.id);
    const mark = isActive ? `${C.emerald}${C.bold}▶ [ACTIVE] ` : '         ';
    console.log(`  ${mark}${C.white}${C.bold}[${idx + 1}]${C.reset} ${m.name} (${m.sizeGB} GB • ${m.quantization || 'Q4_K_M'})`);
  });

  console.log(`\n  ${C.cyan}[D] Download a new model from Hugging Face Hub${C.reset}`);
  console.log(`  ${C.gray}[Enter] Keep current model${C.reset}\n`);

  const answer = await askQuestion(rl, '  Select option: ');
  const trimmed = answer.trim();

  if (trimmed.toUpperCase() === 'D') {
    await handleDownload(rl);
    return;
  }

  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1 && num <= models.length) {
    activeModel = models[num - 1];
    console.log(`${C.emerald}Switched active model to: ${activeModel.name}${C.reset}`);
    if (runtimeManager.process) {
      process.stdout.write(`${C.yellow}Switching neural engine to ${activeModel.name}... ${C.reset}`);
      await runtimeManager.startModel(activeModel);
      console.log(`${C.emerald}Ready.${C.reset}`);
    }
  }
  console.log('');
}

async function handleDownload(rl) {
  console.log(`\n${C.purple}╭─ ${C.bold}${C.white}Hugging Face Live Model Hub (Direct to USB)${C.reset}${C.purple} ────────────────╮${C.reset}`);
  process.stdout.write(`  ${C.gray}Connecting to Hugging Face API...${C.reset} `);
  
  let curated = [];
  try {
    curated = await getLiveHuggingFaceModels();
    process.stdout.write(`${C.emerald}Online.${C.reset}\n\n`);
  } catch (e) {
    console.log(`\n  ${C.yellow}Offline mode: Using cached model catalog.${C.reset}\n`);
  }

  curated.slice(0, 6).forEach((m, idx) => {
    const label = m.label === 'UNCENSORED' ? `${C.red}[UNCENSORED]${C.reset}` : `${C.sky}[${m.badge || 'VERIFIED'}]${C.reset}`;
    console.log(`  ${C.white}${C.bold}[${idx + 1}]${C.reset} ${C.bold}${m.name}${C.reset} (~${m.fileSizeGB || '2.0'} GB) ${label}`);
    console.log(`      ${C.gray}${m.description || m.filename}${C.reset}`);
  });

  console.log(`\n  ${C.cyan}${C.bold}[S] Search Hugging Face Hub${C.reset} (e.g. 'qwen2.5', 'deepseek', 'smollm')`);
  console.log(`  ${C.gray}[C] Custom direct Hugging Face GGUF URL`);
  console.log(`  [0] Cancel${C.reset}\n`);

  const choice = await askQuestion(rl, '  Enter choice: ');
  const trimmed = choice.trim();

  if (trimmed === '0' || !trimmed) return;

  let downloadUrl = '';
  let targetName = '';
  let filename = '';
  let expectedSize = 0;

  if (trimmed.toUpperCase() === 'S') {
    const q = await askQuestion(rl, '  Search query: ');
    if (!q.trim()) return;
    console.log(`\n  ${C.gray}Querying Hugging Face Hub for "${q.trim()}"...${C.reset}`);
    const searchResults = await searchHuggingFace(q.trim(), 8);
    if (searchResults.length === 0) {
      console.log(`  ${C.yellow}No matching GGUF models found on Hugging Face.${C.reset}\n`);
      return;
    }
    console.log(`\n${C.sky}${C.bold}  Search Results:${C.reset}\n`);
    searchResults.forEach((r, idx) => {
      console.log(`  ${C.white}${C.bold}[${idx + 1}]${C.reset} ${C.bold}${r.name}${C.reset} (${r.downloads?.toLocaleString() || 0} DLs)`);
      console.log(`      ${C.gray}Repo: ${r.id} • ${r.filename}${C.reset}`);
    });
    const subChoice = await askQuestion(rl, '\n  Select model number to download (0 to cancel): ');
    const subNum = parseInt(subChoice.trim(), 10);
    if (isNaN(subNum) || subNum < 1 || subNum > searchResults.length) return;
    const chosen = searchResults[subNum - 1];
    downloadUrl = chosen.downloadUrl;
    targetName = chosen.name;
    filename = chosen.filename;
    expectedSize = 4.5 * (1024 ** 3);
  } else if (trimmed.toUpperCase() === 'C') {
    downloadUrl = (await askQuestion(rl, '  Enter direct Hugging Face URL: ')).trim();
    if (!downloadUrl) return;
    filename = path.basename(downloadUrl).split('?')[0];
    targetName = filename.replace(/\.gguf$/i, '');
  } else {
    const num = parseInt(trimmed, 10);
    if (isNaN(num) || num < 1 || num > curated.length) {
      console.log(`  ${C.red}Invalid option.${C.reset}\n`);
      return;
    }
    const selected = curated[num - 1];
    downloadUrl = selected.downloadUrl;
    targetName = selected.name;
    filename = selected.filename || `${selected.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.gguf`;
    expectedSize = selected.fileSizeBytes || (selected.fileSizeGB * (1024 ** 3)) || 0;
  }

  console.log(`\n  ${C.yellow}Starting download of "${targetName}"...${C.reset}`);
  console.log(`  ${C.gray}Saving to: models/gguf/${filename}${C.reset}\n`);

  try {
    const task = await downloadManager.queueDownload({
      id: 'dl-' + Date.now(),
      name: targetName,
      url: downloadUrl,
      filename,
      expectedSize,
    });

    let lastPercent = -1;
    const unsub = downloadManager.onProgress((event, data) => {
      if (data.id === task.id) {
        if (data.status === 'downloading') {
          if (data.percent !== lastPercent) {
            lastPercent = data.percent;
            const barLen = 24;
            const filled = Math.round((data.percent / 100) * barLen);
            const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
            const speed = data.speedMBs ? `${data.speedMBs} MB/s` : 'Connecting...';
            const eta = data.etaSeconds ? `${data.etaSeconds}s` : '--';
            process.stdout.write(`\r  ${C.cyan}[${bar}] ${data.percent}%${C.reset} (${data.downloadedGB}/${data.totalGB} GB @ ${C.emerald}${speed}${C.reset}, ETA: ${eta})   `);
          }
        } else if (data.status === 'reconnecting') {
          process.stdout.write(`\n  ${C.yellow}⚠ Disconnected. Auto-resuming from USB part file...${C.reset}\n`);
        } else if (data.status === 'completed') {
          process.stdout.write(`\n\n  ${C.emerald}${C.bold}✓ Download complete and verified on USB drive!${C.reset}\n\n`);
          refreshModels().then((updatedModels) => {
            ensureActiveModel(updatedModels);
          });
        } else if (data.status === 'error') {
          process.stdout.write(`\n  ${C.red}Download failed: ${data.error}${C.reset}\n\n`);
        }
      }
    });

    while (task.status === 'queued' || task.status === 'downloading' || task.status === 'verifying') {
      await new Promise(r => setTimeout(r, 400));
    }
    unsub();
  } catch (err) {
    console.log(`  ${C.red}Download error: ${err.message}${C.reset}\n`);
  }
}

async function handleStatus() {
  const s = getStorageInfo();
  const hw = detectHardware(true);
  console.log(`\n${C.purple}╭─ ${C.bold}${C.white}Nexyris System & Storage Status${C.reset}${C.purple} ─────────────────────────────╮${C.reset}`);
  console.log(`  ${C.bold}Host CPU:${C.reset}        ${hw.cpu.model} (${hw.cpu.physicalCores} Cores / ${hw.cpu.logicalThreads} Threads)`);
  console.log(`  ${C.bold}Host Memory:${C.reset}     ${hw.ram.totalGB} GB RAM (${hw.ram.freeGB} GB Available)`);
  console.log(`  ${C.bold}GPU:${C.reset}             ${hw.gpu.detected ? `${hw.gpu.name} (${hw.gpu.acceleration})` : 'Integrated / CPU Mode'}`);
  console.log(`  ${C.bold}USB Drive:${C.reset}       ${s.driveLetter} (${s.volumeName || 'Nexyris USB'}) • ${s.fileSystem}`);
  console.log(`  ${C.bold}USB Capacity:${C.reset}    ${s.freeGB} GB Free / ${s.totalGB} GB Total (${s.freePercentage}% free)`);
  console.log(`  ${C.bold}Active Model:${C.reset}    ${activeModel ? `${activeModel.name} (${activeModel.sizeGB} GB)` : 'None'}`);
  console.log(`  ${C.bold}Engine Status:${C.reset}   ${runtimeManager.status} (${runtimeManager.engineType})`);
  console.log(`${C.purple}╰───────────────────────────────────────────────────────────────────────────╯${C.reset}\n`);
}

function askQuestion(rl, query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  await printBanner();

  const rl = readline.createInterface({
    input,
    output,
    completer,
  });

  rl.on('SIGINT', async () => {
    if (isExiting) return;
    isExiting = true;
    console.log(`\n${C.yellow}Safely shutting down local AI runtime...${C.reset}`);
    await runtimeManager.stopModel();
    console.log(`${C.emerald}Exited cleanly. Safe to remove USB pendrive.${C.reset}\n`);
    process.exit(0);
  });

  while (!isExiting) {
    const modelTag = activeModel ? `${C.emerald}[${activeModel.name}]${C.reset}` : `${C.yellow}[No Model]${C.reset}`;
    const promptStr = `${C.purple}Nexyris${C.reset} ${modelTag} ${C.sky}❯${C.reset} `;
    
    const userInput = await askQuestion(rl, promptStr);
    const trimmed = userInput.trim();

    if (!trimmed) continue;

    // Handle slash commands or suggest if typing /
    if (trimmed === '/' || trimmed === '/?' || trimmed === '/help') {
      printHelpTable();
      continue;
    }

    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(' ');
      const cmd = parts[0].toLowerCase();

      switch (cmd) {
        case '/model':
        case '/models':
          await handleListModels(rl);
          break;
        case '/download':
          await handleDownload(rl);
          break;
        case '/status':
          await handleStatus();
          break;
        case '/storage':
          const s = getStorageInfo();
          console.log(`\n  ${C.bold}USB Drive:${C.reset} ${s.driveLetter} (${s.freeGB} GB Free / ${s.totalGB} GB Total)\n`);
          break;
        case '/hardware':
          const hw = detectHardware();
          console.log(`\n  ${C.bold}CPU:${C.reset} ${hw.cpu.model}\n  ${C.bold}RAM:${C.reset} ${hw.ram.totalGB} GB\n`);
          break;
        case '/history':
          const convs = listConversations();
          console.log(`\n${C.sky}${C.bold}Stored Conversations on USB:${C.reset}`);
          if (convs.length === 0) {
            console.log(`  ${C.gray}No conversations stored yet.${C.reset}\n`);
          } else {
            convs.forEach((c, idx) => {
              const active = c.id === activeConversationId ? `${C.emerald}[ACTIVE] ` : '         ';
              console.log(`  ${active}[${idx + 1}] ${c.title} (${c.message_count} messages)`);
            });
            console.log('');
          }
          break;
        case '/new':
          activeConversationId = null;
          console.log(`\n  ${C.emerald}✓ Started a fresh conversation session.${C.reset}\n`);
          break;
        case '/clear':
          await printBanner();
          break;
        case '/exit':
        case '/quit':
          isExiting = true;
          console.log(`\n${C.yellow}Stopping AI runtime...${C.reset}`);
          await runtimeManager.stopModel();
          console.log(`${C.emerald}Exited cleanly. Safe to remove USB pendrive.${C.reset}\n`);
          rl.close();
          process.exit(0);
          break;
        default:
          console.log(`\n  ${C.red}Unknown command: ${cmd}${C.reset}`);
          console.log(`  Type ${C.cyan}/help${C.reset} or ${C.cyan}/${C.reset} to see all available commands.\n`);
      }
    } else {
      await handleChat(trimmed);
    }
  }
}

main().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
