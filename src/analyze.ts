import fs from "fs";
import { PassThrough, pipeline as orgPipeline } from "stream";
import util from "util";

import * as iconv from "iconv-lite";
import ReadlineTransform from "readline-transform";

const regs: { [key: string]: () => RegExp } = {
  "{}": () => /\{.*?\}/g,
  "【】": () => /【.*?】/g,
  "《》": () => /《.*?》/g,
  "〈〉": () => /〈.*?〉/g,
};
const result: { [key: string]: Map<string, number> } = {
  "{}": new Map<string, number>(),
  "【】": new Map<string, number>(),
  "《》": new Map<string, number>(),
  "〈〉": new Map<string, number>(),
};

const analyze = (line: string) => {
  let sentence;
  Object.keys(regs).forEach((key) => {
    const reg = regs[key]();
    while ((sentence = reg.exec(line))) {
      const word = sentence[0];
      const c = result[key].get(word) || 0;
      result[key].set(word, c + 1);
    }
  });
  // const match = /【略】[^■◆【]+/.exec(line);
  // if (match) {
  //   console.log(match[0]);
  // }
};

const dump = () => {
  Object.keys(result).forEach((key) => {
    const map = result[key];
    Array.from(map.entries())
      .sort(([_a, a], [_b, b]) => b - a)
      .forEach(([label, count]) => console.log(label, count));
  });
};

const pipeline = util.promisify(orgPipeline);

const perline = new ReadlineTransform();

async function run() {
  await pipeline(
    fs.createReadStream("./data/eijiro/EIJIRO-1448.TXT"),
    iconv.decodeStream("Shift_JIS"),
    perline,
    new PassThrough({ objectMode: true }).on("data", (line) => analyze(line))
  );
  dump();
}

run().catch(console.error);
