import sharp from 'sharp';

/**
 * Gemini Vision Image Optimization Presets
 * - Balanced (Recommended): 1536px max dimension, MozJPEG Q85 with 4:4:4 subsampling.
 *   Maps directly to Gemini's 768x768 tile grid (max 4 tiles / ~1024 tokens) while
 *   preserving 100% of receipt text, small digits, dates, and store logos.
 * - HighRes: 2048px max dimension for dense multi-page/column tables.
 * - Compact: 1024px max dimension for ultra-low bandwidth situations.
 */
export const GEMINI_IMAGE_PRESETS = {
  balanced: {
    maxDimension: 1536,
    quality: 85,
    format: 'jpeg',
    chromaSubsampling: '4:4:4', // Essential for sharp text and receipt numbers without color fringing
  },
  high_res: {
    maxDimension: 2048,
    quality: 90,
    format: 'jpeg',
    chromaSubsampling: '4:4:4',
  },
  compact: {
    maxDimension: 1024,
    quality: 80,
    format: 'webp',
  },
};

/**
 * Converts various image inputs (base64 string, data URL, Buffer) into a standard Node Buffer.
 * @param {string|Buffer} input
 * @returns {Buffer}
 */
export function toImageBuffer(input) {
  if (Buffer.isBuffer(input)) {
    return input;
  }
  if (typeof input === 'string') {
    const cleanBase64 = input.replace(/^data:[^;]+;base64,/, '').trim();
    return Buffer.from(cleanBase64, 'base64');
  }
  throw new Error('Unsupported image input format. Expected base64 string or Buffer.');
}

/**
 * Optimizes high-resolution mobile camera photos and images specifically for Google Gemini Vision.
 *
 * Operations performed:
 * 1. Auto-rotates using EXIF orientation tag (.rotate()) so mobile photos are not sideways/upside-down.
 * 2. Downscales massive camera resolutions (e.g. 4000x3000 -> max 1536px) maintaining aspect ratio.
 * 3. Strips binary EXIF/GPS bloat (saving 2-5MB of metadata).
 * 4. Compresses using MozJPEG (or WebP) with 4:4:4 chroma subsampling for crisp OCR.
 *
 * @param {string|Buffer} imageInput - Base64 string, data URL, or Buffer
 * @param {Object} [options] - Configuration options (preset, maxDimension, quality, format)
 * @returns {Promise<{
 *   data: string,
 *   mimeType: string,
 *   originalSizeBytes: number,
 *   optimizedSizeBytes: number,
 *   width: number,
 *   height: number,
 *   reductionPercent: number
 * }>}
 */
export async function optimizeImageForGemini(imageInput, options = {}) {
  try {
    const presetName = options.preset || 'balanced';
    const preset = GEMINI_IMAGE_PRESETS[presetName] || GEMINI_IMAGE_PRESETS.balanced;

    const maxDimension = options.maxDimension || preset.maxDimension;
    const quality = options.quality || preset.quality;
    const format = options.format || preset.format;

    const inputBuffer = toImageBuffer(imageInput);
    const originalSizeBytes = inputBuffer.length;

    // Build Sharp transformation pipeline
    let pipeline = sharp(inputBuffer, { failOnError: false })
      .rotate() // Automatically orient the image based on EXIF orientation tag
      .resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true, // Don't upscale smaller images
      });

    let mimeType = 'image/jpeg';

    if (format === 'webp') {
      pipeline = pipeline.webp({
        quality,
        effort: 4,
      });
      mimeType = 'image/webp';
    } else {
      // Default: High-fidelity MozJPEG with 4:4:4 chroma subsampling for pin-sharp OCR text
      pipeline = pipeline.jpeg({
        quality,
        mozjpeg: true,
        chromaSubsampling: preset.chromaSubsampling || '4:4:4',
      });
      mimeType = 'image/jpeg';
    }

    const { data: outputBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });
    const optimizedSizeBytes = outputBuffer.length;
    const reductionPercent = originalSizeBytes > 0
      ? Math.max(0, Math.round(((originalSizeBytes - optimizedSizeBytes) / originalSizeBytes) * 100))
      : 0;

    console.log(`[Sharp Image Optimizer] Optimized image for Gemini: ${info.width}x${info.height} | ${(originalSizeBytes / 1024).toFixed(1)} KB -> ${(optimizedSizeBytes / 1024).toFixed(1)} KB (-${reductionPercent}%) [${mimeType}]`);

    return {
      data: outputBuffer.toString('base64'),
      mimeType,
      originalSizeBytes,
      optimizedSizeBytes,
      width: info.width,
      height: info.height,
      reductionPercent,
    };
  } catch (error) {
    console.error('[Sharp Image Optimizer] Warning: Failed to optimize image with sharp, falling back to original:', error);

    // Graceful fallback to original base64
    const cleanBase64 = typeof imageInput === 'string'
      ? imageInput.replace(/^data:[^;]+;base64,/, '').trim()
      : Buffer.isBuffer(imageInput)
        ? imageInput.toString('base64')
        : '';

    return {
      data: cleanBase64,
      mimeType: options.mimeType || 'image/jpeg',
      originalSizeBytes: cleanBase64.length * 0.75,
      optimizedSizeBytes: cleanBase64.length * 0.75,
      width: null,
      height: null,
      reductionPercent: 0,
      fallback: true,
    };
  }
}
