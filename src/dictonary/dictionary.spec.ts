import fs from "fs";
import { PassThrough, pipeline as orgPipeline } from "stream";
import util from "util";

const pipeline = util.promisify(orgPipeline);

import * as iconv from "iconv-lite";
import ReadlineTransform from "readline-transform";


const perline = new ReadlineTransform();

describe("Dictionary", () => {
  test("Test using snapshot", async () => {
    // async function run() {
    //   const start = new Date().getTime();
    //   await pipeline(
    //     fs.createReadStream("./data/temp/pick.txt"),
    //     iconv.decodeStream("Shift_JIS"),
    //     perline,
    //     new PassThrough({ objectMode: true }).on("data", (line) => addRow(line))
    //   );
    //   console.log("time: ", new Date().getTime() - start);
    //   const dic = getDictionary();
    //   expect(dic).toMatchSnapshot();
    //   const indexes = getIndexes();
    //   expect(indexes).toMatchSnapshot();
    // }
    // await run();
  });
});
