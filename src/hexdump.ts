const ROW_HEIGHT = 20; // px — matches font-size:12px line-height:1.6
const OVERSCAN = 5; // extra rows above/below visible area
const CONTAINER_MAX_HEIGHT = 600; // px

// Precomputed lookup tables — built once, reused for every byte update
const HEX_LUT: string[] = [];
const BIN_LUT: string[] = [];
for (let i = 0; i < 256; i++) {
  HEX_LUT[i] = i.toString(16).padStart(2, "0");
  BIN_LUT[i] = i.toString(2).padStart(8, "0");
}

function byteColor(b: number): string {
  return b === 0 ? "#45475a" : b < 32 || b > 126 ? "#cba6f7" : b < 128 ? "#89dceb" : "#fab387";
}

function createRow(): {
  el: HTMLDivElement;
  binEl: HTMLSpanElement;
  update: (bytes: Uint8Array, offset: number) => void;
} {
  const row = document.createElement("div");
  row.style.cssText = `display:flex;gap:16px;height:${ROW_HEIGHT}px;align-items:center`;

  // offset
  const offsetEl = document.createElement("span");
  offsetEl.style.cssText =
    "color:#6c7086;width:72px;flex-shrink:0;font-variant-numeric:tabular-nums";

  // hex — 16 spans, one per byte
  const hexEl = document.createElement("span");
  hexEl.style.cssText = "display:flex;gap:6px;width:380px;flex-shrink:0;flex-wrap:nowrap";
  const hexSpans: HTMLSpanElement[] = [];
  for (let j = 0; j < 16; j++) {
    const s = document.createElement("span");
    hexEl.appendChild(s);
    hexSpans.push(s);
  }

  // binary — 1 span per byte (was 8), text = "01101010", color = dim/bright per byte value
  const binEl = document.createElement("span");
  binEl.style.cssText = "display:flex;gap:8px;flex-shrink:0;letter-spacing:1px";
  const binSpans: HTMLSpanElement[] = [];
  for (let j = 0; j < 16; j++) {
    const s = document.createElement("span");
    binEl.appendChild(s);
    binSpans.push(s);
  }

  // ascii — 16 spans, one per byte
  const asciiEl = document.createElement("span");
  asciiEl.style.cssText = "display:flex;letter-spacing:2px;flex-shrink:0";
  const asciiSpans: HTMLSpanElement[] = [];
  for (let j = 0; j < 16; j++) {
    const s = document.createElement("span");
    asciiEl.appendChild(s);
    asciiSpans.push(s);
  }

  row.appendChild(offsetEl);
  row.appendChild(hexEl);
  row.appendChild(binEl);
  row.appendChild(asciiEl);

  function update(bytes: Uint8Array, offset: number) {
    offsetEl.textContent = offset.toString(16).padStart(8, "0");

    for (let j = 0; j < 16; j++) {
      const byteOffset = offset + j;
      if (byteOffset < bytes.length) {
        const b = bytes[byteOffset];
        const color = byteColor(b);

        hexSpans[j].textContent = HEX_LUT[b];
        hexSpans[j].style.color = color;

        binSpans[j].textContent = BIN_LUT[b];
        binSpans[j].style.color = b === 0 ? "#313244" : "#89b4fa";

        const printable = b >= 32 && b < 127;
        asciiSpans[j].textContent = printable ? String.fromCharCode(b) : "·";
        asciiSpans[j].style.color = printable ? "#a6e3a1" : "#313244";
      } else {
        hexSpans[j].textContent = "  ";
        hexSpans[j].style.color = "";
        binSpans[j].textContent = "";
        asciiSpans[j].textContent = " ";
      }
    }
  }

  return { el: row, binEl, update };
}

export function renderHexDump(bytes: Uint8Array): HTMLElement {
  const totalRows = Math.ceil(bytes.length / 16);
  const totalContentHeight = totalRows * ROW_HEIGHT;
  const containerHeight = Math.min(totalContentHeight + ROW_HEIGHT, CONTAINER_MAX_HEIGHT);

  const root = document.createElement("div");
  root.style.cssText =
    "font-family:monospace;font-size:12px;line-height:1;background:#1e1e2e;color:#cdd6f4;overflow-x:auto";

  // sticky header
  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;gap:16px;padding:12px 20px 6px;border-bottom:1px solid #313244;" +
    "color:#6c7086;user-select:none;position:sticky;top:0;background:#1e1e2e;z-index:1";
  const hOffset = document.createElement("span");
  hOffset.style.cssText = "width:72px;flex-shrink:0";
  hOffset.textContent = "offset";
  const hHex = document.createElement("span");
  hHex.style.cssText = "width:380px;flex-shrink:0";
  hHex.textContent = Array.from({ length: 16 }, (_, i) => i.toString(16).padStart(2, "0")).join(
    " ",
  );
  const hBin = document.createElement("span");
  hBin.style.cssText = "flex-shrink:0";
  hBin.textContent = "binary (msb → lsb per byte)";
  const hAscii = document.createElement("span");
  hAscii.style.cssText = "flex-shrink:0";
  hAscii.textContent = "ascii";
  header.append(hOffset, hHex, hBin, hAscii);

  // scroll container
  const scroller = document.createElement("div");
  scroller.style.cssText = `height:${containerHeight}px;overflow-y:scroll`;

  // full-height viewport so the scrollbar reflects the whole file
  const viewport = document.createElement("div");
  viewport.style.cssText = `position:relative;height:${totalContentHeight}px;padding:0 20px`;

  // rendered window — only the visible slice, shifted with translateY
  const win = document.createElement("div");
  win.style.cssText = "position:absolute;top:0;left:20px;right:20px;will-change:transform";

  viewport.appendChild(win);
  scroller.appendChild(viewport);
  root.appendChild(header);
  root.appendChild(scroller);

  // pre-allocate pool
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const pool: ReturnType<typeof createRow>[] = [];
  for (let i = 0; i < visibleCount; i++) {
    const r = createRow();
    win.appendChild(r.el);
    pool.push(r);
  }

  let lastFirstRow = -1;
  let rafId = 0;

  function render(scrollTop: number) {
    const firstRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    if (firstRow === lastFirstRow) {
      return;
    }
    lastFirstRow = firstRow;

    win.style.transform = `translateY(${firstRow * ROW_HEIGHT}px)`;

    for (let i = 0; i < pool.length; i++) {
      const rowIndex = firstRow + i;
      if (rowIndex < totalRows) {
        pool[i].el.style.display = "flex";
        pool[i].update(bytes, rowIndex * 16);
      } else {
        pool[i].el.style.display = "none";
      }
    }
  }

  scroller.addEventListener(
    "scroll",
    () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => render(scroller.scrollTop));
    },
    { passive: true },
  );

  render(0);

  // Sync the header binary label width to the actual rendered binary column width.
  // Must run after layout, so we schedule a single rAF.
  requestAnimationFrame(() => {
    const w = pool[0].binEl.offsetWidth;
    if (w > 0) {
      hBin.style.width = `${w}px`;
    }
  });

  return root;
}
