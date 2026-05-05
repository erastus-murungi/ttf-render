export interface HmtxTable {
  advanceWidth: (glyphId: number) => number;
  lsb: (glyphId: number) => number;
}

export function parseHmtx(
  view: DataView,
  offset: number,
  _numGlyphs: number,
  numberOfHMetrics: number,
): HmtxTable {
  return {
    advanceWidth: (glyphId: number) => {
      const idx = Math.min(glyphId, numberOfHMetrics - 1);
      return view.getUint16(offset + idx * 4, false);
    },
    lsb: (glyphId: number) => {
      if (glyphId < numberOfHMetrics) {
        return view.getInt16(offset + glyphId * 4 + 2, false);
      }
      const lsbOffset = offset + numberOfHMetrics * 4 + (glyphId - numberOfHMetrics) * 2;
      return view.getInt16(lsbOffset, false);
    },
  };
}
