import { Dictionary } from "./dictionary";

async function run() {
  const start = new Date().getTime();
  // const path = "./data/eijiro/pick.txt";
  // const path = "./data/eijiro/i.txt";
  const path = "./data/eijiro/EIJIRO-1448.TXT";
  await new Dictionary("./data/words").convertFrom(path);
  console.log("time: ", new Date().getTime() - start);
}

run().catch(console.error);
