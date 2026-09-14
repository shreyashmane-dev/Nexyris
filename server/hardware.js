import os from 'node:os';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

let cachedHardwareInfo = null;

/**
 * Detects host computer hardware (CPU, RAM, GPU, OS, architecture)
 */
export async function detectHardware(forceRefresh = false) {
  if (cachedHardwareInfo && !forceRefresh) {
    return cachedHardwareInfo;
  }

  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model?.trim() || 'Generic Multi-Core CPU';
  const cpuThreads = cpus.length;
  const totalRamBytes = os.totalmem();
  const freeRamBytes = os.freemem();
  const totalRamGB = Math.round((totalRamBytes / (1024 ** 3)) * 10) / 10;
  const freeRamGB = Math.round((freeRamBytes / (1024 ** 3)) * 10) / 10;

  let gpuInfo = {
    detected: false,
    name: 'Integrated / Basic Display',
    vendor: 'Unknown',
    vramMB: 0,
    vramGB: 0,
    hasCuda: false,
    hasVulkan: false,
    acceleration: 'CPU Mode (AVX2/NEON)',
  };

  const isWindows = process.platform === 'win32';
  let physicalCores = Math.max(1, Math.floor(cpuThreads / 2));

  if (isWindows) {
    try {
      // Query CPU physical cores
      const cpuCmd = `powershell -NoProfile -Command "Get-CimInstance Win32_Processor | Select-Object NumberOfCores, NumberOfLogicalProcessors | ConvertTo-Json"`;
      const { stdout: cpuOut } = await execAsync(cpuCmd);
      if (cpuOut.trim()) {
        const cpuData = JSON.parse(cpuOut.trim());
        if (cpuData.NumberOfCores) {
          physicalCores = Number(cpuData.NumberOfCores);
        }
      }
    } catch (e) {
      // Keep default
    }

    try {
      // Query GPU
      const gpuCmd = `powershell -NoProfile -Command "Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM | ConvertTo-Json"`;
      const { stdout: gpuOut } = await execAsync(gpuCmd);
      if (gpuOut.trim()) {
        const raw = JSON.parse(gpuOut.trim());
        const gpus = Array.isArray(raw) ? raw : [raw];
        // Look for dedicated GPU first (NVIDIA, AMD, Intel Arc)
        const dedicated = gpus.find(g => /nvidia|geforce|rtx|gtx|radeon|rx|arc/i.test(g.Name || '')) || gpus[0];
        if (dedicated && dedicated.Name) {
          const vram = Number(dedicated.AdapterRAM) || 0;
          const isNvidia = /nvidia|geforce|rtx|gtx/i.test(dedicated.Name);
          const isAmd = /radeon|amd|rx/i.test(dedicated.Name);
          const isIntel = /intel/i.test(dedicated.Name);

          gpuInfo = {
            detected: true,
            name: dedicated.Name.trim(),
            vendor: isNvidia ? 'NVIDIA' : isAmd ? 'AMD' : isIntel ? 'Intel' : 'Other',
            vramMB: Math.round(vram / (1024 * 1024)),
            vramGB: Math.round((vram / (1024 ** 3)) * 10) / 10,
            hasCuda: isNvidia,
            hasVulkan: true,
            acceleration: isNvidia ? 'NVIDIA CUDA Acceleration' : isAmd ? 'AMD ROCm / Vulkan' : 'Intel Graphics / Vulkan',
          };
        }
      }
    } catch (e) {
      // Keep fallback
    }

    // Check for nvidia-smi if NVIDIA
    if (gpuInfo.hasCuda) {
      try {
        const { stdout: smiOut } = await execAsync('nvidia-smi --query-gpu=memory.total,memory.free --format=csv,noheader,nounits');
        const [totalM, freeM] = smiOut.trim().split(',').map(s => Number(s.trim()));
        if (totalM) {
          gpuInfo.vramMB = totalM;
          gpuInfo.vramGB = Math.round((totalM / 1024) * 10) / 10;
        }
      } catch (e) {
        // nvidia-smi not in path
      }
    }
  }

  // Generate a persistent host fingerprint based on hardware specs
  const rawFingerprint = `${os.hostname()}-${cpuModel}-${totalRamGB}-${gpuInfo.name}`;
  const hostId = crypto.createHash('sha256').update(rawFingerprint).digest('hex').substring(0, 12);

  // Performance profile determination
  let performanceProfile = 'Balanced';
  let recommendedThreads = Math.max(1, physicalCores - 1);
  let recommendedGpuLayers = 0;
  let recommendedContext = 4096;

  if (totalRamGB < 8) {
    performanceProfile = 'Low Memory';
    recommendedContext = 2048;
    recommendedThreads = Math.max(1, physicalCores);
  } else if (totalRamGB >= 16) {
    if (gpuInfo.vramGB >= 6) {
      performanceProfile = 'High Performance';
      recommendedGpuLayers = 33;
      recommendedContext = 8192;
    } else {
      performanceProfile = 'Balanced';
      recommendedContext = 4096;
    }
  }

  const hardware = {
    hostId,
    hostname: os.hostname(),
    os: {
      platform: os.platform(),
      type: os.type(),
      release: os.release(),
      arch: os.arch(),
      distro: isWindows ? 'Windows 11/10' : `${os.type()} ${os.arch()}`,
    },
    cpu: {
      model: cpuModel,
      physicalCores,
      logicalThreads: cpuThreads,
      recommendedThreads,
    },
    ram: {
      totalBytes: totalRamBytes,
      freeBytes: freeRamBytes,
      totalGB: totalRamGB,
      freeGB: freeRamGB,
    },
    gpu: gpuInfo,
    performanceProfile,
    recommendedConfig: {
      threads: recommendedThreads,
      gpuLayers: recommendedGpuLayers,
      contextSize: recommendedContext,
      batchSize: 512,
    },
  };

  cachedHardwareInfo = hardware;
  return hardware;
}

/**
 * Calculates a model's compatibility with the current host hardware
 */
export function evaluateModelCompatibility(modelSizeGB, hardware) {
  const totalRam = hardware.ram.totalGB;
  const freeRam = hardware.ram.freeGB;
  const vram = hardware.gpu.vramGB;

  // Estimated memory requirement = Model file size * 1.25 + 0.8GB (runtime/context buffer)
  const estimatedRamReq = Math.round((modelSizeGB * 1.25 + 0.8) * 10) / 10;

  if (totalRam >= estimatedRamReq + 2) {
    return {
      status: 'RECOMMENDED',
      label: 'Recommended',
      badge: '⭐ Recommended',
      color: 'emerald',
      score: 95,
      canRun: true,
      reason: `System has ${totalRam} GB RAM, which comfortably fits the ~${estimatedRamReq} GB required.`,
      accelerationAdvice: vram >= modelSizeGB ? 'Can fit completely in GPU VRAM for maximum speed!' : 'Will run smoothly on CPU/RAM.',
    };
  }

  if (totalRam >= estimatedRamReq) {
    return {
      status: 'COMPATIBLE',
      label: 'Compatible',
      badge: '✓ Good',
      color: 'blue',
      score: 75,
      canRun: true,
      reason: `Fits within total RAM (${totalRam} GB). Memory headroom will be tight (~${Math.round((totalRam - estimatedRamReq) * 10) / 10} GB free).`,
      accelerationAdvice: 'Recommended to close heavy browser tabs or background apps before running.',
    };
  }

  if (totalRam >= modelSizeGB * 0.9) {
    return {
      status: 'WARNING',
      label: 'Heavy / May be slow',
      badge: '⚠ Heavy',
      color: 'amber',
      score: 45,
      canRun: true,
      reason: `Model requires ~${estimatedRamReq} GB, but system has only ${totalRam} GB RAM. Will rely on pagefile/swap and run slowly.`,
      accelerationAdvice: 'Try a smaller quantization (e.g. Q4_K_S or Q3) or a smaller parameter model (e.g. 1B - 3B).',
    };
  }

  return {
    status: 'UNSUPPORTED',
    label: 'Not Recommended',
    badge: '✕ Incompatible',
    color: 'rose',
    score: 15,
    canRun: false,
    reason: `Requires ~${estimatedRamReq} GB memory, but only ${totalRam} GB is installed. May crash due to Out of Memory (OOM).`,
    accelerationAdvice: 'Please select a model under 4 GB for your system.',
  };
}
