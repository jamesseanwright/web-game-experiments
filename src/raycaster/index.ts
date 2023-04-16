const createKeys = () => {
  const keys = new Set<string>;

  window.addEventListener('keydown', ({ key }) => {
    keys.add(key);
  });

  window.addEventListener('keyup', ({ key }) => {
    keys.delete(key);
  });

  const isPressed = (key: string) => keys.has(key);

  return isPressed;
};

const context = document
  .querySelector<HTMLCanvasElement>("#canvas")
  ?.getContext("2d");

if (!context) {
  throw new Error(
    "Unable to retrieve output canvas context. Ensure a canvas with the ID #canvas is present in the DOM.",
  );
}

interface Entity {
  update(): void
}

const PLAYER_SIZE = 32;

const isKeyPressed = createKeys();

const createPlayer = (x: number, y: number, speed: number) => ({
  x,
  y,
  speed,
  update() {
    if (isKeyPressed('w')) {
      this.y -= speed;
    }

    if (isKeyPressed('s')) {
      this.y += speed;
    }

    if (isKeyPressed('a')) {
      this.x -= speed;
    }

    if (isKeyPressed('d')) {
      this.x += speed;
    }

    context.fillStyle = 'green';
    context.fillRect(this.x, this.y, PLAYER_SIZE, PLAYER_SIZE);
  },
});

const FPS = 60;
const TICK_INTERVAL_MS = 1000 / FPS;

let lastTick = 0;

const entities: Entity[] = [createPlayer(300, 300, 5)];

const loop = (tick: DOMHighResTimeStamp) => {
  if (tick - lastTick >= TICK_INTERVAL_MS) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    for (const entity of entities) {
      entity.update();
    }

    lastTick = tick;
  }

  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
