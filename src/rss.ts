import { Article } from "./article";

(async () => {
  try {
    const article = await new Article().initialize();
    try {
      const rss = await article.rss(process.argv[2] || "https://dev.to/feed/");
      rss.meanings.forEach((result) => {
        console.log(`-- ${result.word} --`);
        result.results.forEach((e) => {
          console.log(
            e.indexedWord,
            ": ",
            e.meanings
              .map((m) => m.text)
              .filter((m) => m)
              .join(", ")
          );
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
