const context = document
  .querySelector<HTMLCanvasElement>("#canvas")
  ?.getContext("2d");

if (!context) {
  throw new Error(
    "Unable to retrieve output canvas context. Ensure a canvas with the ID #canvas is present in the DOM.",
  );
}

const FPS = 60;
const TICK_INTERVAL_MS = 1000 / FPS;

let lastTick = 0;

const loop = (tick: DOMHighResTimeStamp) => {
  if (tick - lastTick >= TICK_INTERVAL_MS) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.fillText(tick + "", 20, 20);
    lastTick = tick;
  }

  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
