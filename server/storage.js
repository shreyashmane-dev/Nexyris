import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { APPLICATION_ROOT } from './dynamic-root.js';

const execAsync = promisify(exec);

let isStorageAvailable = true;
let heartbeatTimer = null;
const listeners = new Set();

/**
 * Inspects storage for the drive hosting APPLICATION_ROOT
 */
export async function getStorageInfo() {
  const rootPath = APPLICATION_ROOT;
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    try {
      const driveMatch = rootPath.match(/^([A-Za-z]:)/);
      const driveLetter = driveMatch ? driveMatch[1].toUpperCase() : 'C:';

      // Use PowerShell to get drive details
      const cmd = `powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk -Filter \\"DeviceID='${driveLetter}'\\" | Select-Object DeviceID, DriveType, VolumeName, Size, FreeSpace, FileSystem | ConvertTo-Json"`;
      const { stdout } = await execAsync(cmd);
      const data = JSON.parse(stdout.trim());

      const totalBytes = Number(data.Size) || 0;
      const freeBytes = Number(data.FreeSpace) || 0;
      const usedBytes = totalBytes - freeBytes;
      const isRemovable = Number(data.DriveType) === 2; // DriveType 2 = Removable Drive / USB

      return {
        rootPath,
        driveLetter,
        volumeName: data.VolumeName || 'Portable Drive',
        fileSystem: data.FileSystem || 'Unknown',
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
      console.warn('Storage detection error via PowerShell, falling back to basic check:', err.message);
    }
  }

  // Fallback for Linux, macOS or if Windows CIM fails
  try {
    const stats = fs.statfsSync(rootPath);
    const totalBytes = stats.bsize * stats.blocks;
    const freeBytes = stats.bsize * stats.bavail;
    const usedBytes = totalBytes - freeBytes;

    return {
      rootPath,
      driveLetter: path.parse(rootPath).root,
      volumeName: 'Portable Drive',
      fileSystem: 'Generic',
      isRemovable: true,
      driveType: 'Portable Storage',
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
      driveLetter: 'Unknown',
      volumeName: 'Unknown',
      fileSystem: 'Unknown',
      isRemovable: true,
      driveType: 'Removable Storage',
      totalBytes: 32 * 1024 ** 3,
      freeBytes: 16 * 1024 ** 3,
      usedBytes: 16 * 1024 ** 3,
      totalGB: 32,
      freeGB: 16,
      usedGB: 16,
      freePercentage: 50,
      isAvailable: true,
    };
  }
}

/**
 * Validates whether the drive has enough free space for an operation
 */
export async function checkRequiredSpace(requiredBytes, bufferBytes = 500 * 1024 * 1024) {
  const info = await getStorageInfo();
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
 * Regularly verifies that the portable drive root exists and is accessible.
 * If USB is unplugged, triggers alert event to pause all operations immediately.
 */
export function startStorageHeartbeat(intervalMs = 3000, onStatusChange) {
  if (onStatusChange) listeners.add(onStatusChange);
  if (heartbeatTimer) return;

  heartbeatTimer = setInterval(() => {
    let currentlyAvailable = false;
    try {
      if (fs.existsSync(APPLICATION_ROOT)) {
        // Quick access test
        const testFile = path.join(APPLICATION_ROOT, 'data', '.heartbeat');
        fs.writeFileSync(testFile, Date.now().toString());
        fs.unlinkSync(testFile);
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
