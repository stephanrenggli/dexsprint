import assert from "node:assert/strict";
import test from "node:test";

import { fetchResourcesInBatches } from "./catalog-source.js";

test("fetchResourcesInBatches returns items and failure state separately", async () => {
  const calls = [];
  const pokedex = {
    resource: async (batch) => {
      calls.push(batch);
      if (batch.some((url) => url.includes("/fail/"))) {
        throw new Error("batch failed");
      }
      return batch.map((url) => ({ url }));
    }
  };

  const result = await fetchResourcesInBatches(
    pokedex,
    ["/ok/1", "/ok/2", "/fail/3", "/ok/4"],
    2
  );

  assert.deepEqual(calls, [
    ["/ok/1", "/ok/2"],
    ["/fail/3", "/ok/4"]
  ]);
  assert.equal(result.hadFailures, true);
  assert.deepEqual(result.items, [
    { url: "/ok/1" },
    { url: "/ok/2" }
  ]);
});
