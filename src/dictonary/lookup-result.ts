import { MeaningRow } from "./dictionary";

export class LookupResult {
  public level?: number;
  constructor(public indexedWord: string, public meanings: MeaningRow[]) {
    const level = this.meanings.find((m) => !m.text)?.additionals?.find((a) => a.type === "レベル")?.value;
    if (level) {
      this.level = Number(level);
    }
  }
}
