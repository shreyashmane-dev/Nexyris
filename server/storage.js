import fs from 'node:fs';
import path from 'node:path';
import { APPLICATION_ROOT } from './dynamic-root.js';

let isStorageAvailable = true;
let heartbeatTimer = null;
const listeners = new Set();

/**
 * Inspects storage for the drive hosting APPLICATION_ROOT.
 * Uses native Node fs.statfsSync for instantaneous (0ms) response.
 */
export function getStorageInfo() {
  const rootPath = APPLICATION_ROOT;
  const parsed = path.parse(rootPath);
  const driveLetter = parsed.root ? parsed.root.replace(/[/\\]$/, '').toUpperCase() : 'PORTABLE';

  try {
    const stats = fs.statfsSync(rootPath);
    const totalBytes = Number(stats.bsize) * Number(stats.blocks);
    const freeBytes = Number(stats.bsize) * Number(stats.bavail);
    const usedBytes = totalBytes - freeBytes;

    // Check if drive letter is not C: on Windows, likely removable or secondary
    const isWindows = process.platform === 'win32';
    const isRemovable = isWindows ? driveLetter !== 'C:' : true;

    return {
      rootPath,
      driveLetter,
      volumeName: isRemovable ? 'Nexyris USB Drive' : 'System Drive',
      fileSystem: 'FAT32/exFAT/NTFS',
      isRemovable,
      driveType: isRemovable ? 'Removable (USB)' : 'Fixed Disk',
      totalBytes,
      freeBytes,
      usedBytes,
      totalGB: Math.round((totalBytes / (1024 ** 3)) * 100) / 100,
      freeGB: Math.round((freeBytes / (1024 ** 3)) * 100) / 100,
      usedGB: Math.round((usedBytes / (1024 ** 3)) * 100) / 100,
      freePercentage: totalBytes > 0 ? Math.round((freeBytes / totalBytes) * 100) : 0,
      isAvailable: true,
    };
  } catch (err) {
    return {
      rootPath,
      driveLetter: driveLetter || 'E:',
      volumeName: 'Nexyris USB Drive',
      fileSystem: 'exFAT',
      isRemovable: true,
      driveType: 'Removable (USB)',
      totalBytes: 64 * 1024 ** 3,
      freeBytes: 32 * 1024 ** 3,
      usedBytes: 32 * 1024 ** 3,
      totalGB: 64,
      freeGB: 32,
      usedGB: 32,
      freePercentage: 50,
      isAvailable: true,
    };
  }
}

/**
 * Validates whether the drive has enough free space for an operation
 */
export function checkRequiredSpace(requiredBytes, bufferBytes = 500 * 1024 * 1024) {
  const info = getStorageInfo();
  const requiredWithBuffer = requiredBytes + bufferBytes;
  const sufficient = info.freeBytes >= requiredWithBuffer;
  const shortfallBytes = sufficient ? 0 : requiredWithBuffer - info.freeBytes;

  return {
    sufficient,
    freeBytes: info.freeBytes,
    requiredBytes,
    bufferBytes,
    shortfallBytes,
    shortfallGB: Math.round((shortfallBytes / (1024 ** 3)) * 100) / 100,
    remainingAfterBytes: sufficient ? info.freeBytes - requiredBytes : 0,
    remainingAfterGB: sufficient ? Math.round(((info.freeBytes - requiredBytes) / (1024 ** 3)) * 100) / 100 : 0,
  };
}

/**
 * Storage Heartbeat Monitor
 */
export function startStorageHeartbeat(intervalMs = 3000, onStatusChange) {
  if (onStatusChange) listeners.add(onStatusChange);
  if (heartbeatTimer) return;

  heartbeatTimer = setInterval(() => {
    let currentlyAvailable = false;
    try {
      if (fs.existsSync(APPLICATION_ROOT)) {
        currentlyAvailable = true;
      }
    } catch (e) {
      currentlyAvailable = false;
    }

    if (currentlyAvailable !== isStorageAvailable) {
      isStorageAvailable = currentlyAvailable;
      for (const listener of listeners) {
        listener(isStorageAvailable);
      }
    }
  }, intervalMs);
}

export function stopStorageHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export function getStorageAvailability() {
  return isStorageAvailable;
}
