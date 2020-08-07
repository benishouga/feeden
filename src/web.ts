import { Article } from "./article";

(async () => {
  try {
    const article = await new Article().initialize();
    try {
      const web = await article.web(process.argv[2] || "https://fettblog.eu/typescript-react-component-patterns/");
      web.meanings.forEach((result) => {
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
