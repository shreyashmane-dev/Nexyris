import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from './dynamic-root.js';

const CONFIG_FILE = path.join(PATHS.config, 'config.json');

/**
 * Loads the main portable configuration
 */
export function getPortableConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('Could not read portable config, creating default:', err.message);
  }

  const defaultConf = {
    product: 'Nexyris Local',
    tagline: 'Portable AI. Your models. Your drive. Your control.',
    version: '1.0.0',
    installed: false,
    firstRunCompleted: false,
    theme: 'dark',
    defaultApplication: 'chat',
    activeModelId: null,
    storageCheckThresholdMB: 1024,
    downloadMaxConcurrent: 1,
    offlineOnly: true,
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };

  savePortableConfig(defaultConf);
  return defaultConf;
}

/**
 * Saves updates to portable configuration
 */
export function savePortableConfig(updates) {
  try {
    const current = fs.existsSync(CONFIG_FILE) 
      ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) 
      : {};
    const merged = { 
      ...current, 
      ...updates, 
      lastUpdated: new Date().toISOString() 
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
  } catch (err) {
    console.error('Failed to save portable config:', err);
    throw err;
  }
}

/**
 * Loads host-specific configuration for a particular machine.
 * If this machine hasn't run Nexyris before, initializes with recommended hardware settings.
 */
export function getHostConfig(hardware) {
  const hostId = hardware.hostId;
  const hostConfigFile = path.join(PATHS.configHosts, `${hostId}.json`);

  if (fs.existsSync(hostConfigFile)) {
    try {
      return JSON.parse(fs.readFileSync(hostConfigFile, 'utf-8'));
    } catch (e) {
      console.warn(`Corrupted host config for ${hostId}, reinitializing`);
    }
  }

  // Create initial host config derived from hardware detection
  const initialHostConfig = {
    hostId,
    hostname: hardware.hostname,
    os: hardware.os.distro,
    cpu: hardware.cpu.model,
    ramGB: hardware.ram.totalGB,
    gpu: hardware.gpu.name,
    threads: hardware.recommendedConfig.threads,
    gpuLayers: hardware.recommendedConfig.gpuLayers,
    contextSize: hardware.recommendedConfig.contextSize,
    batchSize: hardware.recommendedConfig.batchSize,
    temperature: 0.7,
    topP: 0.9,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(hostConfigFile, JSON.stringify(initialHostConfig, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write host config:', err);
  }

  return initialHostConfig;
}

/**
 * Saves changes to a host's performance tuning
 */
export function saveHostConfig(hostId, updates) {
  const hostConfigFile = path.join(PATHS.configHosts, `${hostId}.json`);
  let current = {};
  if (fs.existsSync(hostConfigFile)) {
    try {
      current = JSON.parse(fs.readFileSync(hostConfigFile, 'utf-8'));
    } catch (e) {}
  }
  const merged = { ...current, ...updates, lastSeen: new Date().toISOString() };
  fs.writeFileSync(hostConfigFile, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}
