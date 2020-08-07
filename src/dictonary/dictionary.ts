import fs, { readFileSync } from "fs";
import fsextra from "fs-extra";
import path from "path";
import { PassThrough, pipeline as orgPipeline } from "stream";
import { promisify } from "util";
import * as iconv from "iconv-lite";
import ReadlineTransform from "readline-transform";

import { extract, extractRepeat } from "./regexp-util";
import { LookupResult } from "./lookup-result";

const pipeline = promisify(orgPipeline);
const mkdir = promisify(fs.mkdir);
const rename = promisify(fs.rename);
const remove = promisify(fsextra.remove);
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);

export type MeaningRow = {
  group?: string;
  type?: string;
  text?: string;
  tags?: string[];
  remarks?: string[];
  examples?: string[];
  additionals?: Additional[];
  links?: string[];
};

export type Additional = {
  type: string;
  value: string;
};

export class Dictionary {
  private converting: boolean = false;
  private loadedSet: Set<string> = new Set();
  private cache: Map<string, MeaningRow[]> = new Map();
  private indexes: Map<string, string[]> = new Map();

  constructor(private basepath: string) {
    try {
      const indexes = readFileSync(path.join(basepath, "_index.json"), "utf-8");
      JSON.parse(indexes).forEach(([key, value]: any) => this.pushIndex(key, value));
    } catch (e) {
      console.warn("Indexes file not found.");
    }
  }

  public async lookup(word: string): Promise<LookupResult[]> {
    let result: LookupResult[] = [];
    const originalResults = await this.lookupCorrectly(word);
    if (originalResults) {
      result.push(new LookupResult(word, originalResults));
    }
    const lower = word.toLowerCase();
    if (word !== lower) {
      const lowerResults = await this.lookupCorrectly(lower);
      if (lowerResults) {
        result.push(new LookupResult(lower, lowerResults));
      }
    }
    const relativeWords = (this.indexes.get(lower) || []).filter(
      (relativeWord) => relativeWord !== word && relativeWord !== lower
    );
    const relativesResults = await Promise.all(
      relativeWords.map(async (word) => {
        const results = await this.lookupCorrectly(word);
        if (!results) {
          throw new Error("The data is corrupted.");
        }
        return new LookupResult(word, results);
      })
    );
    return result.concat(relativesResults);
  }

  async lookupCorrectly(word: string) {
    const meanings = await this.lookupCorrectlyFromCache(word);
    // meanings?.forEach((e) => e.links?.map(e => this.));
    return meanings;
  }

  private async lookupCorrectlyFromCache(word: string) {
    const path = this.jsonPath(word);
    if (this.loadedSet.has(path)) {
      return this.cache.get(word);
    }
    await this.load(path);
    return this.cache.get(word);
  }

  private async load(path: string) {
    try {
      const text = await readFile(path, "utf-8");
      (JSON.parse(text) as any).forEach(([key, value]: any) => this.cache.set(key, value));
      this.loadedSet.add(path);
    } catch {}
  }

  public async preload() {
    const list = await readdir(this.basepath);
    return Promise.all(
      list.filter((file) => file !== "_index.json").map(async (file) => this.load(path.join(this.basepath, file)))
    );
  }

  public async convertFrom(eijiro: string) {
    const perline = new ReadlineTransform();
    this.converting = true;
    try {
      this.tempDir = "./data/temp";
      await mkdir(this.tempDir);
      this.indexes.clear();
      await pipeline(
        fs.createReadStream(eijiro),
        iconv.decodeStream("Shift_JIS"),
        perline,
        new PassThrough({ objectMode: true }).on("data", async (line) => this.addRow(line))
      );
      if (this.currentPrefix && this.currentDictionary && this.tempDir) {
        this.dumpDictionary();
      }
      this.dumpIndex();
      await this.replace();
    } finally {
      this.converting = false;
      if (this.tempDir) {
        await remove(this.tempDir);
      }
    }
  }

  private async replace() {
    this.checkConversion();
    if (!this.tempDir || !this.basepath) {
      throw new Error();
    }
    await remove(this.basepath);
    await rename(this.tempDir, this.basepath);
  }

  private dumpIndex() {
    this.checkConversion();
    if (!this.currentPrefix || !this.currentDictionary || !this.tempDir) {
      throw new Error();
    }
    const array: [string, string][] = [];
    Array.from(this.indexes.keys()).forEach((key) => {
      this.indexes.get(key)?.forEach((value) => array.push([key, value]));
    });
    fs.writeFileSync(path.join(this.tempDir, "_index.json"), JSON.stringify(array));
  }

  private prefix(word: string) {
    return word
      .slice(0, 2)
      .toLowerCase()
      .padEnd(2, "-")
      .replace(/[-,!.'"()*/&#%+=$ 0-9]/g, "-")
      .replace(/[^A-Za-z-]/g, "_");
  }

  private jsonPath(word: string) {
    const prefix = this.prefix(word);
    return `${path.join(this.basepath, prefix)}.json`;
  }

  private checkConversion() {
    if (!this.converting) {
      throw new Error("Illigal state: It is only available during conversion.");
    }
  }

  private currentDictionary?: Map<string, MeaningRow[]>;
  private currentPrefix?: string;
  private tempDir?: string;

  private async addRow(line: string) {
    this.checkConversion();
    line = line.slice(1);
    const index = line.indexOf(":");
    const wordPart = line.slice(0, index).trim();
    const meaningPart = line.slice(index + 1).trim();
    const { word, group, type } = this.parseWorkdPart(wordPart);
    const { text, tags, links, remarks, examples, additionals, linkFrom } = this.parseMeaningPart(meaningPart);

    const prefix = this.prefix(word);
    if (this.currentPrefix !== prefix) {
      if (this.currentPrefix && this.currentDictionary && this.tempDir) {
        this.dumpDictionary();
      }
      this.currentDictionary = new Map();
      this.currentPrefix = prefix;
    }
    const meanings = this.getHolder(word);
    meanings.push({ text, type, group, links, tags, examples, remarks, additionals });
    linkFrom.forEach((item) => this.pushIndex(item, word));
    const lower = word.toLowerCase();
    if (lower !== word) {
      this.pushIndex(lower, word);
    }
  }

  private getHolder(word: string) {
    this.checkConversion();
    if (!this.currentDictionary) {
      throw new Error();
    }
    let meanings = this.currentDictionary.get(word);
    if (!meanings) {
      meanings = [];
      this.currentDictionary.set(word, meanings);
    }
    return meanings;
  }

  private dumpDictionary() {
    this.checkConversion();
    if (!this.currentPrefix || !this.currentDictionary || !this.tempDir) {
      throw new Error();
    }
    fs.writeFileSync(
      `${path.join(this.tempDir, this.currentPrefix)}.json`,
      JSON.stringify(Array.from(this.currentDictionary.entries()))
    );
  }

  private parseWorkdPart(wordPart: string) {
    this.checkConversion();
    return extract(/^(?<word>[^{]+)(\{\{?(?<group>\d*)-?(?<type>[^}]*?)(-\d+)?\}?\})?/, wordPart);
  }

  private parseMeaningPart(meaningPart: string) {
    this.checkConversion();
    const { text, otherParts } = this.extractMeaning(meaningPart);
    const tags = this.extractTags(text);
    const links = this.extractLinks(text);
    const { remarks, examples, additionals } = this.extractOther(otherParts);
    const linkFrom: string[] = this.extractLinkFrom(additionals);
    return { text, tags, links, remarks, examples, additionals, linkFrom };
  }

  private extractMeaning(meaningPart: string) {
    this.checkConversion();
    return extract(/^(?<text>[^■◆【]*)(?<otherParts>.*)/, meaningPart);
  }

  private extractOther(other: string) {
    this.checkConversion();
    const extracted = extractRepeat(
      /(?:◆(?<remarks>[^■◆【]+)|■・(?<examples>[^■◆【]+)|◆?(?<additionals>【[^■◆【]+))?/g,
      other
    );
    const result: { remarks: string[]; examples: string[]; additionals: Additional[] } = {
      remarks: extracted.remarks,
      examples: extracted.examples,
      additionals: [],
    };
    extracted.additionals?.forEach((additional: string) => {
      const { type, value } = extract(/【(?<type>[^】]+)】(?<value>.*?)、?$/, additional);
      if (type) result.additionals.push({ type, value });
    });
    return result;
  }

  private extractTags(meaning: string) {
    this.checkConversion();
    const result = extractRepeat(/(〈(?<tag>[^〉]+?)〉|《(?<label>[^》]+?)》)/g, meaning);
    return (result.tag || []).concat(result.label || []);
  }

  private extractLinks(meaning: string) {
    this.checkConversion();
    return extractRepeat(/＝?<?→(?<link>[^>、＝<→■◆【]+)>?/g, meaning).link;
  }

  private extractLinkFrom(additionals: Additional[]): string[] {
    this.checkConversion();
    return additionals.reduce<string[]>((array, item) => {
      if (item.type === "変化") {
        item.value.split("、").forEach((parts) => {
          const { value } = extract(/(〈[^〉]+?〉|《[^》]+?》)+(?<value>.*)/, parts);
          value
            .split("|")
            .map((v) => v.trim())
            .forEach((v) => array.push(v));
        });
      } else if (item.type === "略" || item.type === "女性形") {
        item.value
          .split(";")
          .map((v) => v.trim())
          .forEach((v) => array.push(v));
      }
      return array;
    }, []);
  }

  pushIndex(from: string, to: string) {
    let array = this.indexes.get(from);
    if (!array) {
      array = [];
      this.indexes.set(from, array);
    }
    if (!array.includes(to)) {
      array.push(to);
    }
  }
}
