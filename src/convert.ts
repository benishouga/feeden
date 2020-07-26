import fs from "fs";
import { PassThrough, pipeline as orgPipeline } from "stream";
import util from "util";

const pipeline = util.promisify(orgPipeline);

import * as iconv from "iconv-lite";
import ReadlineTransform from "readline-transform";

import { addRow, show } from "./dictionary";

const perline = new ReadlineTransform();

async function run() {
  const start = new Date().getTime();
  await pipeline(
    fs.createReadStream("./data/temp/pick.txt"),
    // fs.createReadStream("./data/eijiro/EIJIRO-1448.TXT"),
    iconv.decodeStream("Shift_JIS"),
    perline,
    // new PassThrough({ objectMode: true }).on("data", (line) => {})
    new PassThrough({ objectMode: true }).on("data", (line) => addRow(line))
  );
  console.log("time: ", new Date().getTime() - start);
  show();
}

run().catch(console.error);
