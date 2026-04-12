import { DEFAULT_GAME_MODE, DEFAULT_TYPO_MODE } from "../core/app-state.js";
import { formatGenerationLabel, prettifyName } from "../domain/text.js";
import { summarizeFilterSelection } from "../domain/filters.js";

export function createSettingsController({
  state,
  localStorage,
  storageSettingsKey,
  legacyStorageSettingsKey,
  defaultTheme,
  themes,
  themeChooser,
  gameModeSelect,
  compactToggle,
  outlineToggle,
  filtersToggle,
  filtersToggleCompact,
  criesToggle,
  legacyCriesToggle,
  showDexToggle,
  shinyToggle,
  darkToggle,
  typoModeSelect,
  autocorrectToggle,
  filtersPanel,
  filtersPanelToggle,
  filterSummary,
  groupFilter,
  genFilter,
  typeFilter,
  setChipGroupSelections,
  getSelectedGenerations,
  getSelectedTypes,
  applyFilters,
  syncWeeklyChallengeState,
  syncProgressLinkPreview,
  updateThemeColorMeta,
  getSettingsPayload,
  getGameMode,
  getWeeklyChallengeTheme,
  requestConfirmation,
  isFiltersLocked = () => false
}) {
  function setFiltersPanelExpanded(expanded, { persist = true } = {}) {
    if (!filtersPanel || !filtersPanelToggle) return;
    const isExpanded = Boolean(expanded);
    filtersPanel.hidden = !isExpanded;
    filtersPanelToggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    filtersPanelToggle.textContent = isExpanded ? "Hide Filters" : "Edit Filters";
    if (persist) saveSettings();
  }

  function syncTypoSettings() {
    if (!typoModeSelect || !autocorrectToggle) return;
    const isStrict = typoModeSelect.value === "strict";
    const locked = isFiltersLocked();
    autocorrectToggle.disabled = locked || isStrict;
    autocorrectToggle
      .closest(".toggle")
      ?.classList.toggle("toggle--disabled", locked || isStrict);
  }

  function syncGameplaySettings() {
    const locked = isFiltersLocked();
    if (gameModeSelect) gameModeSelect.disabled = locked;
    if (groupFilter) groupFilter.disabled = locked;
    if (typoModeSelect) typoModeSelect.disabled = locked;
    syncTypoSettings();
  }

  function setTheme(themeId, persist = true) {
    const theme =
      themes.find((t) => t.id === themeId) ||
      themes.find((t) => t.id === defaultTheme) ||
      themes[0] ||
      { id: defaultTheme };
    document.documentElement.dataset.theme = theme.id;
    updateThemeColorMeta();
    if (themeChooser) {
      const chips = [...themeChooser.querySelectorAll(".theme-chip")];
      chips.forEach((chip) => {
        chip.classList.toggle("is-selected", chip.dataset.theme === theme.id);
      });
    }
    if (persist) saveSettings();
  }

  function syncSettingsState() {
    syncGameplaySettings();
    updateFilterSummary();
    syncWeeklyChallengeState();
    syncProgressLinkPreview();
  }

  function initThemes() {
    if (!themeChooser) return;
    themeChooser.innerHTML = "";
    themes.forEach((theme) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "theme-chip";
      chip.dataset.theme = theme.id;
      const swatch = document.createElement("span");
      swatch.className = "theme-swatch";
      const text = document.createElement("span");
      text.textContent = theme.name;
      chip.appendChild(swatch);
      chip.appendChild(text);
      chip.addEventListener("click", () => setTheme(theme.id));
      themeChooser.appendChild(chip);
    });
    setTheme(defaultTheme, false);
  }

  function updateFilterSummary() {
    if (!filterSummary) return;
    const groupMap = { none: "None", generation: "Generations", type: "Type" };
    const groupLabel = groupMap[groupFilter ? groupFilter.value : "generation"] || "Generation";
    if (getGameMode() === "weekly") {
      const theme = getWeeklyChallengeTheme ? getWeeklyChallengeTheme() : null;
      const themeLabel = theme ? theme.label : "Weekly Challenge";
      const readinessLabel = state.weeklyChallengeCatalogReady
        ? "Filters locked"
        : "Loading challenge data";
      filterSummary.textContent = `Weekly Challenge: ${themeLabel} - Group: ${groupLabel} - ${readinessLabel}`;
      return;
    }
    const generationSummary = summarizeFilterSelection(
      getSelectedGenerations(),
      (gen) => formatGenerationLabel(gen)
    );
    const typeSummary = summarizeFilterSelection(
      getSelectedTypes(),
      (type) => prettifyName(type)
    );
    filterSummary.textContent = `Group: ${groupLabel} - Generations: ${generationSummary} - Types: ${typeSummary}`;
  }

  function applySettingsPayload(data, { persist = true } = {}) {
    if (!data || typeof data !== "object") return;

    if (gameModeSelect) {
      const requestedMode = data.gameMode ?? data.practiceMode;
      const normalizedMode = requestedMode === "study" ? "practice" : requestedMode;
      const allowedModes = new Set([DEFAULT_GAME_MODE, "practice", "weekly"]);
      gameModeSelect.value = allowedModes.has(normalizedMode) ? normalizedMode : DEFAULT_GAME_MODE;
    }

    document.body.classList.toggle("compact-mode", Boolean(data.compact));
    if (compactToggle) {
      compactToggle.textContent = data.compact ? "Normal Mode" : "Compact Mode";
    }

    if (outlineToggle) outlineToggle.checked = !data.outlinesOff;
    document.body.classList.toggle("outlines-off", Boolean(data.outlinesOff));

    if (Object.prototype.hasOwnProperty.call(data, "filtersPanelExpanded")) {
      setFiltersPanelExpanded(Boolean(data.filtersPanelExpanded), { persist: false });
    } else {
      setFiltersPanelExpanded(false, { persist: false });
    }

    document.documentElement.classList.toggle("dark-mode", Boolean(data.dark));
    if (darkToggle) darkToggle.checked = Boolean(data.dark);

    setTheme(data.theme || defaultTheme, false);

    if (criesToggle) criesToggle.checked = Boolean(data.cries);
    if (legacyCriesToggle) legacyCriesToggle.checked = Boolean(data.legacyCries);
    if (showDexToggle) showDexToggle.checked = Boolean(data.showDex);
    if (shinyToggle) shinyToggle.checked = Boolean(data.shiny);
    if (typoModeSelect) typoModeSelect.value = data.typoMode || DEFAULT_TYPO_MODE;
    if (autocorrectToggle) autocorrectToggle.checked = data.autocorrect !== false;
    if (groupFilter) {
      const group = ["none", "generation", "type"].includes(data.group) ? data.group : "generation";
      groupFilter.value = group;
    }

    syncSettingsState();

    if (persist) {
      localStorage.setItem(storageSettingsKey, JSON.stringify(getSettingsPayload()));
    }
  }

  function saveSettings() {
    localStorage.setItem(storageSettingsKey, JSON.stringify(getSettingsPayload()));
    syncProgressLinkPreview();
  }

  function restoreSettings() {
    const raw = localStorage.getItem(storageSettingsKey);
    const legacyRaw = localStorage.getItem(legacyStorageSettingsKey);
    if (!raw && !legacyRaw) return;
    let data;
    try {
      data = JSON.parse(raw || legacyRaw);
    } catch {
      return;
    }
    applySettingsPayload(data, { persist: false });
    if (!raw && legacyRaw) {
      saveSettings();
    }
  }

  function resetSettings() {
    const locked = isFiltersLocked();
    localStorage.removeItem(storageSettingsKey);
    localStorage.removeItem(legacyStorageSettingsKey);
    document.body.classList.remove("compact-mode");
    document.documentElement.classList.remove("dark-mode");
    if (compactToggle) compactToggle.textContent = "Compact Mode";
    if (filtersToggle) filtersToggle.textContent = "Settings";
    if (filtersToggleCompact) filtersToggleCompact.textContent = "Settings";
    if (criesToggle) criesToggle.checked = false;
    if (legacyCriesToggle) legacyCriesToggle.checked = false;
    if (shinyToggle) shinyToggle.checked = false;
    if (darkToggle) darkToggle.checked = false;
    setFiltersPanelExpanded(false, { persist: false });
    setTheme(defaultTheme, false);
    if (!locked) {
      if (gameModeSelect) gameModeSelect.value = DEFAULT_GAME_MODE;
      document.body.classList.add("outlines-off");
      if (showDexToggle) showDexToggle.checked = false;
      if (typoModeSelect) typoModeSelect.value = DEFAULT_TYPO_MODE;
      if (autocorrectToggle) autocorrectToggle.checked = true;
      if (outlineToggle) outlineToggle.checked = false;
      if (groupFilter) groupFilter.value = "generation";
      setChipGroupSelections(genFilter, []);
      setChipGroupSelections(typeFilter, []);
      applyFilters();
    }
    syncSettingsState();
  }

  async function confirmResetSettings() {
    const ok = await requestConfirmation("Reset all settings to their defaults?", {
      title: "Reset Settings",
      confirmLabel: "Reset"
    });
    if (!ok) return;
    resetSettings();
  }

  return {
    setFiltersPanelExpanded,
    syncTypoSettings,
    syncGameplaySettings,
    setTheme,
    initThemes,
    updateFilterSummary,
    applySettingsPayload,
    saveSettings,
    restoreSettings,
    resetSettings,
    confirmResetSettings
  };
}
