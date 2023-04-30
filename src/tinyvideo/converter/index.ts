import * as ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Note: this assumes an invocation of `npx ts-node src/tinyvideo/converter/index.ts <video name>`
const [, , inputFilename] = process.argv;
const outdir = fs.mkdtempSync(path.join(os.tmpdir(), "tinyvideo")); // TODO: refactor to use in-memory buffer

const processFrames = () => {
  console.log(fs.readdirSync(outdir));
};

ffmpeg(inputFilename)
  .noAudio()
  .duration("00:00:30")
  .videoFilters([
    "eq=contrast=1000",
    "hue=s=0",
    "fps=5",
    "scale=200:150",
  ])
  .output(`${outdir}/%d.bmp`)
  .on('end', processFrames)
  .run();
