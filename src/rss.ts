import { Article } from "./article";

(async () => {
  try {
    const article = await new Article().initialize();
    const rss = await article.rss(process.argv[2] || "https://dev.to/feed/");
    rss.meanings.forEach((result) => {
      console.log(`-- ${result.word} --`);
      result.results.forEach((e) => {
        console.log(
          e.word,
          ": ",
          e.meanings
            .map((m) => m.text)
            .filter((m) => m)
            .join(", ")
        );
      });
    });
    await article.dispose();
  } catch (e) {
    console.error(e);
  }
})();
