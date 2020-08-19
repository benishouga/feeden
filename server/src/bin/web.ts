import { Article } from "../lib/article";
import { showMemory } from "../lib/monitoring";

(async () => {
  try {
    console.time("web");
    const article = await new Article().initialize();
    try {
      const web = await article.web(process.argv[2] || "https://fettblog.eu/typescript-react-component-patterns/");
      console.timeEnd("web");
      web.results
        .filter((result) => result.lookupResults.length)
        .sort((a, b) => (a.meta?.level || 1000) - (b.meta?.level || 1000))
        .slice(0, 50)
        .forEach((result) => {
          console.log(`-- ${result.lookupWord} --`);
          result.lookupResults.forEach((e) => {
            console.log(
              e.indexedWord,
              ": ",
              e.meanings
                .map((m) => m.text)
                .filter((m) => m)
                .join(", ")
            );
            e.meanings
              .map((m) => m.links)
              .forEach((links) => {
                if (!links) {
                  return;
                }
                links.forEach((link) => {
                  console.log("  -> ", link.indexedWord, ": ", link.meanings.map((meaning) => meaning.text).join(", "));
                });
              });
          });
        });
    } finally {
      console.log("disposing");
      await article.dispose();
      console.log("diposed");
    }
    showMemory();
  } catch (e) {
    console.error(e);
  }
})();
