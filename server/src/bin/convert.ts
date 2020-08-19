import { Dictionary } from "../lib/dictionary";
import { EIJIRO_TEXT_PATH, BASEPATH } from "../config";
import { showMemory } from "../lib/monitoring";

async function run() {
  console.time("convert");
  // const path = "./data/eijiro/pick.txt";
  // const path = "./data/eijiro/i.txt";
  const path = EIJIRO_TEXT_PATH;
  await new Dictionary(BASEPATH).convertFrom(path);
  console.timeEnd("convert");
  showMemory();
}

run().catch(console.error);
