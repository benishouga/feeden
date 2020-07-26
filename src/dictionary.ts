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

const parseWorkdPart = (wordPart: string) => {
  const match = /^(?<word>[^{]+)(\{\{?(?<group>\d*)-?(?<type>[^}]*?)(-\d+)?\}?\})?/.exec(wordPart);
  if (match?.groups) {
    const { word, group = "", type = "" } = match.groups;
    return { word: word.trim(), group, type };
  }
  throw new Error("Failed to parse the word-part. " + wordPart);
};

const extractMeaning = (meaningPart: string) => {
  const match = /^(?<text>[^■◆【]*)(?<otherParts>.*)/.exec(meaningPart);
  if (match?.groups) {
    return match.groups;
  }
  return {};
};

const extractOther = (other: string) => {
  const results: { remarks: string[]; examples: string[]; additionals: Additional[] } = {
    remarks: [],
    examples: [],
    additionals: [],
  };
  const reg = /(?:◆(?<remark>[^■◆【]+)|■・(?<example>[^■◆【]+)|◆?(?<additional>【[^■◆【]+))?/g;
  let match;
  while ((match = reg.exec(other))) {
    if (!match[0]) {
      break;
    }
    if (!match.groups) {
      continue;
    }
    const { remark, example, additional } = match.groups;
    remark && results.remarks.push(remark);
    example && results.examples.push(example);
    if (additional) {
      const match = /【(?<type>[^】]+)】(?<value>.+?)、?$/.exec(additional);
      if (match?.groups) {
        const { type, value } = match?.groups;
        results.additionals.push({ type, value });
      }
    }
  }
  return results;
};

const extractTags = (meaning: string) => {
  const tags: string[] = [];
  const reg = /(〈(?<tag>[^〉]+?)〉|《(?<label>[^》]+?)》)/g;
  let match;
  while ((match = reg.exec(meaning))) {
    if (!match[0]) {
      break;
    }
    if (!match.groups) {
      continue;
    }
    const { tag, label } = match.groups;
    tags.push(tag || label);
  }
  return tags;
};

const extractLinks = (meaning: string) => {
  const links: string[] = [];
  const reg = /＝?<?→(?<link>[^>、＝<→■◆【]+)>?/g;
  let match;
  while ((match = reg.exec(meaning))) {
    if (!match[0]) {
      break;
    }
    if (!match.groups) {
      continue;
    }
    const { link } = match.groups;
    links.push(link);
  }
  return links;
};

const parseMeaningPart = (meaningPart: string) => {
  const { text, otherParts } = extractMeaning(meaningPart);
  const tags = extractTags(text);
  const links = extractLinks(text);
  const { remarks, examples, additionals } = extractOther(otherParts);
  return { text, tags, links, remarks, examples, additionals };
};

const getHolder = (word: string) => {
  let meanings = dictionary.get(word);
  if (!meanings) {
    meanings = [];
    dictionary.set(word, meanings);
  }
  return meanings;
};

export const addRow = (row: string) => {
  row = row.slice(1);
  const index = row.indexOf(":");
  const wordPart = row.slice(0, index).trim();
  const meaningPart = row.slice(index + 1).trim();
  const { word, group, type } = parseWorkdPart(wordPart);

  if (word) {
    const { text, tags, links, remarks, examples, additionals } = parseMeaningPart(meaningPart);
    const meanings = getHolder(word);
    meanings.push({ text, type, group, links, tags, examples, remarks, additionals });
    pushIndex(word, word);
    additionals.forEach((item) => {
      if (item.type === "変化") {
        item.value.split("、").forEach((parts) => {
          const match = /(〈[^〉]+?〉|《[^》]+?》)+(?<value>.*)/.exec(parts);
          if (match?.groups) {
            const { value } = match.groups;
            value
              .split("|")
              .map((v) => v.trim())
              .forEach((v) => pushIndex(v, word));
          }
        });
      } else if (item.type === "略" || item.type === "女性形") {
        item.value
          .split(";")
          .map((v) => v.trim())
          .forEach((v) => pushIndex(v, word));
      }
    });
  }
};

const pushIndex = (from: string, to: string) => {
  let array = indexes.get(from);
  if (!array) {
    array = new Set();
    indexes.set(from, array);
  }
  array.add(to);
};

export const show = () => {
  dictionary.forEach((group, word) => {
    group.forEach((a) => {
      console.log(word, a);
    });
  });
  indexes.forEach((words, key) => console.log(key, "→ ", words));
};
