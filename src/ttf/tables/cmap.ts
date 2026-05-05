export function parseCmap(view: DataView, offset: number): (charCode: number) => number {
  const numTables = view.getUint16(offset + 2, false);

  for (let i = 0; i < numTables; i++) {
    const platformId = view.getUint16(offset + 4 + i * 8, false);
    const encodingId = view.getUint16(offset + 4 + i * 8 + 2, false);
    const subtableOffset = offset + view.getUint32(offset + 4 + i * 8 + 4, false);
    const format = view.getUint16(subtableOffset, false);

    // Prefer platform 3 (Windows) encoding 1 (Unicode BMP) format 4
    if (platformId === 3 && encodingId === 1 && format === 4) {
      return buildFormat4Lookup(view, subtableOffset);
    }
  }

  // Fallback: first format 4 subtable found
  for (let i = 0; i < numTables; i++) {
    const subtableOffset = offset + view.getUint32(offset + 4 + i * 8 + 4, false);
    if (view.getUint16(subtableOffset, false) === 4) {
      return buildFormat4Lookup(view, subtableOffset);
    }
  }

  return () => 0;
}

function buildFormat4Lookup(view: DataView, offset: number): (charCode: number) => number {
  const segCount = view.getUint16(offset + 6, false) / 2;
  const endCountOffset = offset + 14;
  const startCountOffset = endCountOffset + segCount * 2 + 2;
  const idDeltaOffset = startCountOffset + segCount * 2;
  const idRangeOffsetBase = idDeltaOffset + segCount * 2;

  return (charCode: number): number => {
    for (let i = 0; i < segCount; i++) {
      const endCount = view.getUint16(endCountOffset + i * 2, false);
      if (charCode > endCount) continue;

      const startCount = view.getUint16(startCountOffset + i * 2, false);
      if (charCode < startCount) return 0;

      const idRangeOffset = view.getUint16(idRangeOffsetBase + i * 2, false);
      if (idRangeOffset === 0) {
        const delta = view.getInt16(idDeltaOffset + i * 2, false);
        return (charCode + delta) & 0xffff;
      }

      const glyphIndexOffset =
        idRangeOffsetBase + i * 2 + idRangeOffset + (charCode - startCount) * 2;
      return view.getUint16(glyphIndexOffset, false);
    }
    return 0;
  };
}
