import { filterNamesBySelectedIndex as filterNamesBySelectedIndexCore, summarizeFilterSelection as summarizeFilterSelectionCore } from "../domain/filters.js";
import { typeIconBase } from "../core/app-config.js";

export function createFiltersController({
  state,
  genFilter,
  typeFilter,
  formatGenerationLabel,
  generationOrder,
  prettifyName,
  isWeeklyChallengeMode,
  getWeeklyChallengeTheme,
  getWeeklyChallengeNames,
  isWeeklyChallengeReady,
  recalculateActiveFoundCount,
  updateStats,
  renderSprites,
  renderStudyPanel,
  buildGuessIndex,
  normalizeGuess,
  saveState,
  onFiltersChanged = () => {},
  updateFilterSummary,
  setFiltersPanelExpanded,
  syncWeeklyChallengeState,
  isFiltersLocked = () => false
}) {
  function getChipGroupBoxes(container) {
    if (!container) return { allBox: null, others: [] };
    const checkboxes = [...container.querySelectorAll("input[type='checkbox']")];
    const allBox = checkboxes.find((box) => box.value === "all") || null;
    const others = checkboxes.filter((box) => box.value !== "all");
    return { allBox, others };
  }

  function handleChipGroupChange(container, e) {
    const { allBox, others } = getChipGroupBoxes(container);
    if (!allBox) return;
    const value = e.target.value;
    if (value === "all" && e.target.checked) {
      allBox.checked = true;
      others.forEach((box) => (box.checked = true));
    } else if (value === "all" && !e.target.checked) {
      others.forEach((box) => (box.checked = false));
    } else if (value !== "all" && allBox.checked) {
      allBox.checked = false;
    }

    if (value !== "all") {
      const allChecked = others.every((box) => box.checked);
      allBox.checked = allChecked;
    }

    const anyChecked = others.some((box) => box.checked);
    if (!anyChecked) {
      allBox.checked = true;
      others.forEach((box) => (box.checked = true));
    }
  }

  function getSelectedFromChips(container) {
    const { allBox, others } = getChipGroupBoxes(container);
    if (!allBox) return [];
    const anyChecked = others.some((box) => box.checked);
    if (!allBox.checked && !anyChecked) {
      allBox.checked = true;
      others.forEach((box) => (box.checked = true));
    }
    if (allBox.checked) return [];
    return others.filter((box) => box.checked).map((box) => box.value);
  }

  function syncChipGroup(container) {
    const { allBox, others } = getChipGroupBoxes(container);
    if (allBox && allBox.checked) {
      others.forEach((box) => (box.checked = true));
    }
  }

  function setChipGroupSelections(container, selectedValues) {
    const { allBox, others } = getChipGroupBoxes(container);
    if (!allBox) return;
    if (!selectedValues || selectedValues.length === 0) {
      allBox.checked = true;
      others.forEach((box) => (box.checked = true));
      return;
    }
    allBox.checked = false;
    const selectedSet = new Set(selectedValues);
    others.forEach((box) => (box.checked = selectedSet.has(box.value)));
  }

  function createChipWithHandler(label, value, checked, handler) {
    const chip = document.createElement("label");
    chip.className = "chip";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = value;
    input.checked = checked;
    const text = document.createElement("span");
    text.textContent = label;
    chip.appendChild(input);
    chip.appendChild(text);
    input.addEventListener("change", handler);
    return chip;
  }

  function createTypeChip(entry, handler) {
    const chip = document.createElement("label");
    chip.className = "chip chip--type";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = entry.name;
    input.addEventListener("change", handler);

    const icon = document.createElement("img");
    icon.alt = `${entry.label} type`;
    icon.src = `${typeIconBase}${entry.id}.png`;

    const text = document.createElement("span");
    text.textContent = entry.label;

    chip.appendChild(input);
    chip.appendChild(icon);
    chip.appendChild(text);
    return chip;
  }

  function populateTypeChips(entries) {
    if (!typeFilter) return;
    typeFilter.innerHTML = "";

    const allChip = createChipWithHandler("All", "all", true, onTypeChipChange);
    typeFilter.appendChild(allChip);

    entries
      .slice()
      .sort((a, b) => (a.id || 999) - (b.id || 999))
      .forEach((entry) => {
        typeFilter.appendChild(createTypeChip(entry, onTypeChipChange));
      });
    syncChipGroup(typeFilter);
  }

  function onTypeChipChange(e) {
    if (isFiltersLocked()) return;
    handleChipGroupChange(typeFilter, e);
    applyFilters();
  }

  function getSelectedTypes() {
    return getSelectedFromChips(typeFilter);
  }

  function populateGenChips(entries) {
    if (!genFilter) return;
    genFilter.innerHTML = "";

    const allChip = createChipWithHandler("All", "all", true, onGenChipChange);
    genFilter.appendChild(allChip);

    entries
      .slice()
      .sort((a, b) => generationOrder(a.name) - generationOrder(b.name))
      .forEach((entry) => {
        const chip = createChipWithHandler(
          formatGenerationLabel(entry.name),
          entry.name,
          false,
          onGenChipChange
        );
        genFilter.appendChild(chip);
      });
    syncChipGroup(genFilter);
  }

  function onGenChipChange(e) {
    if (isFiltersLocked()) return;
    handleChipGroupChange(genFilter, e);
    applyFilters();
  }

  function getSelectedGenerations() {
    return getSelectedFromChips(genFilter);
  }

  function applyFilters({ force = false, persist = true } = {}) {
    if (!force && isFiltersLocked()) return;
    let filtered = state.allNames.slice();

    if (isWeeklyChallengeMode()) {
      const theme = getWeeklyChallengeTheme();
      const challengeNames = getWeeklyChallengeNames(theme);
      if (theme && isWeeklyChallengeReady(theme)) {
        const challengeSet = new Set(challengeNames);
        filtered = filtered.filter((name) => challengeSet.has(name));
      } else {
        filtered = [];
      }
    } else {
      const selectedGens = getSelectedGenerations();
      const selectedTypes = getSelectedTypes();

      filtered = filterNamesBySelectedIndexCore(filtered, selectedGens, state.generationIndex);
      filtered = filterNamesBySelectedIndexCore(filtered, selectedTypes, state.typeIndex);
    }

    state.names = filtered;
    state.activeNames = new Set(filtered);
    recalculateActiveFoundCount();
    state.progressMilestonesPrimed = false;
    updateStats();
    renderSprites();
    buildGuessIndex(state, normalizeGuess, prettifyName);
    renderStudyPanel();
    syncChipGroup(typeFilter);
    syncChipGroup(genFilter);
    syncWeeklyChallengeState();
    updateFilterSummary();
    if (persist) saveState();
    if (persist) onFiltersChanged();
  }

  return {
    populateTypeChips,
    onTypeChipChange,
    getSelectedTypes,
    populateGenChips,
    createChipWithHandler,
    onGenChipChange,
    getSelectedGenerations,
    getChipGroupBoxes,
    handleChipGroupChange,
    getSelectedFromChips,
    syncChipGroup,
    setChipGroupSelections,
    summarizeFilterSelection: summarizeFilterSelectionCore,
    updateFilterSummary,
    setFiltersPanelExpanded,
    applyFilters,
    filterNamesBySelectedIndex: filterNamesBySelectedIndexCore
  };
}
