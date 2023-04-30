const GRID_ITEM_SIZE = 64;
const RAY_COUNT = 1;
const RAY_INCREMENT_RADIANS = 0.0174533; // i.e. 1 degree
const PLAYER_SIZE = 32;
const PLAYER_SPEED = 5;
const PLAYER_ROTATION_SPEED = 0.1;
const FPS = 60;
const TICK_INTERVAL_MS = 1000 / FPS;

const createKeys = () => {
  const keys = new Set<string>();

  window.addEventListener("keydown", ({ key }) => {
    keys.add(key.toLowerCase());
  });

  window.addEventListener("keyup", ({ key }) => {
    keys.delete(key.toLowerCase());
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
  deltaX: number; // TODO: get rid of these properties!
  deltaY: number;
}

interface Positionable {
  x: number;
  y: number;
}

interface Sizeable {
  width: number;
  height: number;
}

type RaySource = Rotatable & Positionable & Sizeable;

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

// i.e. the hypotenuse
const getDistance = (ax: number, ay: number, bx: number, by: number) =>
  Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));

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

// For debugging
const renderRayWithinCell = (
  rayRotation: number,
  raySource: RaySource,
  xStep: number,
  yStep: number,
) => {
  const isFacingAlongAxis = rayRotation === 0 || rayRotation === Math.PI;

  if (isFacingAlongAxis) {
    return;
  }

  const x = raySource.x + xStep;
  const y = raySource.y + yStep;

  context.strokeStyle = "green";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(
    raySource.x + raySource.width / 2,
    raySource.y + raySource.height / 2,
  );
  context.lineTo(x, y);
  context.stroke();
};

const projectRay = (
  raySource: RaySource,
  xIntersect: number,
  yIntersect: number,
  xStep: number,
  yStep: number,
) => {
  let x = raySource.x + xIntersect; // TODO: offset from centre
  let y = raySource.y + yIntersect;
  const isFacingAlongAxis =
    raySource.rotation === 0 || raySource.rotation === Math.PI;

  if (isFacingAlongAxis) {
    return [x, y] as const;
  }

  let j = 0;

  while (j < 8) {
    // TODO: refactor depth of field check (and bump number!)
    const row = Math.floor(y / GRID_ITEM_SIZE);
    const col = Math.floor(x / GRID_ITEM_SIZE);

    if (map[row]?.[col] === 1) {
      return [x, y] as const;
    }

    x += xStep;
    y += yStep;
    j++;
  }

  return [x, y] as const;
};

const renderRay = (raySource: RaySource, x: number, y: number) => {
  context.strokeStyle = "green";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(
    raySource.x, // TODO: offset from centre
    raySource.y,
  );
  context.lineTo(x, y);
  context.stroke();
};

const intersectHorizontally = (rayRotation: number, raySource: RaySource) => {
  const row = GRID_ITEM_SIZE * Math.floor(raySource.y / GRID_ITEM_SIZE);
  const yDelta = row - raySource.y;
  const direction = rayRotation > Math.PI ? -1 : 1;
  const yIntersect = direction === -1 ? yDelta : GRID_ITEM_SIZE + yDelta;
  const xIntersect = yIntersect / Math.tan(rayRotation);
  const yStep = direction * GRID_ITEM_SIZE; // TODO: handle in grid space and project to pixels at render time
  const xStep = (direction * GRID_ITEM_SIZE) / Math.tan(rayRotation);

  return [xIntersect, yIntersect, xStep, yStep] as const;
};

const intersectVertically = (rayRotation: number, raySource: RaySource) => {
  const col = GRID_ITEM_SIZE * Math.floor(raySource.x / GRID_ITEM_SIZE);
  const xDelta = col - raySource.x;

  const direction =
    rayRotation > Math.PI / 2 && rayRotation < (Math.PI / 2) * 3 ? -1 : 1;

  const xIntersect = direction === -1 ? xDelta : GRID_ITEM_SIZE + xDelta;
  const yIntersect = xIntersect * Math.tan(rayRotation);
  const xStep = GRID_ITEM_SIZE;
  const yStep = direction * GRID_ITEM_SIZE * Math.tan(rayRotation);

  return [xIntersect, yIntersect, xStep, yStep] as const;
};

const renderRays = (raySource: RaySource) => {
  const raysStartAngle =
    raySource.rotation - (RAY_INCREMENT_RADIANS * RAY_COUNT) / 2;

  const raysEndAngle =
    raySource.rotation + (RAY_INCREMENT_RADIANS * RAY_COUNT) / 2;

  for (
    let rayRotation = raysStartAngle;
    rayRotation < raysEndAngle;
    rayRotation += RAY_INCREMENT_RADIANS
  ) {
    const [hxIntersect, hyIntersect, hxStep, hyStep] = intersectHorizontally(
      rayRotation,
      raySource,
    );
    const [hx, hy] = projectRay(
      raySource,
      hxIntersect,
      hyIntersect,
      hxStep,
      hyStep,
    );

    const hDistance = getDistance(raySource.x, raySource.y, hx, hy);

    const [vxIntersect, vyIntersect, vxStep, vyStep] = intersectVertically(
      rayRotation,
      raySource,
    );
    const [vx, vy] = projectRay(
      raySource,
      vxIntersect,
      vyIntersect,
      vxStep,
      vyStep,
    );

    const vDistance = getDistance(raySource.x, raySource.y, vx, vy);

    // Select the shortest ray
    const x = hDistance < vDistance ? hx : vx;
    const y = hDistance < vDistance ? hy : vy;

    renderRay(raySource, x, y);
  }
};

const isKeyPressed = createKeys();

const createPlayer = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
) => ({
  x,
  y,
  width,
  height,
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

const player = createPlayer(272, 144, PLAYER_SIZE, PLAYER_SIZE, 0);

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
