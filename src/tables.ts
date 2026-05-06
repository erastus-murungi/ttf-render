import { renderHexDump } from "./hexdump.ts";
import { parseHead } from "./ttf/tables/head.ts";
import { parseMaxp } from "./ttf/tables/maxp.ts";
import { parseLoca } from "./ttf/tables/loca.ts";
import { parseCmap } from "./ttf/tables/cmap.ts";
import { parseHmtx } from "./ttf/tables/hmtx.ts";
import { parseGlyf } from "./ttf/tables/glyf.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableRecord {
  tag: string;
  checksum: number;
  offset: number;
  length: number;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CSS = `
  :root {
    --bg: #1e1e2e; --bg2: #181825; --bg3: #11111b;
    --surface: #313244; --surface2: #45475a;
    --text: #cdd6f4; --subtext: #6c7086;
    --blue: #89b4fa; --purple: #cba6f7; --green: #a6e3a1;
    --cyan: #89dceb; --orange: #fab387; --red: #f38ba8;
    --border: #313244;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { display: flex; flex-direction: column; height: 100vh; background: var(--bg); color: var(--text); font-family: monospace; font-size: 13px; }

  #layout { display: flex; flex: 1; overflow: hidden; }

  /* sidebar */
  #sidebar { width: 220px; flex-shrink: 0; background: var(--bg2); border-right: 1px solid var(--border); overflow-y: auto; display: flex; flex-direction: column; }
  #sidebar-header { padding: 14px 16px 10px; color: var(--subtext); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .table-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; cursor: pointer; border-bottom: 1px solid #1e1e2e22; }
  .table-row:hover { background: var(--surface); }
  .table-row.active { background: var(--surface); border-left: 2px solid var(--blue); padding-left: 14px; }
  .table-tag { color: var(--blue); font-weight: bold; }
  .table-size { color: var(--subtext); font-size: 11px; }

  /* main */
  #main { flex: 1; overflow-y: auto; padding: 28px 32px; }
  h2 { font-size: 18px; color: var(--blue); margin-bottom: 6px; }
  .table-meta { color: var(--subtext); font-size: 11px; margin-bottom: 24px; }

  /* field grid */
  .field-grid { display: grid; grid-template-columns: 200px 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; margin-bottom: 24px; }
  .field-key { background: var(--bg2); padding: 9px 14px; color: var(--subtext); }
  .field-val { background: var(--bg); padding: 9px 14px; color: var(--cyan); }

  /* data table */
  .data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .data-table th { text-align: left; padding: 7px 12px; color: var(--subtext); font-size: 11px; border-bottom: 1px solid var(--border); }
  .data-table td { padding: 6px 12px; border-bottom: 1px solid #31324422; }
  .data-table tr:hover td { background: var(--surface); }
  .num { color: var(--cyan); }
  .glyph-char { color: var(--green); }
  .dim { color: var(--subtext); }
  .show-all { background: none; border: 1px solid var(--border); color: var(--subtext); padding: 6px 14px; border-radius: 4px; cursor: pointer; font-family: monospace; font-size: 12px; }
  .show-all:hover { border-color: var(--blue); color: var(--blue); }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: var(--surface); color: var(--subtext); }
`;

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
}

// ─── Font loading ─────────────────────────────────────────────────────────────

function readOffsetTable(view: DataView): TableRecord[] {
  const numTables = view.getUint16(4, false);
  const records: TableRecord[] = [];
  for (let i = 0; i < numTables; i++) {
    const base = 12 + i * 16;
    records.push({
      tag: String.fromCharCode(
        view.getUint8(base),
        view.getUint8(base + 1),
        view.getUint8(base + 2),
        view.getUint8(base + 3),
      ),
      checksum: view.getUint32(base + 4, false),
      offset: view.getUint32(base + 8, false),
      length: view.getUint32(base + 12, false),
    });
  }
  return records.sort((a, b) => a.offset - b.offset);
}

// ─── Table renderers ──────────────────────────────────────────────────────────

function field(key: string, value: string | number): HTMLElement {
  const k = document.createElement("div");
  k.className = "field-key";
  k.textContent = key;
  const v = document.createElement("div");
  v.className = "field-val";
  v.textContent = String(value);
  const frag = document.createDocumentFragment();
  frag.appendChild(k);
  frag.appendChild(v);
  return frag as unknown as HTMLElement;
}

function fieldGrid(...pairs: [string, string | number][]): HTMLElement {
  const grid = document.createElement("div");
  grid.className = "field-grid";
  for (const [k, v] of pairs) grid.appendChild(field(k, v));
  return grid;
}

function dataTable(
  headers: string[],
  rows: (string | number)[][],
  cap?: number,
): HTMLElement {
  const wrap = document.createElement("div");
  const table = document.createElement("table");
  table.className = "data-table";

  const thead = document.createElement("thead");
  const hrow = document.createElement("tr");
  for (const h of headers) {
    const th = document.createElement("th");
    th.textContent = h;
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const limit = cap ?? rows.length;
  for (let i = 0; i < Math.min(limit, rows.length); i++) {
    const tr = document.createElement("tr");
    for (const cell of rows[i]) {
      const td = document.createElement("td");
      td.className = typeof cell === "number" ? "num" : "";
      td.textContent = String(cell);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);

  if (cap && rows.length > cap) {
    const btn = document.createElement("button");
    btn.className = "show-all";
    btn.textContent = `Show all ${rows.length} rows`;
    btn.onclick = () => {
      for (let i = limit; i < rows.length; i++) {
        const tr = document.createElement("tr");
        for (const cell of rows[i]) {
          const td = document.createElement("td");
          td.className = typeof cell === "number" ? "num" : "";
          td.textContent = String(cell);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      btn.remove();
    };
    wrap.appendChild(btn);
  }

  return wrap;
}

function renderHead(view: DataView, rec: TableRecord): HTMLElement {
  const head = parseHead(view, rec.offset);
  const el = document.createElement("div");
  el.appendChild(
    fieldGrid(
      ["unitsPerEm", head.unitsPerEm],
      ["indexToLocFormat", head.indexToLocFormat === 0 ? "0 (short offsets)" : "1 (long offsets)"],
    ),
  );
  return el;
}

function renderMaxp(view: DataView, rec: TableRecord): HTMLElement {
  const maxp = parseMaxp(view, rec.offset);
  const el = document.createElement("div");
  el.appendChild(fieldGrid(["numGlyphs", maxp.numGlyphs]));
  return el;
}

function renderHhea(view: DataView, rec: TableRecord): HTMLElement {
  const o = rec.offset;
  const el = document.createElement("div");
  el.appendChild(
    fieldGrid(
      ["ascender", view.getInt16(o + 4, false)],
      ["descender", view.getInt16(o + 6, false)],
      ["lineGap", view.getInt16(o + 8, false)],
      ["advanceWidthMax", view.getUint16(o + 10, false)],
      ["minLeftSideBearing", view.getInt16(o + 12, false)],
      ["minRightSideBearing", view.getInt16(o + 14, false)],
      ["xMaxExtent", view.getInt16(o + 16, false)],
      ["caretSlopeRise", view.getInt16(o + 18, false)],
      ["caretSlopeRun", view.getInt16(o + 20, false)],
      ["numberOfHMetrics", view.getUint16(o + 34, false)],
    ),
  );
  return el;
}

function renderHmtx(
  view: DataView,
  rec: TableRecord,
  numGlyphs: number,
  numberOfHMetrics: number,
): HTMLElement {
  const hmtx = parseHmtx(view, rec.offset, numGlyphs, numberOfHMetrics);
  const rows: (string | number)[][] = [];
  for (let i = 0; i < numGlyphs; i++) {
    rows.push([i, hmtx.advanceWidth(i), hmtx.lsb(i)]);
  }
  return dataTable(["Glyph ID", "Advance Width", "LSB"], rows, 200);
}

function renderCmap(view: DataView, rec: TableRecord): HTMLElement {
  const lookup = parseCmap(view, rec.offset);
  const rows: (string | number)[][] = [];
  for (let cp = 0x20; cp <= 0x7e; cp++) {
    const ch = String.fromCharCode(cp);
    const gid = lookup(cp);
    rows.push([ch, `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`, gid]);
  }
  return dataTable(["Char", "Codepoint", "Glyph ID"], rows);
}

function renderLoca(
  view: DataView,
  rec: TableRecord,
  numGlyphs: number,
  indexToLocFormat: number,
): HTMLElement {
  const offsets = parseLoca(view, rec.offset, numGlyphs, indexToLocFormat);
  const rows: (string | number)[][] = [];
  for (let i = 0; i < numGlyphs; i++) {
    const size = (offsets[i + 1] ?? offsets[i]) - offsets[i];
    rows.push([i, `0x${offsets[i].toString(16).padStart(6, "0")}`, size]);
  }
  return dataTable(["Glyph ID", "Offset", "Size (bytes)"], rows, 200);
}

function renderGlyf(
  view: DataView,
  glyfRec: TableRecord,
  locaOffsets: number[],
  numGlyphs: number,
): HTMLElement {
  const rows: (string | number)[][] = [];
  for (let i = 0; i < numGlyphs; i++) {
    const off = locaOffsets[i];
    const next = locaOffsets[i + 1] ?? off;
    if (off === next) {
      rows.push([i, "—", "—", "—", "—", "—"]);
    } else {
      const g = parseGlyf(view, glyfRec.offset + off);
      if (!g) {
        rows.push([i, "composite", "—", "—", "—", "—"]);
      } else {
        rows.push([i, g.contours.length, g.xMin, g.yMin, g.xMax, g.yMax]);
      }
    }
  }
  return dataTable(["Glyph ID", "Contours", "xMin", "yMin", "xMax", "yMax"], rows, 200);
}

// ─── Main panel builder ───────────────────────────────────────────────────────

function buildMainPanel(
  rec: TableRecord,
  bytes: Uint8Array,
  view: DataView,
  allTables: Map<string, TableRecord>,
): HTMLElement {
  const panel = document.createElement("div");

  const title = document.createElement("h2");
  title.textContent = rec.tag.trim();
  panel.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "table-meta";
  meta.textContent = `offset 0x${rec.offset.toString(16).padStart(6, "0")}  ·  ${rec.length.toLocaleString()} bytes  ·  checksum 0x${rec.checksum.toString(16).padStart(8, "0")}`;
  panel.appendChild(meta);

  const head = allTables.get("head");
  const maxp = allTables.get("maxp");
  const hhea = allTables.get("hhea");
  const numGlyphs = maxp ? parseMaxp(view, maxp.offset).numGlyphs : 0;
  const headData = head ? parseHead(view, head.offset) : null;
  const numberOfHMetrics = hhea ? view.getUint16(hhea.offset + 34, false) : 0;

  let content: HTMLElement | null = null;

  switch (rec.tag.trim()) {
    case "head":
      content = renderHead(view, rec);
      break;
    case "maxp":
      content = renderMaxp(view, rec);
      break;
    case "hhea":
      content = renderHhea(view, rec);
      break;
    case "hmtx":
      content = renderHmtx(view, rec, numGlyphs, numberOfHMetrics);
      break;
    case "cmap":
      content = renderCmap(view, rec);
      break;
    case "loca":
      if (headData) content = renderLoca(view, rec, numGlyphs, headData.indexToLocFormat);
      break;
    case "glyf": {
      const locaRec = allTables.get("loca");
      if (headData && locaRec) {
        const locaOffsets = parseLoca(view, locaRec.offset, numGlyphs, headData.indexToLocFormat);
        content = renderGlyf(view, rec, locaOffsets, numGlyphs);
      }
      break;
    }
  }

  if (content) {
    panel.appendChild(content);
  } else {
    const hexTitle = document.createElement("div");
    hexTitle.style.cssText = "color:var(--subtext);font-size:11px;margin-bottom:12px";
    hexTitle.textContent = "No parser available — showing raw bytes";
    panel.appendChild(hexTitle);
    panel.appendChild(
      renderHexDump(bytes.subarray(rec.offset, rec.offset + rec.length)),
    );
  }

  return panel;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  injectStyles();

  const response = await fetch("/fonts/Andale_Mono.ttf");
  if (!response.ok) {
    document.body.innerHTML =
      '<p style="padding:20px">Font not found at <code>public/fonts/Andale_Mono.ttf</code></p>';
    return;
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const records = readOffsetTable(view);
  const tableMap = new Map(records.map((r) => [r.tag.trim(), r]));

  // layout
  const layout = document.createElement("div");
  layout.id = "layout";

  // sidebar
  const sidebar = document.createElement("div");
  sidebar.id = "sidebar";
  const sidebarHeader = document.createElement("div");
  sidebarHeader.id = "sidebar-header";
  sidebarHeader.textContent = "Tables";
  sidebar.appendChild(sidebarHeader);

  // main panel
  const main = document.createElement("div");
  main.id = "main";

  let activeRow: HTMLElement | null = null;

  function select(rec: TableRecord, row: HTMLElement) {
    activeRow?.classList.remove("active");
    activeRow = row;
    row.classList.add("active");
    main.innerHTML = "";
    main.appendChild(buildMainPanel(rec, bytes, view, tableMap));
  }

  for (const rec of records) {
    const row = document.createElement("div");
    row.className = "table-row";

    const tag = document.createElement("span");
    tag.className = "table-tag";
    tag.textContent = rec.tag.trim();

    const size = document.createElement("span");
    size.className = "table-size";
    size.textContent =
      rec.length >= 1024
        ? `${(rec.length / 1024).toFixed(1)} KB`
        : `${rec.length} B`;

    row.appendChild(tag);
    row.appendChild(size);
    row.addEventListener("click", () => select(rec, row));
    sidebar.appendChild(row);
  }

  layout.appendChild(sidebar);
  layout.appendChild(main);
  document.body.appendChild(layout);

  // select first table by default
  const firstRow = sidebar.querySelector<HTMLElement>(".table-row");
  if (firstRow && records[0]) select(records[0], firstRow);
}

init().catch(console.error);
