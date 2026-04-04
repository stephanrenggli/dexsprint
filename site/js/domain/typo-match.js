function levenshteinWithin(a, b, max) {
  const alen = a.length;
  const blen = b.length;
  if (Math.abs(alen - blen) > max) return max + 1;
  const row = new Array(blen + 1).fill(0);
  for (let j = 0; j <= blen; j += 1) row[j] = j;
  for (let i = 1; i <= alen; i += 1) {
    let prev = i - 1;
    row[0] = i;
    let minInRow = row[0];
    for (let j = 1; j <= blen; j += 1) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = temp;
      if (row[j] < minInRow) minInRow = row[j];
    }
    if (minInRow > max) return max + 1;
  }
  return row[blen];
}

function getMaxTypoDistance(normalized, typoMode, defaultTypoMode) {
  const mode = typoMode || defaultTypoMode;
  if (mode === "strict") return 0;
  if (mode === "forgiving") {
    if (normalized.length <= 4) return 1;
    if (normalized.length <= 8) return 2;
    return 3;
  }
  return normalized.length <= 6 ? 1 : 2;
}

function addPrefixes(state, value) {
  if (value.length < 3) return;
  for (let i = 2; i < value.length; i += 1) {
    state.guessPrefixes.add(value.slice(0, i));
  }
}

export function buildGuessIndex(state, normalizeGuess, prettifyName) {
  state.guessIndex.clear();
  state.guessByLength.clear();
  state.guessPrefixes.clear();
  const registerGuess = (guess, canonical) => {
    if (!guess) return;
    const isNewGuess = !state.guessIndex.has(guess);
    state.guessIndex.set(guess, canonical);
    if (isNewGuess) {
      addPrefixes(state, guess);
      if (!state.guessByLength.has(guess.length)) {
        state.guessByLength.set(guess.length, []);
      }
      state.guessByLength.get(guess.length).push(guess);
    }
  };
  state.names.forEach((canonical) => {
    const labels = state.namesByLang.get(canonical);
    const entry = state.meta.get(canonical);
    const defaultLabel = entry ? entry.label : prettifyName(canonical);
    const localizedLabels = [
      labels && labels.get("en") ? labels.get("en") : defaultLabel,
      labels && labels.get("de") ? labels.get("de") : null,
      labels && labels.get("es") ? labels.get("es") : null
    ];

    localizedLabels.forEach((label) => {
      const guess = normalizeGuess(label);
      registerGuess(guess, canonical);
    });

    const fallbackGuess = normalizeGuess(defaultLabel);
    registerGuess(fallbackGuess, canonical);
  });
}

function getTypoCandidates(state, normalized, maxDist) {
  if (!state.guessByLength.size) {
    return state.guessIndex.keys();
  }
  const candidates = [];
  for (let len = normalized.length - maxDist; len <= normalized.length + maxDist; len += 1) {
    const guesses = state.guessByLength.get(len);
    if (!guesses) continue;
    guesses.forEach((guess) => candidates.push(guess));
  }
  return candidates;
}

export function findTypoMatch(state, normalized, typoMode, defaultTypoMode) {
  if (!normalized) return null;
  if (state.guessPrefixes.has(normalized)) return null;
  if (normalized.length < 4) return null;
  const maxDist = getMaxTypoDistance(normalized, typoMode, defaultTypoMode);
  if (maxDist <= 0) return null;
  let bestCanonical = null;
  let bestDist = maxDist + 1;
  let bestCount = 0;
  for (const candidate of getTypoCandidates(state, normalized, maxDist)) {
    if (Math.abs(candidate.length - normalized.length) > maxDist) continue;
    const dist = levenshteinWithin(normalized, candidate, maxDist);
    if (dist > maxDist) continue;
    const canonical = state.guessIndex.get(candidate);
    if (dist < bestDist) {
      bestDist = dist;
      bestCanonical = canonical;
      bestCount = 1;
    } else if (dist === bestDist && canonical !== bestCanonical) {
      bestCount += 1;
    }
  }
  if (bestCanonical && bestCount === 1) return bestCanonical;
  return null;
}

export { levenshteinWithin, getMaxTypoDistance, getTypoCandidates };
