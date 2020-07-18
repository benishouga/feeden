import fs from "fs";
import { PassThrough, pipeline as orgPipeline } from "stream";
import util from "util";

const pipeline = util.promisify(orgPipeline);

import * as iconv from "iconv-lite";
import ReadlineTransform from "readline-transform";

import { addRow, showPartOfSpeechSet } from "./dictionary";

const perline = new ReadlineTransform();

async function run() {
  await pipeline(
    fs.createReadStream("./data/eijiro/EIJIRO-SAMPLE-1448.TXT"),
    // fs.createReadStream("./data/temp/pick.txt"),
    iconv.decodeStream("Shift_JIS"),
    perline,
    new PassThrough({ objectMode: true }).on("data", (line) => addRow(line))
  );
  showPartOfSpeechSet();
}

run().catch(console.error);
