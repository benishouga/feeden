import { MeaningRow, Dictionary } from "./dictionary";

// TODO 後で dictionary の内容含めで整理する

export function createResult(dic: Dictionary, indexedWord: string, meaningRows: MeaningRow[]): Word {
  const meanings: Meaning[] = meaningRows.map((row) => {
    const links = row.links?.map((link) => createResult(dic, link, dic.lookupCorrectly(link) || []));
    return { ...row, links };
  });
  const groups = groupBy(meanings);
  const meta = extractMeta(groups[""]);
  const result = {
    meta,
    indexedWord,
    meanings,
    groups: Object.keys(groups)
      .filter((key) => key) // exclude groups[""]
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => ({
        meta: extractMeta(groups[key]) || meta,
        meanings: groups[key],
      })),
  };
  // 共通の Meta がない場合 Group の Meta を使う
  result.meta = meta || result.groups.find((g) => g.meta)?.meta;
  return result;
}

function groupBy(meanings: Meaning[]) {
  return meanings.reduce<{ [key: string]: Meaning[] }>((r, m, i) => {
    const group = m.group || "";
    (r[group] = r[group] || []).push(meanings[i]);
    return r;
  }, {});
}

function extractMeta(meanings?: Meaning[]): Meta | undefined {
  const levelValue = meanings?.find((m) => !m.text)?.additionals?.find((a) => a.type === "レベル")?.value;
  const level = levelValue ? Number(levelValue) : undefined;
  if (!level) {
    return undefined;
  }
  return { level };
}

export type Word = {
  indexedWord: string;
  meta?: Meta;
  meanings: Meaning[];
  groups: MeaningGroup[];
};

type MeaningGroup = {
  meta?: Meta;
  meanings: Meaning[];
};

type Meta = {
  level?: number;
};

type Meaning = {
  group?: string;
  type?: string;
  text?: string;
  tags?: string[];
  remarks?: string[];
  examples?: Example[];
  additionals?: Additional[];
  links?: Word[];
};

type Example = {
  en: string;
  ja: string;
};

type Additional = {
  type: string;
  value: string;
};
