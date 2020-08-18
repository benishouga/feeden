import { Article } from "./article";

(async () => {
  try {
    const article = await new Article().initialize();
    try {
      const rss = await article.rss(process.argv[2] || "https://dev.to/feed/");
      rss.lookupResults
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
  } catch (e) {
    console.error(e);
  }
})();
