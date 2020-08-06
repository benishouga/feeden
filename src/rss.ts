import Parser from "rss-parser";
import Puppeteer from "puppeteer";
import { Dictionary } from "./dictionary";

const feeds = ["https://dev.to/feed/"];

(async () => {
  try {
    console.time("construction");
    const dic = new Dictionary("./data/words");
    console.timeEnd("construction");
    console.time("preload");
    await dic.preload();
    console.timeEnd("preload");

    console.time("parseURL");
    const rss = await new Parser().parseURL("https://dev.to/feed/");
    console.timeEnd("parseURL");
    console.time("Puppeteer.launch");
    const html = rss.items?.[1].content;
    if (!html) return;
    const browser = await Puppeteer.launch();
    console.timeEnd("Puppeteer.launch");
    console.time("await page.evaluate");
    const page = await browser.newPage();
    await page.setContent(html);
    const element = await page.$("*");
    const text: string = await page.evaluate((element) => element.textContent, element);
    await browser.close();
    console.timeEnd("await page.evaluate");
    console.time("dictinary.get");
    const texts = text
      .split("\n")
      .join("  ")
      .split(/\s{2,}/)
      .filter((e) => e);
    console.log(texts);
    const array = Array.from(
      new Set(texts.reduce<string[]>((r, e) => r.concat(e.split(/[^a-zA-Z0-9'-]/)), []).filter((e) => e))
    ).filter((e) => e);
    const results = await Promise.all(array.map(async (word) => ({ word, results: await dic.get(word) })));
    results.forEach((result) => {
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

    console.timeEnd("dictinary.get");
  } catch (e) {
    console.error(e);
  }
})();
