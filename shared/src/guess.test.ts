import assert from "node:assert/strict";
import test from "node:test";
import { buildGuessIndex, findExactGuess } from "./guess.js";
import { normalizeGuess } from "./text.js";

test("normalizeGuess handles casing, punctuation, diacritics, and gender symbols", () => {
  assert.equal(normalizeGuess("Flabébé"), "flabebe");
  assert.equal(normalizeGuess("Nidoran♀"), "nidoranf");
  assert.equal(normalizeGuess("Mr. Mime"), "mrmime");
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
