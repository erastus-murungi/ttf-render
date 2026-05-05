import GUI from "lil-gui";
import { renderHexDump } from "./hexdump.ts";
import { render } from "./renderer.ts";
import { state } from "./state.ts";
import type { Font } from "./ttf/parser.ts";

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

  const canvas = document.getElementById("render") as HTMLCanvasElement;

  let dumpEl: HTMLElement | null = null;
  const controls = {
    showHexDump: false,
  };

  const style = document.createElement("style");
  style.textContent = `
    .lil-gui {
      --background-color: #181825;
      --text-color: #cdd6f4;
      --title-background-color: #11111b;
      --title-text-color: #89b4fa;
      --widget-color: #313244;
      --hover-color: #45475a;
      --focus-color: #585b70;
      --number-color: #89dceb;
      --string-color: #a6e3a1;
      --font-family: monospace;
      --font-size: 14px;
      --input-font-size: 14px;
      --border-radius: 6px;
      --widget-border-radius: 4px;
    }
  `;
  document.head.appendChild(style);

  const gui = new GUI({ title: "ttf-renderer" });
  gui.add(state, "fontSize", 8, 128, 1).name("Font size");
  gui.add(state, "glyphIndex", 0, 255, 1).name("Glyph index");
  gui.add(state, "antialias").name("Antialias");
  gui
    .add(controls, "showHexDump")
    .name("Hex dump")
    .onChange((value: boolean) => {
      if (value) {
        dumpEl = renderHexDump(bytes);
        document.body.appendChild(dumpEl);
      } else {
        dumpEl?.remove();
        dumpEl = null;
      }
    });

  const font = null as unknown as Font;
  render(canvas, font);

  document.body.innerHTML = "";
  document.body.appendChild(canvas);
}

init().catch(console.error);
