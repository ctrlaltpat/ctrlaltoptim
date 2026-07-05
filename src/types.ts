/** Supported output image formats */
export type OutputFormat = 'webp' | 'jpeg' | 'png';

/** All image MIME types accepted by the application */
export type SupportedMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

/** Metadata extracted from an uploaded image file */
export interface ImageMetadata {
  filename: string;
  originalWidth: number;
  originalHeight: number;
  originalSize: number; // bytes
  mimeType: SupportedMimeType;
}

/** Represents one uploaded image queued for processing */
export interface ImageFile {
  id: string;
  file: File;
  thumbnail: string; // data URL for preview
  metadata: ImageMetadata;
}

/** One resize target used in the output pipeline */
export interface ResizeTarget {
  label: string;
  maxWidth: number;
  enabled: boolean;
}

/** User-adjustable processing settings – persisted to localStorage */
export interface ProcessingSettings {
  quality: number;
  outputFormat: OutputFormat;
  resizeTargets: ResizeTarget[];
  includeOriginalSize: boolean;
}

/** The result of processing one size variant of one source image */
export interface ProcessedImage {
  id: string;
  sourceId: string;    // links back to ImageFile.id
  variant: string;     // human-readable label, e.g. "Large (1920px)"
  blob: Blob;
  width: number;
  height: number;
  format: OutputFormat;
  size: number;        // bytes
  timeMs: number;      // processing duration
}

/** Aggregate stats shown in the dashboard */
export interface ProcessingStats {
  totalImages: number;
  originalTotalSize: number;
  optimizedTotalSize: number;
  totalTimeMs: number;
}

/** Keys used for localStorage persistence */
export const STORAGE_KEYS = {
  QUALITY: 'imgopt-quality',
  FORMAT: 'imgopt-format',
  INCLUDE_ORIGINAL: 'imgopt-include-original',
} as const;