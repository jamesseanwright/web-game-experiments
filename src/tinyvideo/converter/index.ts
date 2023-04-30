import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as ffmpeg from "fluent-ffmpeg";
import * as imagemagick from "imagemagick";

const BIT_DEPTH = 8;
const BMP_HEADER_COLOUR_TABLE_OFFSET_START = 10;
const BMP_HEADER_COLOUR_TABLE_OFFSET_LENGTH_BYTES = 4;
const BMP_COLOUR_TABLE_LENGTH_BYTES = 4 * BIT_DEPTH;

// TODO: refactor to process in memory!

// Note: this assumes an invocation of `$ npx ts-node src/tinyvideo/converter/index.ts <video name>`
const [, , inputFilename] = process.argv;
const outdir = fs.mkdtempSync(path.join(os.tmpdir(), "tinyvideo"));
console.log("******", outdir);

const processFrames = () => {
  const frames = fs.readdirSync(outdir);

  for (const frame of frames) {
    imagemagick.convert(
      [path.join(outdir, frame), "-monochrome", path.join(outdir, frame)],
      (err) => {
        if (err) {
          throw err;
        }

        const crushedFrame = fs.readFileSync(path.join(outdir, "11.bmp"));
        processFrame(crushedFrame);
      },
    );
  }
};

const processFrame = (frame: Buffer) => {
  const rawColourTableStart = new Uint8Array(
    BMP_HEADER_COLOUR_TABLE_OFFSET_LENGTH_BYTES,
  );
  const copied = frame.copy(
    rawColourTableStart,
    0,
    BMP_HEADER_COLOUR_TABLE_OFFSET_START,
    BMP_HEADER_COLOUR_TABLE_OFFSET_START +
      BMP_HEADER_COLOUR_TABLE_OFFSET_LENGTH_BYTES,
  );

  if (copied !== BMP_HEADER_COLOUR_TABLE_OFFSET_LENGTH_BYTES) {
    throw new Error(
      `Unexpected read byte count for Header.DataOffset! Got ${copied} but wanted ${BMP_HEADER_COLOUR_TABLE_OFFSET_LENGTH_BYTES}`,
    );
  }

  const colourTableStart = rawColourTableStart.reduce(
    (total, x) => total + x,
    0,
  );
  const pixelStart = colourTableStart + BMP_COLOUR_TABLE_LENGTH_BYTES;
  const pixelData = new Uint8Array(frame.length - pixelStart);
  frame.copy(pixelData, 0, pixelStart, frame.length - pixelStart);

  console.log(JSON.stringify(pixelData));
};

ffmpeg(inputFilename)
  .noAudio()
  .duration("00:00:30")
  .videoFilters(["eq=contrast=1000", "hue=s=0", "fps=5", "scale=200:150"])
  .output(`${outdir}/%d.bmp`)
  .on("end", processFrames)
  .run();
