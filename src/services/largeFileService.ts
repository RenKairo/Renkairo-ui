export interface FileProbeResult {
  size: number;
  isBinary: boolean;
  tier: 'small' | 'medium' | 'large' | 'huge';
  mimeType?: string;
  previewHeader?: string;
}

export interface StreamProgress {
  bytesLoaded: number;
  totalBytes: number;
  percent: number;
}

// Format bytes into readable human format (KB, MB, GB)
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Known binary extensions
const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'ico', 'svgz',
  'exe', 'dll', 'so', 'dylib', 'bin', 'iso', 'img',
  'zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'xz',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac',
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'wasm', 'pyc', 'class', 'db', 'sqlite', 'sqlite3', 'parquet', 'arrow'
]);

/**
 * 1. O(1) Fast Header & Entropy Probe
 * Reads only the first 4096 bytes to determine binary vs text,
 * avoiding O(N) allocation of binary or un-parseable data.
 */
export async function probeFileHeader(file: File | Blob, fileName?: string): Promise<FileProbeResult> {
  const size = file.size;

  // Check extension first
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && BINARY_EXTENSIONS.has(ext)) {
      return {
        size,
        isBinary: true,
        tier: getTierFromSize(size),
        mimeType: file.type
      };
    }
  }

  // Sample the first 4KB (O(1) Memory & Time)
  const sampleSize = Math.min(size, 4096);
  if (sampleSize === 0) {
    return { size: 0, isBinary: false, tier: 'small' };
  }

  try {
    const slice = file.slice(0, sampleSize);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let nullCount = 0;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0x00) {
        nullCount++;
        // If null byte is found in first 4KB, it is a binary file
        if (nullCount >= 1) {
          return {
            size,
            isBinary: true,
            tier: getTierFromSize(size),
            mimeType: file.type
          };
        }
      }
    }

    return {
      size,
      isBinary: false,
      tier: getTierFromSize(size),
      mimeType: file.type
    };
  } catch (e) {
    return {
      size,
      isBinary: false,
      tier: getTierFromSize(size),
      mimeType: file.type
    };
  }
}

export function getTierFromSize(size: number): 'small' | 'medium' | 'large' | 'huge' {
  if (size >= 100 * 1024 * 1024) return 'huge';    // >= 100 MB
  if (size >= 20 * 1024 * 1024) return 'large';     // >= 20 MB
  if (size >= 2 * 1024 * 1024) return 'medium';     // >= 2 MB
  return 'small';                                   // < 2 MB
}

/**
 * 2. Non-Blocking Chunked Stream Ingestion (256KB Chunks)
 * Uses Web Streams & TextDecoder with yield to the event loop,
 * preventing UI thread freezes and V8 memory heap thrashing.
 */
export async function readTextStreamWithProgress(
  file: File | Blob,
  onProgress?: (progress: StreamProgress) => void,
  maxBytesToRead?: number
): Promise<{ text: string; truncated: boolean }> {
  const totalSize = file.size;
  const bytesToRead = maxBytesToRead ? Math.min(totalSize, maxBytesToRead) : totalSize;
  const isTruncated = bytesToRead < totalSize;

  const targetBlob = bytesToRead === totalSize ? file : file.slice(0, bytesToRead);
  
  // Fast path for small files (< 1MB): direct text conversion
  if (bytesToRead < 1024 * 1024) {
    const text = await targetBlob.text();
    if (onProgress) {
      onProgress({ bytesLoaded: totalSize, totalBytes: totalSize, percent: 100 });
    }
    return { text, truncated: isTruncated };
  }

  // Stream chunking path for >= 1MB
  const stream = (targetBlob as any).stream ? targetBlob.stream() : null;
  if (!stream) {
    // Fallback if ReadableStream is unsupported
    const text = await targetBlob.text();
    return { text, truncated: isTruncated };
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
  const chunks: string[] = [];
  let bytesLoaded = 0;
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesLoaded += value.byteLength;
    chunks.push(decoder.decode(value, { stream: true }));
    chunkCount++;

    // Yield every 2 chunks (~512KB) to keep UI running at 60 FPS
    if (chunkCount % 2 === 0) {
      if (onProgress) {
        onProgress({
          bytesLoaded,
          totalBytes: totalSize,
          percent: Math.min(100, Math.round((bytesLoaded / totalSize) * 100))
        });
      }
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // Flush remaining decoder state
  chunks.push(decoder.decode());

  if (onProgress) {
    onProgress({
      bytesLoaded: totalSize,
      totalBytes: totalSize,
      percent: 100
    });
  }

  return { text: chunks.join(''), truncated: isTruncated };
}

/**
 * 3. Monaco Dynamic Optimization Matrix
 * Automatically adjusts editor capabilities according to file size tier.
 */
export function getMonacoOptionsForTier(tier: 'small' | 'medium' | 'large' | 'huge' = 'small') {
  const baseOptions = {
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    automaticLayout: true,
    tabSize: 4,
    lineNumbers: 'on' as const,
    glyphMargin: false,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    cursorBlinking: 'smooth' as const,
    cursorSmoothCaretAnimation: 'on' as const,
    padding: { top: 12 },
    scrollBeyondLastLine: false
  };

  switch (tier) {
    case 'huge': // >= 100 MB
      return {
        ...baseOptions,
        minimap: { enabled: false },
        folding: false,
        wordWrap: 'off' as const,
        renderWhitespace: 'none' as const,
        renderLineHighlight: 'none' as const,
        bracketPairColorization: { enabled: false },
        guides: { bracketPairs: false, indentation: false },
        matchBrackets: 'never' as const,
        occurrencesHighlight: 'off' as const,
        selectionHighlight: false,
        maxTokenizationLineLength: 2000,
        stopRenderingLineAfter: 2000,
        largeFileOptimizations: true
      };

    case 'large': // 20 MB - 100 MB
      return {
        ...baseOptions,
        minimap: { enabled: false },
        folding: false,
        wordWrap: 'off' as const,
        renderWhitespace: 'none' as const,
        renderLineHighlight: 'none' as const,
        bracketPairColorization: { enabled: false },
        guides: { bracketPairs: false, indentation: false },
        matchBrackets: 'never' as const,
        occurrencesHighlight: 'off' as const,
        selectionHighlight: false,
        maxTokenizationLineLength: 5000,
        stopRenderingLineAfter: 5000,
        largeFileOptimizations: true
      };

    case 'medium': // 2 MB - 20 MB
      return {
        ...baseOptions,
        minimap: { enabled: false },
        folding: false,
        wordWrap: 'off' as const,
        bracketPairColorization: { enabled: false },
        renderLineHighlight: 'line' as const,
        maxTokenizationLineLength: 10000,
        largeFileOptimizations: true
      };

    case 'small': // < 2 MB
    default:
      return {
        ...baseOptions,
        minimap: { enabled: true },
        folding: true,
        wordWrap: 'off' as const,
        renderLineHighlight: 'line' as const,
        bracketPairColorization: { enabled: true },
        largeFileOptimizations: true
      };
  }
}
