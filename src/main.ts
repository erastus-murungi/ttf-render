async function init(): Promise<void> {
  const response = await fetch("/fonts/Andle_Mono.ttf");
  if (!response.ok) {
    document.body.innerHTML =
      '<p style="font-family:monospace;padding:20px">Drop a .ttf file into <code>fonts/Andle_Mono.ttf</code> and reload.</p>';
    return;
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  document.body.style.cssText =
    "margin:0;background:#1e1e2e;color:#cdd6f4;font-family:monospace;font-size:12px;line-height:1.6;overflow:auto";

  const pre = document.createElement("pre");
  pre.style.cssText = "padding:20px;margin:0";

  // header row
  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;gap:16px;padding:0 0 6px 0;margin-bottom:4px;border-bottom:1px solid #313244;color:#6c7086;user-select:none";

  const hOffset = document.createElement("span");
  hOffset.style.cssText = "min-width:72px";
  hOffset.textContent = "offset";

  const hHex = document.createElement("span");
  hHex.style.cssText = "min-width:380px";
  // column index labels 00–0f aligned to each byte cell (2 chars + 6px gap)
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

    // offset
    const offsetEl = document.createElement("span");
    offsetEl.style.cssText = "color:#6c7086;min-width:72px";
    offsetEl.textContent = i.toString(16).padStart(8, "0");

    // hex bytes — dim zeros, highlight non-zero
    const hexEl = document.createElement("span");
    hexEl.style.cssText =
      "display:flex;gap:6px;min-width:380px;flex-wrap:nowrap";
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

    // binary — color each bit
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

  document.body.innerHTML = "";
  document.body.appendChild(pre);
}

init().catch(console.error);
