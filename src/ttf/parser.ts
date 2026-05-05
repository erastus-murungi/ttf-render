import { parseHead, type HeadTable } from './tables/head.ts'
import { parseMaxp, type MaxpTable } from './tables/maxp.ts'
import { parseLoca } from './tables/loca.ts'
import { parseCmap } from './tables/cmap.ts'
import { parseHmtx, type HmtxTable } from './tables/hmtx.ts'
import { parseGlyf, type Glyph } from './tables/glyf.ts'

export interface Font {
  head: HeadTable
  maxp: MaxpTable
  hmtx: HmtxTable
  charToGlyphId: (charCode: number) => number
  getGlyph: (glyphId: number) => Glyph | null
}

interface TableRecord {
  offset: number
  length: number
}

export function parseFont(buffer: ArrayBuffer): Font {
  const view = new DataView(buffer)

  if (view.byteLength < 12) throw new Error('Not a valid TTF file: buffer too small')

  // TrueType: 0x00010000 or 'true' (0x74727565); CFF/OTF: 'OTTO' (0x4F54544F)
  const sfVersion = view.getUint32(0, false)
  if (sfVersion !== 0x00010000 && sfVersion !== 0x74727565 && sfVersion !== 0x4f54544f) {
    throw new Error('Not a valid TTF/OTF file: unrecognised magic number')
  }

  const tables = readOffsetTable(view)

  const require = (tag: string): TableRecord => {
    const t = tables.get(tag)
    if (!t) throw new Error(`Missing required TTF table: ${tag}`)
    return t
  }

  const head = parseHead(view, require('head').offset)
  const maxp = parseMaxp(view, require('maxp').offset)
  const locaOffsets = parseLoca(view, require('loca').offset, maxp.numGlyphs, head.indexToLocFormat)
  const charToGlyphId = parseCmap(view, require('cmap').offset)

  const hhea = require('hhea')
  const numberOfHMetrics = view.getUint16(hhea.offset + 34, false)
  const hmtx = parseHmtx(view, require('hmtx').offset, maxp.numGlyphs, numberOfHMetrics)

  const glyfRecord = require('glyf')

  return {
    head,
    maxp,
    hmtx,
    charToGlyphId,
    getGlyph: (glyphId: number) => {
      const glyphOffset = locaOffsets[glyphId]
      const nextOffset = locaOffsets[glyphId + 1]
      if (glyphOffset === nextOffset) return null // empty glyph
      return parseGlyf(view, glyfRecord.offset + glyphOffset)
    },
  }
}

function readOffsetTable(view: DataView): Map<string, TableRecord> {
  const numTables = view.getUint16(4, false)
  if (view.byteLength < 12 + numTables * 16)
    throw new Error(`TTF offset table truncated: need ${12 + numTables * 16} bytes, got ${view.byteLength}`)
  const tables = new Map<string, TableRecord>()
  for (let i = 0; i < numTables; i++) {
    const base = 12 + i * 16
    const tag = String.fromCharCode(
      view.getUint8(base),
      view.getUint8(base + 1),
      view.getUint8(base + 2),
      view.getUint8(base + 3),
    )
    tables.set(tag, {
      offset: view.getUint32(base + 8, false),
      length: view.getUint32(base + 12, false),
    })
  }
  return tables
}
