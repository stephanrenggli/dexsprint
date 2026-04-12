import { normalizeGuess } from "./text.js";

export interface GuessEntry {
  canonical: string;
  label: string;
  guesses: string[];
}

export interface GuessIndex {
  exact: Map<string, string>;
  entries: Map<string, GuessEntry>;
}

export function buildGuessIndex(entries: GuessEntry[]): GuessIndex {
  const exact = new Map<string, string>();
  const byCanonical = new Map<string, GuessEntry>();

  entries.forEach((entry) => {
    byCanonical.set(entry.canonical, entry);
    [entry.label, ...entry.guesses].forEach((guess) => {
      const normalized = normalizeGuess(guess);
      if (normalized) exact.set(normalized, entry.canonical);
    });
  });

  return { exact, entries: byCanonical };
}

export function findExactGuess(index: GuessIndex, value: string): string | null {
  const normalized = normalizeGuess(value);
  if (!normalized) return null;
  return index.exact.get(normalized) || null;
}
