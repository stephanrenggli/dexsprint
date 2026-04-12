import { setCheckboxGroupDisabled } from "../ui/dom.js";

export function createWeeklyChallengeController({
  state,
  genFilter,
  typeFilter,
  filtersPanelToggle,
  setFiltersPanelExpanded,
  inputEl,
  setInputStatus,
  clearInputStatus,
  formatGenerationLabel,
  generationOrder,
  prettifyName,
  getGameMode,
  defaultInputPlaceholder
}) {
  const weeklyChallengeMs = 604800000;

  function getWeeklyChallengeWeekIndex() {
    if (Number.isInteger(state.weeklyChallengeWeekOverride) && state.weeklyChallengeWeekOverride >= 0) {
      return state.weeklyChallengeWeekOverride;
    }
    return Math.floor(Date.now() / weeklyChallengeMs);
  }

  function getWeeklyGenerationLabel(slug) {
    return formatGenerationLabel(slug).replace(/\s*\(Gen [^)]+\)$/, "");
  }

  function refreshWeeklyChallengeCatalog() {
    const catalog = [];
    [...state.generationIndex.keys()]
      .slice()
      .sort((a, b) => generationOrder(a) - generationOrder(b))
      .forEach((slug) => {
        const label = getWeeklyGenerationLabel(slug);
        catalog.push({
          id: `generation:${slug}`,
          label: `${label} Only`,
          requiresLegendaryData: false,
          resolveNames: () => [...(state.generationIndex.get(slug) || [])]
        });
      });

    [...state.typeIndex.keys()]
      .slice()
      .sort((a, b) => prettifyName(a).localeCompare(prettifyName(b)))
      .forEach((type) => {
        const label = prettifyName(type);
        catalog.push({
          id: `type:${type}`,
          label: `${label} Only`,
          requiresLegendaryData: false,
          resolveNames: () => [...(state.typeIndex.get(type) || [])]
        });
      });

    catalog.push({
      id: "legendary",
      label: "Legendary Pokemon Only",
      requiresLegendaryData: true,
      resolveNames: () => [...(state.legendaryIndex || new Set())]
    });
    state.weeklyChallengeCatalog = catalog;
    state.weeklyChallengeCatalogReady = true;
  }

  function getWeeklyChallengeTheme() {
    const catalog = state.weeklyChallengeCatalogReady ? state.weeklyChallengeCatalog : [];
    if (!catalog.length) return null;
    return catalog[getWeeklyChallengeWeekIndex() % catalog.length];
  }

  function isWeeklyChallengeReady(theme = getWeeklyChallengeTheme()) {
    if (!state.weeklyChallengeCatalogReady) return false;
    if (!theme) return false;
    if (!state.groupMetadataReady) return false;
    if (theme.requiresLegendaryData && !state.legendaryIndexReady) return false;
    return true;
  }

  function getWeeklyChallengeNames(theme = getWeeklyChallengeTheme()) {
    if (!theme) return [];
    return theme.resolveNames ? theme.resolveNames() : [];
  }

  function setWeeklyChallengeFilterLock(locked) {
    [genFilter, typeFilter].forEach((container) => {
      if (!container) return;
      setCheckboxGroupDisabled(container.querySelectorAll("input[type='checkbox']"), locked, container);
    });
    if (filtersPanelToggle) {
      filtersPanelToggle.disabled = locked;
      filtersPanelToggle.setAttribute("aria-disabled", locked ? "true" : "false");
    }
  }

  function syncWeeklyChallengeState() {
    const locked = getGameMode() === "weekly";
    setWeeklyChallengeFilterLock(locked);
    if (locked) {
      setFiltersPanelExpanded(false, { persist: false });
    } else if (filtersPanelToggle) {
      filtersPanelToggle.disabled = false;
      filtersPanelToggle.removeAttribute("aria-disabled");
    }
    if (inputEl) {
      const theme = locked ? getWeeklyChallengeTheme() : null;
      const loading = locked && !isWeeklyChallengeReady(theme);
      inputEl.disabled = loading;
      if (loading) {
        setInputStatus("Loading weekly challenge theme...");
      } else {
        inputEl.placeholder = defaultInputPlaceholder;
        clearInputStatus?.();
      }
    }
  }

  return {
    refreshWeeklyChallengeCatalog,
    getWeeklyChallengeTheme,
    isWeeklyChallengeReady,
    getWeeklyChallengeNames,
    setWeeklyChallengeFilterLock,
    syncWeeklyChallengeState
  };
}
