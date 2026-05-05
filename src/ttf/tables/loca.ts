export function parseLoca(
  view: DataView,
  offset: number,
  numGlyphs: number,
  indexToLocFormat: number,
): number[] {
  const offsets: number[] = [];
  for (let i = 0; i <= numGlyphs; i++) {
    if (indexToLocFormat === 0) {
      // short format: values are half the actual offset
      offsets.push(view.getUint16(offset + i * 2, false) * 2);
    } else {
      offsets.push(view.getUint32(offset + i * 4, false));
    }
  }
  return offsets;
}
