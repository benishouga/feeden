import fs, { readFileSync } from "fs";
import fsextra from "fs-extra";
import path from "path";
import { PassThrough, pipeline as orgPipeline } from "stream";
import { promisify } from "util";
import * as iconv from "iconv-lite";
import ReadlineTransform from "readline-transform";

import { extract, extractRepeat } from "./regexp-util";
import { Word, createResult } from "./lookup-result";
import { TEMPPATH } from "../config";

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
  examples?: Example[];
  additionals?: Additional[];
  links?: string[];
};

export type Example = {
  en: string;
  ja: string;
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

  public async preload() {
    const list = await readdir(this.basepath);
    return Promise.all(
      list
        .filter((file) => file !== "_index.json")
        .map(async (file) => {
          const filePath = path.join(this.basepath, file);
          const text = await readFile(filePath, "utf-8");
          (JSON.parse(text) as any).forEach(([key, value]: any) => this.cache.set(key, value));
          this.loadedSet.add(filePath);
        })
    );
  }

  public lookup(word: string): Word[] {
    let result: Word[] = [];
    const originalResults = this.lookupCorrectly(word);
    if (originalResults) {
      result.push(createResult(this, word, originalResults));
    }
    const lower = word.toLowerCase();
    if (word !== lower) {
      const lowerResults = this.lookupCorrectly(lower);
      if (lowerResults) {
        result.push(createResult(this, lower, lowerResults));
      }
    }
    const relativeWords = (this.indexes.get(lower) || []).filter(
      (relativeWord) => relativeWord !== word && relativeWord !== lower
    );
    const relativesResults = relativeWords.map((word) => {
      const results = this.lookupCorrectly(word);
      if (!results) {
        throw new Error("The data is corrupted.");
      }
      return createResult(this, word, results);
    });
    return result.concat(relativesResults);
  }

  public lookupCorrectly(word: string): MeaningRow[] | undefined {
    return this.cache.get(word);
  }

  public async convertFrom(eijiro: string) {
    if (this.converting) new Error("It's already in process.");
    this.converting = true;
    try {
      this.tempDir = TEMPPATH;
      await mkdir(this.tempDir);
      this.indexes.clear();
      const perline = new ReadlineTransform();
      await pipeline(
        fs.createReadStream(eijiro),
        iconv.decodeStream("Shift_JIS"),
        perline,
        new PassThrough({ objectMode: true }).on("data", async (line) => this.addRow(line))
      );
      if (this.currentPrefix && this.currentDictionary && this.tempDir) {
        this.saveDictionaryToTemp();
      }
      this.saveIndexesToTemp();
      await this.replaceFiles();
    } finally {
      this.converting = false;
      if (this.tempDir) {
        await remove(this.tempDir);
      }
    }
  }

  private async replaceFiles() {
    this.checkConversion();
    if (!this.tempDir || !this.basepath) {
      throw new Error();
    }
    await remove(this.basepath);
    await rename(this.tempDir, this.basepath);
  }

  private saveIndexesToTemp() {
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

  private getWordFilePrefix(word: string) {
    return word
      .slice(0, 2)
      .toLowerCase()
      .padEnd(2, "-")
      .replace(/[-,!.'"()*/&#%+=$ 0-9]/g, "-")
      .replace(/[^A-Za-z-]/g, "_");
  }

  private getWordFilePath(word: string) {
    const prefix = this.getWordFilePrefix(word);
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

    const prefix = this.getWordFilePrefix(word);
    if (this.currentPrefix !== prefix) {
      if (this.currentPrefix && this.currentDictionary && this.tempDir) {
        this.saveDictionaryToTemp();
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

  private saveDictionaryToTemp() {
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

  private extractExample(example: string) {
    this.checkConversion();
    const index = example.search(/(?=[^\x20-\x7E].*$)/);
    return {
      en: example.slice(0, index),
      ja: example.slice(index),
    };
  }

  private extractOther(other: string) {
    this.checkConversion();
    const extracted = extractRepeat(
      /(?:◆(?<remarks>[^■◆【]+)|■・(?<examples>[^■◆【]+)|◆?(?<additionals>【[^■◆【]+))?/g,
      other
    );
    const result: { remarks: string[]; examples: Example[]; additionals: Additional[] } = {
      remarks: extracted.remarks,
      examples: [],
      additionals: [],
    };

    extracted.examples?.forEach((example: string) => {
      result.examples.push(this.extractExample(example));
    });

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

  private pushIndex(from: string, to: string) {
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
