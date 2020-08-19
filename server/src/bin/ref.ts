import { Dictionary } from "../lib/dictionary";
import { BASEPATH } from "../config";
import { showMemory } from "../lib/monitoring";

async function run() {
  const dic = new Dictionary(BASEPATH);
  await dic.preload();

  const ref = await dic.lookup(process.argv[2] || "close");
  // ref.forEach((e) => console.log(e.meanings.map((m) => `${e.indexedWord}: ${JSON.stringify(m)}`).join("\n")));
  console.log(JSON.stringify(ref, null, "  "));
  showMemory();
}

run().catch(console.error);
