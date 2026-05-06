import { uint32ToTag } from "../../utils/string";

type Tag = string; // 4-character identifier

export interface TableRecord {
  offset: number;
  length: number;
}
export interface TableDirectory {
  scalerType: number;
  numTables: number;
  searchRange: number;
  entrySelector: number;
  rangeShift: number;
  tables: Map<Tag, TableRecord>;
}

export function parseTableDirectory(view: DataView): TableDirectory {
  const scalerType = view.getUint32(0, false);
  const numTables = view.getUint16(4, false);
  const searchRange = view.getUint16(6, false);
  const entrySelector = view.getUint16(8, false);
  const rangeShift = view.getUint16(10, false);

  const tables = new Map<Tag, TableRecord>();
  for (let i = 0; i < numTables; i++) {
    const tag = uint32ToTag(view.getUint32(12 + i * 16, false));
    const offset = view.getUint32(12 + i * 16 + 8, false);
    const length = view.getUint32(12 + i * 16 + 12, false);
    tables.set(tag, { offset, length });
  }
  return { scalerType, numTables, searchRange, entrySelector, rangeShift, tables };
}
