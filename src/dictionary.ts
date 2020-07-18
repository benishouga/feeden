interface Index {
  [key: string]: string;
}

interface Dictionary {
  [key: string]: Word;
}

interface Word {
  level: number;
  meanings: Meaning[];
}

interface Meaning {
  meaning: string[];
  type?: PartOfSpeech;
  synonym?: string;
  example?: {
    en: string;
    ja: string;
  };
  conjugation: {
    presentParticiple?: string;
    pastTense?: string;
    pastParticiple?: string;
    thirdPerson?: string;
    plural?: string;
    comparative?: string;
    superlative?: string;
  };
}

type PartOfSpeech =
  | "名詞"
  | "代詞"
  | "形詞"
  | "動詞"
  | "他動詞"
  | "自動詞"
  | "助詞"
  | "句動詞"
  | "副詞"
  | "接詞"
  | "間詞"
  | "前詞"
  | "略"
  | "組織";

const partOfSpeechSet = new Set<string>();
export const addRow = (row: string) => {
  row = row.slice(1);
  // console.log(row);
  const [wordPart, meaning] = row.split(":", 1);
  const [_, word, type, numOnly] =
    /^(.*?)(?:\{(?:[0-9]+-)?(.*?)(?:-[0-9]+)?\})?(\{\d+\})?$/.exec(
      wordPart.trim()
    ) || [];
  // console.log(`part: ${wordPart}, word: ${word}, type: ${type}`);
  partOfSpeechSet.add(type);
};

export const showPartOfSpeechSet = () => {
  console.log(partOfSpeechSet);
};
