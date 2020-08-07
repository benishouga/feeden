import { Dictionary } from "./dictonary/dictionary";
import { EIJIRO_TEXT_PATH, BASEPATH } from "./config";

async function run() {
  const start = new Date().getTime();
  // const path = "./data/eijiro/pick.txt";
  // const path = "./data/eijiro/i.txt";
  const path = EIJIRO_TEXT_PATH;
  await new Dictionary(BASEPATH).convertFrom(path);
  console.log("time: ", new Date().getTime() - start);
}

run().catch(console.error);
