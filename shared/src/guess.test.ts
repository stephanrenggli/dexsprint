import assert from "node:assert/strict";
import test from "node:test";
import { buildGuessIndex, findExactGuess } from "./guess.js";
import { normalizeGuess, normalizeName } from "./text.js";

test("normalizeGuess handles casing, punctuation, diacritics, and gender symbols", () => {
  assert.equal(normalizeGuess("Flabébé"), "flabebe");
  assert.equal(normalizeGuess("Nidoran♀"), "nidoranf");
  assert.equal(normalizeGuess("Mr. Mime"), "mrmime");
});

test("normalizeName preserves canonical Pokemon name forms", () => {
  assert.equal(normalizeName("Ho-Oh"), "ho-oh");
  assert.equal(normalizeName("Mr. Mime"), "mr-mime");
  assert.equal(normalizeName("Nidoran♀"), "nidoran-f");
  assert.equal(normalizeName("Nidoran♂"), "nidoran-m");
});

test("findExactGuess matches canonical labels and localized guesses", () => {
  const index = buildGuessIndex([
    {
      canonical: "bulbasaur",
      label: "Bulbasaur",
      guesses: ["Bisasam", "Bulbizarre"]
    }
  ]);

  assert.equal(findExactGuess(index, "bulbasaur"), "bulbasaur");
  assert.equal(findExactGuess(index, "Bisasam"), "bulbasaur");
  assert.equal(findExactGuess(index, "missingno"), null);
});
