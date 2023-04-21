const createKeys = () => {
  const keys = new Set<string>();

  window.addEventListener("keydown", ({ key }) => {
    keys.add(key);
  });

  window.addEventListener("keyup", ({ key }) => {
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
  update(): void;
}

interface Rotatable {
  rotation: number;
}

interface Positionable {
  x: number;
  y: number;
}

const GRID_ITEM_SIZE = 64;

const map = [
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
];

const createMapRenderer = () => ({
  update() {
    for (let row = 0; row < map.length; row++) {
      for (let col = 0; col < map[row].length; col++) {
        context.fillStyle = map[row][col] === 1 ? "white" : "black";
        context.fillRect(
          GRID_ITEM_SIZE * col,
          GRID_ITEM_SIZE * row,
          GRID_ITEM_SIZE,
          GRID_ITEM_SIZE,
        );

        context.strokeStyle = "2px solid blue";
        context.strokeRect(
          GRID_ITEM_SIZE * col,
          GRID_ITEM_SIZE * row,
          GRID_ITEM_SIZE,
          GRID_ITEM_SIZE,
        );
      }
    }
  },
});

const RAY_COUNT = 1;

const createRayRenderer = (raySource: Positionable & Rotatable) => ({
  // TODO: refactor to share common logic between horizontal and vertical tests
  update() {
    const rotation = raySource.rotation;

    // Test horizontal lines
    const atan = -1 / Math.tan(rotation);
    let x = -1;
    let y = -1;
    let xDir = 1; // TODO: improve/consolidate names
    let yDir = 1;
    let xOffset = 0;
    let yOffset = 0;

    const isFacingNorth = rotation > Math.PI;
    const isFacingSouth = rotation < Math.PI;
    const isFacingAlongAxis = rotation === 0 || rotation === Math.PI;

    if (isFacingNorth) {
      y = GRID_ITEM_SIZE * Math.floor(raySource.y / GRID_ITEM_SIZE);
      x = (raySource.y - y) * atan + raySource.x;
      yDir = -1;
      yOffset = GRID_ITEM_SIZE;
      xOffset = -yDir * GRID_ITEM_SIZE * atan;
    }

    if (isFacingSouth) {
      y =
        GRID_ITEM_SIZE * Math.floor(raySource.y / GRID_ITEM_SIZE) +
        GRID_ITEM_SIZE;

      x = (raySource.y - y) * atan + raySource.x;
      yDir = 1;
      yOffset = 0;
      xOffset = -yDir * GRID_ITEM_SIZE * atan;
    }

    if (!isFacingAlongAxis) {
      let j = 0;

      while (j < 8) {
        const row = y / GRID_ITEM_SIZE;
        const col = Math.floor(x / GRID_ITEM_SIZE);

        if (map[row]?.[col] === 1) {
          break;
        }

        x += xOffset;
        y += GRID_ITEM_SIZE * yDir;
        j++;
      }
    }

    // context.strokeStyle = "green";
    // context.lineWidth = 1;
    // context.beginPath();
    // context.moveTo(raySource.x, raySource.y);
    // context.lineTo(x, y + yOffset);
    // context.stroke();

    // Test vertical lines
    const ntan = -Math.tan(rotation);
    const isFacingWest = rotation > Math.PI / 2 && rotation < (Math.PI / 2) * 3;
    const isFacingEast = rotation < Math.PI / 2 || rotation > (Math.PI / 2) * 3;

    if (isFacingWest) {
      x = GRID_ITEM_SIZE * Math.floor(raySource.x / GRID_ITEM_SIZE);
      y = (raySource.x - x) * ntan + raySource.y;
      xDir = -1;
      xOffset = GRID_ITEM_SIZE;
      yOffset = -xDir * GRID_ITEM_SIZE * ntan;
    }

    if (isFacingEast) {
      x =
        GRID_ITEM_SIZE * Math.floor(raySource.x / GRID_ITEM_SIZE) +
        GRID_ITEM_SIZE;
      y = (raySource.x - x) * ntan + raySource.y;
      xDir = 1;
      xOffset = 0;
      yOffset = -xDir * GRID_ITEM_SIZE * ntan;
    }

    if (rotation !== 0 && rotation !== Math.PI) {
      let j = 0;

      while (j < 8) {
        const row = Math.floor(y / GRID_ITEM_SIZE);
        const col = x / GRID_ITEM_SIZE;

        if (map[row]?.[col] === 1) {
          break;
        }

        x += GRID_ITEM_SIZE * xDir;
        y += yOffset;
        j++;
      }
    }

    context.strokeStyle = "pink";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(raySource.x, raySource.y);
    context.lineTo(x + xOffset, y);
    context.stroke();
  },
});

const PLAYER_SIZE = 32;
const PLAYER_SPEED = 5;
const PLAYER_ROTATION_SPEED = 0.1;

const isKeyPressed = createKeys();

const createPlayer = (x: number, y: number, rotation: number) => ({
  x,
  y,
  rotation,
  deltaX: Math.cos(rotation) * 5,
  deltaY: Math.sin(rotation) * 5,
  update() {
    if (isKeyPressed("w")) {
      this.x += this.deltaX;
      this.y += this.deltaY;
    }

    if (isKeyPressed("s")) {
      this.x -= this.deltaX;
      this.y -= this.deltaY;
    }

    if (isKeyPressed("a")) {
      const rotation = this.rotation - PLAYER_ROTATION_SPEED;
      this.rotation = rotation < 0 ? rotation + Math.PI * 2 : rotation;
      this.deltaX = Math.cos(this.rotation) * 5;
      this.deltaY = Math.sin(this.rotation) * 5;
    }

    if (isKeyPressed("d")) {
      const rotation = this.rotation + PLAYER_ROTATION_SPEED;
      this.rotation =
        rotation > Math.PI * 2 ? rotation - 2 * Math.PI : rotation;
      this.deltaX = Math.cos(this.rotation) * 5;
      this.deltaY = Math.sin(this.rotation) * 5;
    }

    context.fillStyle = "green";
    context.fillRect(this.x, this.y, PLAYER_SIZE, PLAYER_SIZE);

    context.lineWidth = PLAYER_SIZE / 4;
    context.strokeStyle = "green";
    context.beginPath();
    context.moveTo(this.x + PLAYER_SIZE / 2, this.y + PLAYER_SIZE / 2);
    context.lineTo(
      this.x + PLAYER_SIZE / 2 + this.deltaX * 10,
      this.y + PLAYER_SIZE / 2 + this.deltaY * 10,
    );
    context.stroke();
  },
});

const FPS = 60;
const TICK_INTERVAL_MS = 1000 / FPS;

let lastTick = 0;

const player = createPlayer(300, 300, 0);
const entities: Entity[] = [
  createMapRenderer(),
  player,
  createRayRenderer(player),
];

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
