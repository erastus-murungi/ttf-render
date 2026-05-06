import GUI from "lil-gui";

type Point2D = { x: number; y: number };

const pts = {
  p0: { x: 150, y: 450 },
  p1: { x: 400, y: 100 },
  p2: { x: 650, y: 450 },
} as const satisfies Record<string, Point2D>;

const paramaters = {
  granularity: 0.01,
};

const canvas = document.getElementById("curve") as HTMLCanvasElement;
const ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

if (!ctx) {
  throw new Error("Failed to get 2D context");
}

function drawQuadraticBezierCurve({
  ctx,
  start,
  control,
  end,
  granularity,
}: {
  ctx: CanvasRenderingContext2D;
  start: Point2D;
  control: Point2D;
  end: Point2D;
  granularity: number;
}) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (let t = 0; t <= 1; t += granularity) {
    const x = (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x;
    const y = (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y;
    ctx.lineTo(x, y);
  }

  ctx.lineTo(end.x, end.y);

  ctx.strokeStyle = "#cdd6f4";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function resize() {
  const dpr = window.devicePixelRatio ?? 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.scale(dpr, dpr);
  draw();
}

window.addEventListener("resize", resize);

const POINT_RADIUS = 8;
const COLORS = { p0: "#89b4fa", p1: "#cba6f7", p2: "#a6e3a1" };

function draw() {
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const { p0, p1, p2 } = pts;
  const { granularity } = paramaters;

  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = "#45475a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "#cdd6f4";
  ctx.lineWidth = 2;
  // ctx.beginPath();
  // ctx.moveTo(p0.x, p0.y);
  // ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
  drawQuadraticBezierCurve({
    ctx,
    start: p0,
    control: p1,
    end: p2,
    granularity,
  });
  ctx.stroke();

  for (const [key, pt] of Object.entries(pts)) {
    const color = COLORS[key as keyof typeof COLORS];

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#cdd6f4";
    ctx.font = "12px monospace";
    ctx.fillText(`${key} (${Math.round(pt.x)}, ${Math.round(pt.y)})`, pt.x + 14, pt.y - 10);
  }
}

let dragging: { x: number; y: number } | null = null;

function hitTest(mx: number, my: number) {
  for (const pt of Object.values(pts)) {
    const dx = mx - pt.x;
    const dy = my - pt.y;
    if (dx * dx + dy * dy <= (POINT_RADIUS + 4) ** 2) return pt;
  }
  return null;
}

canvas.addEventListener("mousedown", (e) => {
  dragging = hitTest(e.offsetX, e.offsetY);
});

canvas.addEventListener("mousemove", (e) => {
  if (!dragging) {
    canvas.style.cursor = hitTest(e.offsetX, e.offsetY) ? "grab" : "default";
    return;
  }
  canvas.style.cursor = "grabbing";
  dragging.x = e.offsetX;
  dragging.y = e.offsetY;
  refreshGui();
  draw();
});

canvas.addEventListener("mouseup", () => {
  dragging = null;
  canvas.style.cursor = "default";
});

canvas.addEventListener("mouseleave", () => {
  dragging = null;
});

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
    --font-family: monospace;
    --font-size: 14px;
    --input-font-size: 14px;
    --border-radius: 6px;
    --widget-border-radius: 4px;
  }
`;
document.head.appendChild(style);

const gui = new GUI({ title: "Bézier curve" });

const p0Folder = gui.addFolder("p0 — start");
p0Folder.add(pts.p0, "x", 0, 1920, 1).name("x").onChange(draw);
p0Folder.add(pts.p0, "y", 0, 1080, 1).name("y").onChange(draw);
p0Folder.open();

const p1Folder = gui.addFolder("p1 — control");
p1Folder.add(pts.p1, "x", 0, 1920, 1).name("x").onChange(draw);
p1Folder.add(pts.p1, "y", 0, 1080, 1).name("y").onChange(draw);
p1Folder.open();

const p2Folder = gui.addFolder("p2 — end");
p2Folder.add(pts.p2, "x", 0, 1920, 1).name("x").onChange(draw);
p2Folder.add(pts.p2, "y", 0, 1080, 1).name("y").onChange(draw);
p2Folder.open();

const granularityFolder = gui.addFolder("Granularity");
granularityFolder
  .add(paramaters, "granularity", 0.01, 0.5, 0.001)
  .name("granularity")
  .onChange(draw);
granularityFolder.open();

function refreshGui() {
  for (const folder of [p0Folder, p1Folder, p2Folder, granularityFolder]) {
    folder.controllers.forEach((c) => {
      c.updateDisplay();
    });
  }
}

resize();
