import assert from "node:assert/strict";
import test from "node:test";
import { buildGuessIndex, findExactGuess } from "./guess.js";
import { normalizeGuess, normalizeName } from "./text.js";

interface PokéApiSpeciesEntry {
  name?: string;
}

interface PokéApiSpeciesListResponse {
  results?: PokéApiSpeciesEntry[];
}

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
  assert.equal(normalizeName("Type: Null"), "type-null");
  assert.equal(normalizeName("Farfetch'd"), "farfetchd");
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

test("findExactGuess accepts the current PokéAPI species names and spaced variants", async (t) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    let response: Response;
    try {
      response = await fetch("https://pokeapi.co/api/v2/pokemon-species?limit=100000", {
        signal: controller.signal
      });
    } catch {
      t.skip("PokeAPI is unavailable in this environment.");
      return;
    }
    assert.equal(response.ok, true, `Expected PokéAPI species list to load, got ${response.status}`);

    const payload = (await response.json()) as PokéApiSpeciesListResponse;
    const species = Array.isArray(payload.results) ? payload.results : [];
    const normalized = new Map<string, string>();
    const index = buildGuessIndex(
      species.map((entry) => {
        const name = typeof entry.name === "string" ? entry.name : "";
        assert.ok(name, "Expected PokéAPI species entry to include a name");
        return {
          canonical: normalizeName(name),
          label: name.replace(/-/g, " "),
          guesses: []
        };
      })
    );

    species.forEach((entry) => {
      const name = typeof entry.name === "string" ? entry.name : "";
      const canonical = normalizeName(name);
      assert.ok(canonical, `Expected ${name} to normalize to a non-empty canonical name`);

      const previous = normalized.get(canonical);
      assert.equal(previous, undefined, `Duplicate canonical name for ${name} and ${previous}`);
      normalized.set(canonical, name);

      assert.equal(findExactGuess(index, name), canonical);
      assert.equal(findExactGuess(index, name.replace(/-/g, " ")), canonical);
    });
  } finally {
    clearTimeout(timeout);
  }
});
