const context = document
  .querySelector<HTMLCanvasElement>('#canvas')
  ?.getContext('2d');

if (!context) {
  throw new Error("Unable to retrieve output canvas context. Ensure a canvas with the ID #canvas is present in the DOM.");
}

context.fillText("Hello", 5, 5);
