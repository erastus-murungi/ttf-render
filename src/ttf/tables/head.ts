export interface HeadTable {
  unitsPerEm: number;
  indexToLocFormat: number; // 0 = short offsets, 1 = long offsets
}

export function parseHead(view: DataView, offset: number): HeadTable {
  return {
    unitsPerEm: view.getUint16(offset + 18, false),
    indexToLocFormat: view.getInt16(offset + 50, false),
  };
}
