export function renderHexDump(bytes: Uint8Array): HTMLElement {
  const pre = document.createElement("pre");
  pre.style.cssText = "padding:20px;margin:0";

  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;gap:16px;padding:0 0 6px 0;margin-bottom:4px;border-bottom:1px solid #313244;color:#6c7086;user-select:none";

  const hOffset = document.createElement("span");
  hOffset.style.cssText = "min-width:72px";
  hOffset.textContent = "offset";

  const hHex = document.createElement("span");
  hHex.style.cssText = "min-width:380px";
  hHex.textContent = Array.from({ length: 16 }, (_, i) =>
    i.toString(16).padStart(2, "0"),
  ).join(" ");

  const hBin = document.createElement("span");
  hBin.textContent = "binary (msb → lsb per byte)";

  header.appendChild(hOffset);
  header.appendChild(hHex);
  header.appendChild(hBin);
  pre.appendChild(header);

  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.subarray(i, i + 16);

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:16px;padding:1px 0";

    const offsetEl = document.createElement("span");
    offsetEl.style.cssText = "color:#6c7086;min-width:72px";
    offsetEl.textContent = i.toString(16).padStart(8, "0");

    const hexEl = document.createElement("span");
    hexEl.style.cssText = "display:flex;gap:6px;min-width:380px;flex-wrap:nowrap";
    for (let j = 0; j < 16; j++) {
      const byteEl = document.createElement("span");
      if (j < chunk.length) {
        const b = chunk[j];
        byteEl.textContent = b.toString(16).padStart(2, "0");
        byteEl.style.color =
          b === 0
            ? "#45475a"
            : b < 32 || b > 126
              ? "#cba6f7"
              : b < 128
                ? "#89dceb"
                : "#fab387";
      } else {
        byteEl.textContent = "  ";
      }
      hexEl.appendChild(byteEl);
    }

    const binEl = document.createElement("span");
    binEl.style.cssText = "display:flex;gap:8px;color:#585b70";
    for (let j = 0; j < chunk.length; j++) {
      const b = chunk[j];
      const byteSpan = document.createElement("span");
      byteSpan.style.cssText = "display:inline-flex;letter-spacing:1px";
      for (let k = 7; k >= 0; k--) {
        const bitEl = document.createElement("span");
        const bit = (b >> k) & 1;
        bitEl.textContent = String(bit);
        bitEl.style.color = bit ? "#89b4fa" : "#313244";
        byteSpan.appendChild(bitEl);
      }
      binEl.appendChild(byteSpan);
    }

    row.appendChild(offsetEl);
    row.appendChild(hexEl);
    row.appendChild(binEl);
    pre.appendChild(row);
  }

  return pre;
}
