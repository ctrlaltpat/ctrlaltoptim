/**
 * EXIF orientation values mapped to the required canvas rotation / flip
 * transforms needed to display the image correctly.
 *
 * Reference: https://www.impulseadventure.com/photo/exif-orientation.html
 */
interface ExifTransform {
  rotate: number;   // degrees clockwise
  flipX: boolean;
  flipY: boolean;
}

const ORIENTATION_MAP: Record<number, ExifTransform> = {
  1: { rotate: 0,   flipX: false, flipY: false },
  2: { rotate: 0,   flipX: true,  flipY: false },
  3: { rotate: 180, flipX: false, flipY: false },
  4: { rotate: 180, flipX: true,  flipY: false },
  5: { rotate: 90,  flipX: true,  flipY: false },
  6: { rotate: 90,  flipX: false, flipY: false },
  7: { rotate: 270, flipX: true,  flipY: false },
  8: { rotate: 270, flipX: false, flipY: false },
};

/**
 * Attempt to read the EXIF Orientation tag from a JPEG ArrayBuffer.
 * Returns the integer orientation value or 1 (normal) if not found.
 *
 * We only parse enough of the JPEG structure to find the EXIF IFD –
 * this is intentionally minimal to keep the bundle small.
 */
export async function getExifOrientation(buffer: ArrayBuffer, mime: string): Promise<number> {
  // Only JPEG files carry EXIF orientation in practice
  if (mime !== 'image/jpeg' && mime !== 'image/tiff') return 1;

  const view = new DataView(buffer);
  if (view.getUint16(0, false) !== 0xffd8) return 1; // not a valid JPEG

  // Walk JPEG markers looking for APP1 (EXIF)
  let offset = 2;
  while (offset < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xe1) {
      // APP1 – check for "Exif\0\0"
      const exifId = view.getUint32(offset + 4, false);
      if (exifId !== 0x45786966) return 1; // 'Exif'
      return parseExifOrientation(view, offset + 10); // skip TIFF header
    }
    offset += 2 + view.getUint16(offset + 2, false);
  }
  return 1;
}

/** Parse the orientation tag inside an EXIF IFD */
function parseExifOrientation(view: DataView, start: number): number {
  const littleEndian = view.getUint16(start, false) === 0x4949;
  const ifdOffset = view.getUint32(start + 4, littleEndian);
  const ifdStart = start + ifdOffset;

  const entries = view.getUint16(ifdStart, littleEndian);

  for (let i = 0; i < entries; i++) {
    const entryOffset = ifdStart + 2 + i * 12;
    const tag = view.getUint16(entryOffset, littleEndian);

    if (tag === 0x0112) {
      // Orientation tag
      return view.getUint16(entryOffset + 8, littleEndian);
    }
  }

  return 1;
}

/**
 * Return the required transformations for a given EXIF orientation value.
 */
export function getOrientationTransform(orientation: number): ExifTransform {
  return ORIENTATION_MAP[orientation] ?? ORIENTATION_MAP[1];
}

/**
 * Apply EXIF orientation transforms to a canvas context so the
 * image is drawn correctly regardless of camera orientation.
 */
export function applyOrientationToCtx(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  transform: ExifTransform,
  width: number,
  height: number,
): void {
  const { rotate, flipX, flipY } = transform;

  // Move origin to centre, rotate, flip, then move back
  ctx.translate(width / 2, height / 2);
  if (rotate !== 0) {
    ctx.rotate((rotate * Math.PI) / 180);
  }
  if (flipX) ctx.scale(-1, 1);
  if (flipY) ctx.scale(1, -1);
  ctx.translate(-width / 2, -height / 2);
}