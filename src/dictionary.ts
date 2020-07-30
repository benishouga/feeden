import { extract, extractRepeat } from "./regexp-util";

export type Index = Map<string, Set<string>>;
export type Dictionary = Map<string, Meaning[]>;

export interface Meaning {
  group?: string;
  type?: string;
  text?: string;
  tags?: string[];
  remarks?: string[];
  examples?: string[];
  additionals?: Additional[];
  links?: string[];
}

export interface Additional {
  type: string;
  value: string;
}

const dictionary: Dictionary = new Map();
const indexes: Index = new Map();

function parseWorkdPart(wordPart: string) {
  return extract(/^(?<word>[^{]+)(\{\{?(?<group>\d*)-?(?<type>[^}]*?)(-\d+)?\}?\})?/, wordPart);
}

function extractMeaning(meaningPart: string) {
  return extract(/^(?<text>[^■◆【]*)(?<otherParts>.*)/, meaningPart);
}

function extractOther(other: string) {
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
    const { type, value } = extract(/【(?<type>[^】]+)】(?<value>.+?)、?$/, additional);
    if (type) result.additionals.push({ type, value });
  });
  return result;
}

function extractTags(meaning: string) {
  const result = extractRepeat(/(〈(?<tag>[^〉]+?)〉|《(?<label>[^》]+?)》)/g, meaning);
  return (result.tag || []).concat(result.label || []);
}

function extractLinks(meaning: string) {
  return extractRepeat(/＝?<?→(?<link>[^>、＝<→■◆【]+)>?/g, meaning).link;
}

function extractLinkFrom(additionals: Additional[]): string[] {
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

function parseMeaningPart(meaningPart: string) {
  const { text, otherParts } = extractMeaning(meaningPart);
  const tags = extractTags(text);
  const links = extractLinks(text);
  const { remarks, examples, additionals } = extractOther(otherParts);
  const linkFrom: string[] = extractLinkFrom(additionals);
  return { text, tags, links, remarks, examples, additionals, linkFrom };
}

function getHolder(word: string) {
  let meanings = dictionary.get(word);
  if (!meanings) {
    meanings = [];
    dictionary.set(word, meanings);
  }
  return meanings;
}

export function addRow(row: string) {
  row = row.slice(1);
  const index = row.indexOf(":");
  const wordPart = row.slice(0, index).trim();
  const meaningPart = row.slice(index + 1).trim();
  const { word, group, type } = parseWorkdPart(wordPart);
  const { text, tags, links, remarks, examples, additionals, linkFrom } = parseMeaningPart(meaningPart);
  const meanings = getHolder(word);
  meanings.push({ text, type, group, links, tags, examples, remarks, additionals });
  pushIndex(word, word);
  linkFrom.forEach((item) => pushIndex(item, word));
}

const pushIndex = (from: string, to: string) => {
  let array = indexes.get(from);
  if (!array) {
    array = new Set();
    indexes.set(from, array);
  }
  array.add(to);
};

export function getDictionary() {
  return dictionary;
}

export function getIndexes() {
  return indexes;
}

export function show() {
  dictionary.forEach((group, word) => {
    group.forEach((a) => {
      console.log(word, a);
    });
  });
  indexes.forEach((words, key) => console.log(key, "→ ", words));
}
