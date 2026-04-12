import assert from "node:assert/strict";
import test from "node:test";

import { scheduleLocalizedNameHydration } from "./catalog-hydration.js";

test("scheduleLocalizedNameHydration warns on partial batch failures", async () => {
  const calls = [];
  const warnings = [];
  const completions = [];
  const state = {
    meta: new Map([
      [
        "bulbasaur",
        { label: "bulbasaur" }
      ]
    ]),
    namesByLang: new Map(),
    legendaryIndex: new Set(),
    legendaryIndexReady: false
  };
  const pokedex = {};
  const fetchResourcesInBatches = async (_pokedex, urls) => {
    calls.push(urls);
    return {
      items: [
        {
          name: "bulbasaur",
          names: [{ name: "Bulbasaur", language: { name: "en" } }],
          is_legendary: false
        }
      ],
      hadFailures: true
    };
  };

  const originalWindow = globalThis.window;
  globalThis.window = {
    setTimeout: (fn) => {
      fn();
      return 1;
    }
  };

  try {
    scheduleLocalizedNameHydration({
      state,
      pokedex,
      detailUrls: ["/api/v2/pokemon-species/1/"],
      fetchResourcesInBatches,
      onWarning: () => warnings.push("warning"),
      onComplete: () => completions.push("done")
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(calls, [["/api/v2/pokemon-species/1/"]]);
    assert.deepEqual(warnings, ["warning"]);
    assert.deepEqual(completions, ["done"]);
    assert.equal(state.meta.get("bulbasaur")?.label, "Bulbasaur");
    assert.equal(state.legendaryIndexReady, true);
  } finally {
    globalThis.window = originalWindow;
  }
});
