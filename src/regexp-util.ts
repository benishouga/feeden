export function extract(reg: RegExp, text: string) {
  const result = reg.exec(text)?.groups;
  if (result) {
    Object.keys(result).forEach((key) => {
      if (result[key]) {
        result[key] = result[key].trim();
      }
    });
    return result;
  }
  throw new Error("Failed to extract: " + text);
}

export function extractRepeat(reg: RegExp, text: string) {
  if (!reg.global) {
    throw new Error("Invalid argument... exp.global is false");
  }
  const results: { [key: string]: string[] } = {};
  let match;
  while ((match = reg.exec(text))) {
    if (!match[0]) {
      break;
    }
    if (!match.groups) {
      continue;
    }
    const result = match.groups;
    Object.keys(result).forEach((key) => {
      if (result[key]) {
        let r = results[key];
        if (!r) results[key] = r = [];
        r.push(result[key]);
      }
    });
  }
  return results;
}
