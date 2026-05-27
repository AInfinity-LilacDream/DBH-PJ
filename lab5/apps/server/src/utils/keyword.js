function normalizeKeyword(keyWord) {
  return typeof keyWord === "string" ? keyWord.trim() : "";
}

function createKeywordPattern(keyWord) {
  const normalized = normalizeKeyword(keyWord);
  return normalized ? `%${normalized}%` : null;
}

export { normalizeKeyword, createKeywordPattern };
