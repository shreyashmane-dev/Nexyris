import fs from 'node:fs';

const GGUF_MAGIC = 0x46554747; // "GGUF" in little-endian uint32

/**
 * Validates and inspects a GGUF file header
 */
export async function parseGgufHeader(filePath) {
  let fd = null;
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'File does not exist' };
    }

    const stats = fs.statSync(filePath);
    if (stats.size < 24) {
      return { valid: false, error: 'File is too small to be a valid GGUF model (< 24 bytes)' };
    }

    // Read the first 4096 bytes for header and initial metadata
    const buffer = Buffer.alloc(Math.min(4096, stats.size));
    fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, buffer.length, 0);

    const magic = buffer.readUInt32LE(0);
    if (magic !== GGUF_MAGIC) {
      return {
        valid: false,
        error: `Invalid GGUF header magic. Expected 'GGUF' (0x46554747), got 0x${magic.toString(16)}`,
      };
    }

    const version = buffer.readUInt32LE(4);
    if (version < 1 || version > 5) {
      return {
        valid: false,
        error: `Unsupported GGUF version ${version}`,
      };
    }

    const tensorCount = Number(buffer.readBigUInt64LE(8));
    const metadataKvCount = Number(buffer.readBigUInt64LE(16));

    // Try to extract basic strings (architecture, context length) if present in buffer
    let detectedArch = 'Unknown';
    const textSnippet = buffer.toString('utf-8', 24);
    
    if (textSnippet.includes('qwen2') || textSnippet.includes('qwen')) {
      detectedArch = 'Qwen';
    } else if (textSnippet.includes('llama')) {
      detectedArch = 'Llama';
    } else if (textSnippet.includes('mistral')) {
      detectedArch = 'Mistral';
    } else if (textSnippet.includes('phi3') || textSnippet.includes('phi')) {
      detectedArch = 'Phi';
    } else if (textSnippet.includes('deepseek')) {
      detectedArch = 'DeepSeek';
    } else if (textSnippet.includes('gemma')) {
      detectedArch = 'Gemma';
    } else if (textSnippet.includes('smollm')) {
      detectedArch = 'SmolLM';
    }

    // Extract quantization tag from filename if present
    const fileName = filePath.split(/[/\\]/).pop();
    let quantization = 'Unknown';
    const qMatch = fileName.match(/(q\d_[a-z0-9_]+|bf16|f16|f32)/i);
    if (qMatch) {
      quantization = qMatch[1].toUpperCase();
    }

    return {
      valid: true,
      version,
      tensorCount,
      metadataKvCount,
      architecture: detectedArch,
      quantization,
      fileSizeBytes: stats.size,
      fileSizeGB: Math.round((stats.size / (1024 ** 3)) * 100) / 100,
    };
  } catch (err) {
    return {
      valid: false,
      error: `Error reading GGUF header: ${err.message}`,
    };
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (e) {}
    }
  }
}
