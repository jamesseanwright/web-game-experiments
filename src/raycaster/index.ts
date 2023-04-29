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

// In the following ray-related functions, rayRotation is
// raySource.rotation but offset for the current ray we're
// rendering; this enables us to draw multiple rays around
// the ray source, determined by the values specified
// in RAY_INCREMENT_RADIANS and RAY_COUNT.

const renderRay = (
  rayRotation: number,
  raySource: RaySource,
  xStep: number,
  yStep: number,
) => {
  const isFacingAlongAxis = rayRotation === 0 || rayRotation === Math.PI;

  if (isFacingAlongAxis) {
    return;
  }

  let x = raySource.x;
  let y = raySource.y;
  let j = 0;

  while (j < 8) {
    // TODO: refactor depth of field check (and bump number!)
    const row = Math.floor(y / GRID_ITEM_SIZE);
    const col = Math.floor(x / GRID_ITEM_SIZE);

    if (map[row]?.[col] === 1) {
      break;
    }

    x += xStep;
    y += yStep;
    j++;
  }

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

const projectHorizontalRay = (rayRotation: number, raySource: RaySource) => {
  const row = GRID_ITEM_SIZE * Math.floor(raySource.y / GRID_ITEM_SIZE)
  let yStep = -GRID_ITEM_SIZE + (row - raySource.y);

  const isFacingSouth = rayRotation < Math.PI;

  if (isFacingSouth) {
    yStep = GRID_ITEM_SIZE - (raySource.y - row);
  }

  const xStep = yStep / Math.tan(rayRotation);

  return [xStep, yStep] as const;
};

const projectVerticalRay = (rayRotation: number, raySource: RaySource) => {
  let xStep = -GRID_ITEM_SIZE + raySource.x;

  const isFacingEast =
    rayRotation < Math.PI / 2 || rayRotation > (Math.PI / 2) * 3;

  if (isFacingEast) {
    xStep = GRID_ITEM_SIZE - raySource.x;
  }

  const yStep = xStep * Math.tan(rayRotation);

  return [xStep, yStep] as const;
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
    const [hxStep, hyStep] = projectHorizontalRay(rayRotation, raySource);

    const hDistance = getDistance(
      raySource.x,
      raySource.y,
      raySource.x + hxStep,
      raySource.y + hyStep,
    );

    const [vxStep, vyStep] = projectVerticalRay(rayRotation, raySource);

    const vDistance = getDistance(
      raySource.x,
      raySource.y,
      raySource.x + vxStep,
      raySource.y + vyStep,
    );

    // Select the shortest ray
    const xStep = hDistance < vDistance ? hxStep : vxStep;
    const yStep = hDistance < vDistance ? hyStep : vyStep;

    // TODO: replace with renderRay()
    renderRayWithinCell(rayRotation, raySource, xStep, yStep);
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
