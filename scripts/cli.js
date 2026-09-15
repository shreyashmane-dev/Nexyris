#!/usr/bin/env node
/**
 * Nexyris Local - Interactive Console CLI
 * 100% Terminal-Based Portable AI Studio
 * Runs completely from USB pendrive without browser or host C: drive dependencies.
 */

import readline from 'node:readline/promises';
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
import { getLiveHuggingFaceModels } from '../server/providers/hf-catalog.js';

// ANSI terminal colors
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

ensureDirectoryStructure();

let activeConversationId = null;
let activeModel = null;
let isExiting = false;

async function printBanner() {
  console.clear();
  console.log(`${C.cyan}${C.bright}`);
  console.log(`  _   _                 _       `);
  console.log(` | \\ | | _____  ___   _| |_ __(_)___ `);
  console.log(` |  \\| |/ _ \\ \\/ / | | | '__| / __|`);
  console.log(` | |\\  |  __/>  <| |_| | |  | \\__ \\`);
  console.log(` |_| \\_|\\___/_/\\_\\\\__, |_|  |_|___/`);
  console.log(`                  |___/   ${C.green}PORTABLE AI STUDIO [CONSOLE MODE]${C.cyan}`);
  console.log(`${C.gray}================================================================${C.reset}`);
  console.log(`${C.bright}USB Pendrive Root:${C.reset} ${APPLICATION_ROOT}`);
  
  const storage = getStorageInfo();
  console.log(`${C.bright}Pendrive Storage:${C.reset}  ${storage.freeGB} GB Free / ${storage.totalGB} GB Total (${storage.driveLetter})`);
  
  const hw = detectHardware();
  console.log(`${C.bright}Host Hardware:${C.reset}     ${hw.cpu.model} (${hw.cpu.physicalCores} Cores / ${hw.cpu.logicalThreads} Threads) | RAM: ${hw.ram.totalGB} GB`);
  if (hw.gpu?.detected) {
    console.log(`${C.bright}GPU Acceleration:${C.reset} ${hw.gpu.name} (${hw.gpu.acceleration})`);
  }
  console.log(`${C.gray}================================================================${C.reset}`);
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

async function handleChat(prompt, rl) {
  const models = await refreshModels();
  if (models.length === 0) {
    console.log(`\n${C.red}${C.bright}⚠️  NO AI MODEL INSTALLED ON USB PENDRIVE${C.reset}`);
    console.log(`${C.yellow}To chat offline, please download or import an AI model first.${C.reset}`);
    console.log(`${C.cyan}Type ${C.bright}/download${C.cyan} to choose from curated models or enter a Hugging Face link.${C.reset}\n`);
    return;
  }

  await ensureActiveModel(models);

  // Initialize conversation thread if not active
  if (!activeConversationId) {
    const title = prompt.slice(0, 30);
    const conv = createConversation('conv-' + Date.now(), title, activeModel.id);
    activeConversationId = conv.id;
  }

  // Save user message to shared SQLite database
  const userMsgId = 'msg-' + Date.now();
  addMessage(userMsgId, activeConversationId, 'user', prompt, 0, 0, activeModel.id);

  // Auto-launch model if not running
  if (runtimeManager.status !== 'READY' || !runtimeManager.currentModel || (!runtimeManager.process && runtimeManager.engineType !== 'ollama')) {
    process.stdout.write(`\n${C.yellow}Booting neural engine for ${activeModel.name}... ${C.reset}`);
    try {
      await runtimeManager.startModel(activeModel);
      console.log(`${C.green}Ready!${C.reset}\n`);
    } catch (err) {
      console.log(`${C.red}Failed: ${err.message}${C.reset}\n`);
      return;
    }
  }

  // Fetch conversation history
  const history = getConversationMessages(activeConversationId);
  const messagesPayload = history.map(m => ({ role: m.role, content: m.content }));

  process.stdout.write(`\n${C.cyan}${C.bright}${activeModel.name}:${C.reset} `);

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
        console.log(`\n${C.gray}[${metrics.tokensGenerated} tokens • ${metrics.speedTokPerSec} tok/s • ${metrics.elapsedMs}ms • Saved to USB db]${C.reset}\n`);
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
  console.log(`\n${C.cyan}${C.bright}Installed AI Models on USB Pendrive:${C.reset}`);
  if (models.length === 0) {
    console.log(`  ${C.yellow}No GGUF models found in models/gguf/${C.reset}`);
    console.log(`  Use ${C.bright}/download${C.reset} to download one directly onto your USB drive.\n`);
    return;
  }

  models.forEach((m, idx) => {
    const isActive = activeModel && (m.id === activeModel.id);
    const mark = isActive ? `${C.green}${C.bright}[ACTIVE] ` : '         ';
    console.log(`  ${mark}[${idx + 1}] ${C.bright}${m.name}${C.reset} (${m.sizeGB} GB) - ${C.gray}${m.filename}${C.reset}`);
  });

  console.log(`\n${C.gray}Enter model number to activate, or press Enter to keep current:${C.reset}`);
  const answer = await rl.question('  Selection: ');
  const num = parseInt(answer.trim(), 10);
  if (!isNaN(num) && num >= 1 && num <= models.length) {
    activeModel = models[num - 1];
    console.log(`${C.green}Active model switched to: ${activeModel.name}${C.reset}`);
    if (runtimeManager.process) {
      console.log(`${C.yellow}Switching running engine...${C.reset}`);
      await runtimeManager.startModel(activeModel);
      console.log(`${C.green}Model ready for inference.${C.reset}`);
    }
  }
  console.log('');
}

async function handleDownload(rl) {
  console.log(`\n${C.cyan}${C.bright}Curated Offline Models for USB Installation:${C.reset}\n`);
  let curated = [];
  try {
    curated = await getLiveHuggingFaceModels();
  } catch (e) {
    console.log(`${C.yellow}Failed to fetch live catalog, using offline presets.${C.reset}`);
  }

  curated.slice(0, 7).forEach((m, idx) => {
    console.log(`  [${idx + 1}] ${C.bright}${m.name}${C.reset} (${m.fileSizeGB} GB) [${m.label || m.category}]`);
    console.log(`      ${C.gray}${m.description}${C.reset}`);
  });
  console.log(`  [C] Custom Hugging Face GGUF direct URL`);
  console.log(`  [0] Cancel\n`);

  const choice = await rl.question('  Choose a model to download to USB: ');
  const trimmed = choice.trim();

  if (trimmed === '0' || !trimmed) return;

  let downloadUrl = '';
  let targetName = '';
  let filename = '';
  let expectedSize = 0;

  if (trimmed.toUpperCase() === 'C') {
    downloadUrl = (await rl.question('  Enter direct Hugging Face GGUF URL: ')).trim();
    if (!downloadUrl) return;
    filename = path.basename(downloadUrl).split('?')[0];
    targetName = filename.replace(/\.gguf$/i, '');
  } else {
    const num = parseInt(trimmed, 10);
    if (isNaN(num) || num < 1 || num > curated.length) {
      console.log(`${C.red}Invalid option.${C.reset}\n`);
      return;
    }
    const selected = curated[num - 1];
    downloadUrl = selected.downloadUrl;
    targetName = selected.name;
    filename = selected.filename || `${selected.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.gguf`;
    expectedSize = selected.fileSizeBytes || 0;
  }

  console.log(`\n${C.yellow}Starting download of "${targetName}" onto USB pendrive...${C.reset}`);
  console.log(`${C.gray}Destination: models/gguf/${filename}${C.reset}`);

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
            const barLen = 30;
            const filled = Math.round((data.percent / 100) * barLen);
            const bar = '█'.repeat(filled) + '-'.repeat(barLen - filled);
            process.stdout.write(`\r  [${bar}] ${data.percent}% (${data.downloadedGB}/${data.totalGB} GB @ ${data.speedMBs} MB/s, ETA: ${data.etaSeconds}s)   `);
          }
        } else if (data.status === 'completed') {
          process.stdout.write(`\n${C.green}${C.bright}✓ Download complete and verified on USB disk!${C.reset}\n\n`);
        } else if (data.status === 'error') {
          process.stdout.write(`\n${C.red}Download failed: ${data.error}${C.reset}\n\n`);
        }
      }
    });

    // Wait until download finishes or errors
    while (task.status === 'queued' || task.status === 'downloading' || task.status === 'verifying') {
      await new Promise(r => setTimeout(r, 500));
    }
    unsub();
  } catch (err) {
    console.log(`${C.red}Download error: ${err.message}${C.reset}\n`);
  }
}

async function handleStorage() {
  const s = getStorageInfo();
  console.log(`\n${C.cyan}${C.bright}USB Pendrive Storage Information:${C.reset}`);
  console.log(`  Drive Letter:   ${s.driveLetter}`);
  console.log(`  Volume Name:    ${s.volumeName}`);
  console.log(`  File System:    ${s.fileSystem}`);
  console.log(`  Removable USB:  ${s.isRemovable ? 'Yes' : 'No'}`);
  console.log(`  Total Space:    ${s.totalGB} GB`);
  console.log(`  Free Space:     ${s.freeGB} GB (${s.freePercentage}% free)`);
  console.log(`  Used Space:     ${s.usedGB} GB`);
  console.log(`  Host Isolation: 100% Confinded (Temp & Browser on USB)\n`);
}

async function handleHardware() {
  const hw = detectHardware(true);
  console.log(`\n${C.cyan}${C.bright}Host Computer Hardware Assessment:${C.reset}`);
  console.log(`  Operating System:  ${hw.os.distro} (${hw.os.arch})`);
  console.log(`  Processor (CPU):   ${hw.cpu.model}`);
  console.log(`  Cores / Threads:   ${hw.cpu.physicalCores} Physical Cores / ${hw.cpu.logicalThreads} Logical Threads`);
  console.log(`  Installed Memory:  ${hw.ram.totalGB} GB RAM (${hw.ram.freeGB} GB Free)`);
  console.log(`  GPU Detected:      ${hw.gpu.detected ? `${hw.gpu.name} (${hw.gpu.acceleration})` : 'Integrated / None'}`);
  console.log(`  Tuned Profile:     ${hw.performanceProfile}`);
  console.log(`  Optimal Threads:   ${hw.recommendedConfig.threads}`);
  console.log(`  Optimal Context:   ${hw.recommendedConfig.contextSize} tokens\n`);
}

async function handleHistory() {
  const convs = listConversations();
  console.log(`\n${C.cyan}${C.bright}Stored Conversations in USB SQLite Database:${C.reset}`);
  if (convs.length === 0) {
    console.log(`  ${C.gray}No conversations stored yet.${C.reset}\n`);
    return;
  }

  convs.forEach((c, idx) => {
    const isActive = c.id === activeConversationId ? `${C.green}[ACTIVE]${C.reset} ` : '         ';
    console.log(`  ${isActive}[${idx + 1}] ${C.bright}${c.title}${C.reset} (${c.message_count} msgs, Model: ${c.model_id || 'N/A'}) - ${C.gray}${new Date(c.updated_at).toLocaleString()}${C.reset}`);
  });
  console.log('');
}

function printHelp() {
  console.log(`\n${C.cyan}${C.bright}Nexyris Console Terminal Commands:${C.reset}`);
  console.log(`  ${C.bright}[text]${C.reset}       Chat with the active AI model (real streaming neural generation)`);
  console.log(`  ${C.bright}/models${C.reset}      List and switch installed GGUF models on USB`);
  console.log(`  ${C.bright}/download${C.reset}    Download GGUF models directly to USB from Hugging Face`);
  console.log(`  ${C.bright}/new${C.reset}         Start a fresh conversation`);
  console.log(`  ${C.bright}/history${C.reset}     View conversations saved in the shared USB SQLite database`);
  console.log(`  ${C.bright}/storage${C.reset}     Display USB pendrive volume capacity and free space`);
  console.log(`  ${C.bright}/hardware${C.reset}    Display host CPU cores, RAM, and GPU detection`);
  console.log(`  ${C.bright}/clear${C.reset}       Clear the terminal screen`);
  console.log(`  ${C.bright}/help${C.reset}        Show this command list`);
  console.log(`  ${C.bright}/exit${C.reset}        Safely terminate AI runtime and exit\n`);
}

async function main() {
  await printBanner();

  const rl = readline.createInterface({ input, output });

  // Handle clean exit on Ctrl+C or SIGINT
  rl.on('SIGINT', async () => {
    if (isExiting) return;
    isExiting = true;
    console.log(`\n${C.yellow}Safely shutting down local AI engine...${C.reset}`);
    await runtimeManager.stopModel();
    console.log(`${C.green}Exited cleanly. All data is saved on your USB pendrive.${C.reset}`);
    process.exit(0);
  });

  const models = await refreshModels();
  if (models.length > 0) {
    activeModel = models[0];
    console.log(`${C.green}Active Model:${C.reset} ${C.bright}${activeModel.name}${C.reset} (${activeModel.sizeGB} GB)`);
    console.log(`${C.gray}Type any message to chat, or /help for commands.${C.reset}\n`);
  } else {
    console.log(`${C.yellow}No AI models found on USB. Type ${C.bright}/download${C.yellow} to install a model.${C.reset}\n`);
  }

  while (!isExiting) {
    const promptTag = activeModel ? `${C.cyan}${activeModel.name}${C.reset} > ` : `${C.gray}Nexyris > ${C.reset}`;
    const userInput = await rl.question(promptTag);
    const trimmed = userInput.trim();

    if (!trimmed) continue;

    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(' ');
      const cmd = parts[0].toLowerCase();

      switch (cmd) {
        case '/help':
          printHelp();
          break;
        case '/models':
          await handleListModels(rl);
          break;
        case '/download':
          await handleDownload(rl);
          break;
        case '/storage':
          await handleStorage();
          break;
        case '/hardware':
          await handleHardware();
          break;
        case '/history':
          await handleHistory();
          break;
        case '/new':
          activeConversationId = null;
          console.log(`\n${C.green}Started a new conversation thread.${C.reset}\n`);
          break;
        case '/clear':
          await printBanner();
          break;
        case '/exit':
        case '/quit':
          isExiting = true;
          console.log(`\n${C.yellow}Stopping AI runtime...${C.reset}`);
          await runtimeManager.stopModel();
          console.log(`${C.green}Goodbye! Safe to remove your USB pendrive.${C.reset}\n`);
          rl.close();
          process.exit(0);
          break;
        default:
          console.log(`${C.red}Unknown command: ${cmd}. Type /help for available commands.${C.reset}\n`);
      }
    } else {
      await handleChat(trimmed, rl);
    }
  }
}

main().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
