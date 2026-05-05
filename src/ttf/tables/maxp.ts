export interface MaxpTable {
  numGlyphs: number;
}

export function parseMaxp(view: DataView, offset: number): MaxpTable {
  return {
    numGlyphs: view.getUint16(offset + 4, false),
  };
}
