const GRID_ITEM_SIZE = 64;
const RAY_COUNT = 1;
const PLAYER_SIZE = 32;
const PLAYER_SPEED = 5;
const PLAYER_ROTATION_SPEED = 0.1;
const FPS = 60;
const TICK_INTERVAL_MS = 1000 / FPS;

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

interface Rotatable {
  rotation: number;
  deltaX: number;
  deltaY: number;
}

interface Positionable {
  x: number;
  y: number;
}

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

const renderMap = () => {
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
};

const drawRays = (
  raySource: Rotatable & Positionable,
  x: number,
  y: number,
  xTileStep: number,
  yTileStep: number,
  xOffset: number,
  yOffset: number,
) => {
  const isFacingAlongAxis =
    raySource.rotation === 0 || raySource.rotation === Math.PI;

  if (isFacingAlongAxis) {
    return;
  }

  let j = 0;

  while (j < 8) {
    // TODO: refactor depth of field check (and bump number!)
    const row = Math.floor(y / GRID_ITEM_SIZE);
    const col = Math.floor(x / GRID_ITEM_SIZE);

    if (map[row]?.[col] === 1) {
      break;
    }

    x += xTileStep;
    y += yTileStep;
    j++;
  }

  context.strokeStyle = "green";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(raySource.x, raySource.y);
  context.lineTo(x + xOffset, y + yOffset);
  context.stroke();
};

const testHorizontalIntersect = (raySource: Positionable & Rotatable) => {
  const ncotan = -1 / Math.tan(raySource.rotation);
  let y = GRID_ITEM_SIZE * Math.floor(raySource.y / GRID_ITEM_SIZE);
  let yOffset = GRID_ITEM_SIZE; // This is so the line ends at the bottom of the tile
  let yTileStep = -GRID_ITEM_SIZE;
  const x = (raySource.y - y) * ncotan + raySource.x;

  const isFacingSouth = raySource.rotation < Math.PI;

  if (isFacingSouth) {
    y += GRID_ITEM_SIZE;
    yTileStep = GRID_ITEM_SIZE;
    yOffset = 0; // We want the ray line to end at the top of the tile here
  }

  const xTileStep = -yTileStep * ncotan;

  drawRays(raySource, x, y, xTileStep, yTileStep, 0, yOffset);
};

const testVerticalIntersect = (raySource: Positionable & Rotatable) => {
  const ntan = -Math.tan(raySource.rotation);
  let x = GRID_ITEM_SIZE * Math.floor(raySource.x / GRID_ITEM_SIZE);
  let xTileStep = -GRID_ITEM_SIZE;
  let xOffset = GRID_ITEM_SIZE; // This is so the line ends at the right of the tile
  const y = (raySource.x - x) * ntan + raySource.y;

  const isFacingEast =
    raySource.rotation < Math.PI / 2 || raySource.rotation > (Math.PI / 2) * 3;

  if (isFacingEast) {
    x += GRID_ITEM_SIZE;
    xTileStep = GRID_ITEM_SIZE;
    xOffset = 0; // We want the line to end at the left of the tile here
  }

  const yTileStep = -xTileStep * ntan;

  drawRays(raySource, x, y, xTileStep, yTileStep, xOffset, 0);
};

const renderRays = (raySource: Positionable & Rotatable) => {
  testHorizontalIntersect(raySource);
  testVerticalIntersect(raySource);
};

const isKeyPressed = createKeys();

const createPlayer = (x: number, y: number, rotation: number) => ({
  x,
  y,
  rotation,
  deltaX: Math.cos(rotation) * 5,
  deltaY: Math.sin(rotation) * 5,
});

const updatePlayer = (player: Positionable & Rotatable) => {
  if (isKeyPressed("w")) {
    player.x += player.deltaX;
    player.y += player.deltaY;
  }

  if (isKeyPressed("s")) {
    player.x -= player.deltaX;
    player.y -= player.deltaY;
  }

  if (isKeyPressed("a")) {
    const rotation = player.rotation - PLAYER_ROTATION_SPEED;
    player.rotation = rotation < 0 ? rotation + Math.PI * 2 : rotation;
    player.deltaX = Math.cos(player.rotation) * 5;
    player.deltaY = Math.sin(player.rotation) * 5;
  }

  if (isKeyPressed("d")) {
    const rotation = player.rotation + PLAYER_ROTATION_SPEED;
    player.rotation =
      rotation > Math.PI * 2 ? rotation - 2 * Math.PI : rotation;
    player.deltaX = Math.cos(player.rotation) * 5;
    player.deltaY = Math.sin(player.rotation) * 5;
  }
};

const renderPlayer = (player: Positionable & Rotatable) => {
  context.fillStyle = "green";
  context.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);

  context.lineWidth = PLAYER_SIZE / 4;
  context.strokeStyle = "green";
  context.beginPath();
  context.moveTo(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2);
  context.lineTo(
    player.x + PLAYER_SIZE / 2 + player.deltaX * 10,
    player.y + PLAYER_SIZE / 2 + player.deltaY * 10,
  );

  context.stroke();
};

let lastTick = 0;

const player = createPlayer(300, 300, 0);

const loop = (tick: DOMHighResTimeStamp) => {
  if (tick - lastTick >= TICK_INTERVAL_MS) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    renderMap();
    updatePlayer(player);
    renderPlayer(player);
    renderRays(player);

    lastTick = tick;
  }

  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
