import { BADGES } from "./app-state.js";

export function getCompletedGroupEntries(state, indexMap) {
  const complete = [];
  indexMap.forEach((nameSet, key) => {
    if (!nameSet || nameSet.size === 0) return;
    let done = true;
    nameSet.forEach((name) => {
      if (!state.found.has(name)) done = false;
    });
    if (done) complete.push(key);
  });
  return complete;
}

export function getProgressMilestoneEntries(total) {
  if (!Number.isFinite(total) || total <= 0) return [];
  const fractions = [0.25, 0.5, 0.75];
  const entries = fractions
    .map((fraction) => {
      const percent = Math.round(fraction * 100);
      const count = Math.ceil(total * fraction);
      return { fraction, percent, count };
    })
    .filter((entry) => entry.count > 0 && entry.count < total);

  const seenCounts = new Set();
  return entries.filter((entry) => {
    if (seenCounts.has(entry.count)) return false;
    seenCounts.add(entry.count);
    return true;
  });
}

export function getBadgeContext(state) {
  return {
    totalCount: state.allNames.length,
    foundCount: state.found.size,
    completedGenerations: getCompletedGroupEntries(state, state.generationIndex),
    completedTypes: getCompletedGroupEntries(state, state.typeIndex),
    badges: BADGES
  };
}

export function getProgressUnlockContext(state) {
  return {
    completedGenerations: getCompletedGroupEntries(state, state.generationIndex),
    completedTypes: getCompletedGroupEntries(state, state.typeIndex)
  };
}
