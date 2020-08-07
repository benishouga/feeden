import { Dictionary } from "./dictonary/dictionary";
import { BASEPATH } from "./config";
import Parser from "rss-parser";
import Puppeteer, { Browser } from "puppeteer";

type ExtractedResult = { sentences: string[]; words: string[] };

export class Article {
  private dic: Dictionary;
  private parser: Parser;
  private browser?: Browser;

  constructor() {
    this.dic = new Dictionary(BASEPATH);
    this.parser = new Parser();
  }

  async initialize() {
    this.dic.preload();
    this.browser = await Puppeteer.launch();
    return this;
  }

  async dispose() {
    this.dic.preload();
    await this.browser?.close();
    return;
  }

  async rss(url: string) {
    const text = await this.extractRss(url);
    if (!text) {
      throw new Error("Text not found.");
    }
    const { sentences, words } = this.extractText(text);

    return {
      sentences,
      words,
      meanings: await Promise.all(words.map(async (word) => ({ word, results: await this.dic.lookup(word) }))),
    };
  }

  async web(url: string) {
    const text = await this.extractWeb(url);
    if (!text) {
      throw new Error("Text not found.");
    }
    const { sentences, words } = this.extractText(text);

    return {
      sentences,
      words,
      meanings: await Promise.all(words.map(async (word) => ({ word, results: await this.dic.lookup(word) }))),
    };
  }

  private async extractWeb(url: string) {
    if (!this.browser) {
      throw new Error("Uninitialized");
    }
    const page = await this.browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    const element = (await page.$("article")) || (await page.$("*"));
    const text: string = await page.evaluate((element) => element.textContent, element);
    await page.close();
    return text;
  }

  private extractText(text: string): ExtractedResult {
    const sentences = this.extractSentences(text);
    const words = this.extractWords(sentences);
    return { sentences, words };
  }

  private extractWords(sentences: string[]) {
    return Array.from(
      new Set(sentences.reduce<string[]>((r, e) => r.concat(e.split(/[^a-zA-Z0-9'-]/)), []).filter((e) => e))
    ).filter((e) => e);
  }

  private extractSentences(text: string): string[] {
    return text
      .split("\n")
      .join("  ")
      .split(/\s{2,}/)
      .filter((e) => e);
  }

  private async extractRss(url: string): Promise<string | null> {
    if (!this.browser) {
      throw new Error("Uninitialized");
    }
    const rss = await this.parser.parseURL(url);
    const html = rss.items?.[1].content;
    if (!html) return null;
    const page = await this.browser.newPage();
    await page.setContent(html);
    const element = await page.$("*");
    const text: string = await page.evaluate((element) => element.textContent, element);
    await page.close();
    return text;
  }
}
