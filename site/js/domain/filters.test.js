import assert from "node:assert/strict";
import test from "node:test";

import {
  formatFilterSummary,
  formatWeeklyChallengeFilterSummary,
  getFilterGroupLabel,
  summarizeFilterSelection
} from "./filters.js";

test("formatWeeklyChallengeFilterSummary uses shared group labels", () => {
  assert.equal(
    formatWeeklyChallengeFilterSummary({
      group: "type",
      themeLabel: "Weekly Electric",
      readinessLabel: "Filters locked"
    }),
    "Weekly Challenge: Weekly Electric - Group: Type - Filters locked"
  );
});

test("formatFilterSummary preserves the standard summary format", () => {
  assert.equal(
    formatFilterSummary({
      group: "generation",
      generationSummary: "All",
      typeSummary: "Fire"
    }),
    "Group: Generations - Generations: All - Types: Fire"
  );
});

test("summarizeFilterSelection returns All for empty selections", () => {
  assert.equal(summarizeFilterSelection([], (value) => value), "All");
  assert.equal(getFilterGroupLabel("none"), "None");
});
