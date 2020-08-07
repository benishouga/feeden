import { Dictionary } from "./dictonary/dictionary";
import { BASEPATH } from "./config";

async function run() {
  const dic = new Dictionary(BASEPATH);
  // await dic.preload();
  {
    const start = new Date().getTime();
    const ref = await dic.lookup(process.argv[2] || "I");
    ref.forEach((e) => console.log(e.meanings.map((m) => `${e.indexedWord}: ${JSON.stringify(m)}`).join("\n")));
    console.log("time: ", new Date().getTime() - start);
  }
  const memory = process.memoryUsage();
  console.log(
    Object.keys(memory).map((key) => ({ key, GB: Math.floor(((memory as any)[key] / 1024 / 1024 / 1024) * 100) / 100 }))
  );
}

run().catch(console.error);
