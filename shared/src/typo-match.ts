import type { GuessEntry } from "./guess.js";
import { normalizeGuess } from "./text.js";

function levenshteinWithin(a: string, b: string, max: number): number {
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

export function getMaxTypoDistance(normalized: string, typoMode?: string, defaultTypoMode?: string): number {
  const mode = typoMode || defaultTypoMode;
  if (mode === "strict") return 0;
  if (mode === "forgiving") {
    if (normalized.length <= 4) return 1;
    if (normalized.length <= 8) return 2;
    return 3;
  }
  return normalized.length <= 6 ? 1 : 2;
}

function getCandidateGuesses(entry: GuessEntry): string[] {
  return [entry.label, ...entry.guesses]
    .map((guess) => normalizeGuess(guess))
    .filter((guess): guess is string => Boolean(guess));
}

export function findTypoMatch(
  entries: Iterable<GuessEntry>,
  normalized: string,
  typoMode?: string,
  defaultTypoMode?: string
): string | null {
  if (!normalized) return null;
  if (normalized.length < 4) return null;
  const maxDist = getMaxTypoDistance(normalized, typoMode, defaultTypoMode);
  if (maxDist <= 0) return null;

  let bestCanonical: string | null = null;
  let bestDist = maxDist + 1;
  let bestCount = 0;

  for (const entry of entries) {
    let entryBestDist = maxDist + 1;
    for (const candidate of getCandidateGuesses(entry)) {
      if (Math.abs(candidate.length - normalized.length) > maxDist) continue;
      const dist = levenshteinWithin(normalized, candidate, maxDist);
      if (dist > maxDist) continue;
      if (dist < entryBestDist) {
        entryBestDist = dist;
      }
    }

    if (entryBestDist > maxDist) continue;
    if (entryBestDist < bestDist) {
      bestCanonical = entry.canonical;
      bestDist = entryBestDist;
      bestCount = 1;
    } else if (entryBestDist === bestDist && entry.canonical !== bestCanonical) {
      bestCount += 1;
    }
  }

  if (bestCanonical && bestCount === 1) return bestCanonical;
  return null;
}

export { levenshteinWithin };
