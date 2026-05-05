import GUI from 'lil-gui'
import { parseFont } from './ttf/parser.ts'
import { render } from './renderer.ts'
import { state } from './state.ts'

const canvas = document.getElementById('render') as HTMLCanvasElement

async function init(): Promise<void> {
  const response = await fetch('/fonts/sample.ttf')
  if (!response.ok) {
    document.body.innerHTML =
      '<p style="font-family:monospace;padding:20px">Drop a .ttf file into <code>fonts/sample.ttf</code> and reload.</p>'
    return
  }

  const buffer = await response.arrayBuffer()
  const font = parseFont(buffer)

  const gui = new GUI()
  gui.add(state, 'fontSize', 8, 128, 1).name('Font size').onChange(() => render(canvas, font))
  gui.add(state, 'glyphIndex', 0, font.maxp.numGlyphs - 1, 1).name('Glyph index').onChange(() => render(canvas, font))
  gui.add(state, 'antialias').name('Antialias').onChange(() => render(canvas, font))

  render(canvas, font)
}

init().catch(console.error)
