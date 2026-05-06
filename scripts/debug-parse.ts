/**
 * Step-by-step TTF parse walkthrough for debugger use.
 * Set breakpoints on any step below, then run `bun run debug:parse`.
 *
 * Each stage assigns its result to a named variable so the debugger
 * shows the parsed value in the locals panel before moving on.
 */

import { readFileSync } from "node:fs";
import util from "node:util";
import { parseTableDirectory } from "../src/ttf/tables/offset.ts";
import { parseHead } from "../src/ttf/tables/head.ts";
import { parseMaxp } from "../src/ttf/tables/maxp.ts";
import { parseLoca } from "../src/ttf/tables/loca.ts";
import { parseCmap } from "../src/ttf/tables/cmap.ts";
import { parseHmtx } from "../src/ttf/tables/hmtx.ts";
import { parseGlyf } from "../src/ttf/tables/glyf.ts";

const inspect = (label: string, value: unknown) =>
  console.log(`\n── ${label} ${"─".repeat(Math.max(0, 60 - label.length))}\n` +
    util.inspect(value, { depth: 4, colors: true }));

const raw = readFileSync("public/fonts/Andale_Mono.ttf");
const buffer: ArrayBuffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
const view = new DataView(buffer);

const dir = parseTableDirectory(view);

const require = (tag: string) => {
  const rec = dir.tables.get(tag);
  if (!rec) throw new Error(`Missing required table: ${tag}`);
  return rec;
};

inspect("table directory", {
  scalerType: `0x${dir.scalerType.toString(16).padStart(8, "0")}`,
  numTables: dir.numTables,
  tables: [...dir.tables.keys()].join(", "),
});

const headRec = require("head");
const head = parseHead(view, headRec.offset);

inspect("head", head);

const maxpRec = require("maxp");
const maxp = parseMaxp(view, maxpRec.offset);

inspect("maxp", maxp);


const hheaRec = require("hhea");
const hhea = {
  ascender:          view.getInt16(hheaRec.offset + 4,  false),
  descender:         view.getInt16(hheaRec.offset + 6,  false),
  lineGap:           view.getInt16(hheaRec.offset + 8,  false),
  advanceWidthMax:   view.getUint16(hheaRec.offset + 10, false),
  numberOfHMetrics:  view.getUint16(hheaRec.offset + 34, false),
};

inspect("hhea", hhea);

const locaRec = require("loca");
const locaOffsets = parseLoca(view, locaRec.offset, maxp.numGlyphs, head.indexToLocFormat);

inspect("loca (first 10 offsets)", locaOffsets.slice(0, 10));

const cmapRec = require("cmap");
const charToGlyphId = parseCmap(view, cmapRec.offset);

const sampleChars = "ABCabc012".split("").map((ch) => ({
  char: ch,
  codepoint: `U+${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}`,
  glyphId: charToGlyphId(ch.charCodeAt(0)),
}));

inspect("cmap (sample)", sampleChars);


const hmtxRec = require("hmtx");
const hmtx = parseHmtx(view, hmtxRec.offset, maxp.numGlyphs, hhea.numberOfHMetrics);

const glyphIdA = charToGlyphId(65); // 'A'
inspect("hmtx (glyph 'A')", {
  glyphId: glyphIdA,
  advanceWidth: hmtx.advanceWidth(glyphIdA),
  lsb: hmtx.lsb(glyphIdA),
});


const glyfRec = require("glyf");

const glyphA = (() => {
  const off = locaOffsets[glyphIdA];
  const next = locaOffsets[glyphIdA + 1];
  if (off === next) return null; // empty glyph
  return parseGlyf(view, glyfRec.offset + off);
})();

inspect("glyf ('A')", glyphA);
