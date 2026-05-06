/**
 * Step-by-step TTF parse walkthrough for debugger use.
 * Set breakpoints on any step below, then run `bun run debug:parse`.
 *
 * Each stage assigns its result to a named variable so the debugger
 * shows the parsed value in the locals panel before moving on.
 */

import { readFileSync } from "node:fs";
import { parseHead } from "../src/ttf/tables/head.ts";
import { parseMaxp } from "../src/ttf/tables/maxp.ts";
import { parseLoca } from "../src/ttf/tables/loca.ts";
import { parseCmap } from "../src/ttf/tables/cmap.ts";
import { parseHmtx } from "../src/ttf/tables/hmtx.ts";
import { parseGlyf } from "../src/ttf/tables/glyf.ts";

// ─── Load ────────────────────────────────────────────────────────────────────

const raw = readFileSync("fonts/Andale_Mono.ttf");
const buffer: ArrayBuffer = raw.buffer.slice(
  raw.byteOffset,
  raw.byteOffset + raw.byteLength,
);
const view = new DataView(buffer);
