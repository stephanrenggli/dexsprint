const state = {
  names: [],
  allNames: [],
  normalizedMap: new Map(),
  meta: new Map(),
  generationIndex: new Map(),
  typeIndex: new Map(),
  guessIndex: new Map(),
  guessPrefixes: new Set(),
  namesByLang: new Map(),
  found: new Set(),
  recentlyFound: new Set(),
  cryAudio: null,
  isRestoring: false,
  lastSavedSec: -1,
  hasCelebratedCompletion: false,
  infoCache: new Map(),
  timerId: null,
  startTime: null,
  activeEntry: null
};

const totalCount = document.getElementById("total-count");
const foundCount = document.getElementById("found-count");
const remainingCount = document.getElementById("remaining-count");
const timerEl = document.getElementById("timer");
const compactTotalCount = document.getElementById("compact-total-count");
const compactFoundCount = document.getElementById("compact-found-count");
const compactRemainingCount = document.getElementById("compact-remaining-count");
const compactTimerEl = document.getElementById("compact-timer");
const statusEl = document.getElementById("status");
const revealPill = document.getElementById("reveal-pill");
const revealPillImg = document.getElementById("reveal-pill-img");
const revealPillLabel = document.getElementById("reveal-pill-label");
const inputEl = document.getElementById("name-input");
const retryBtn = document.getElementById("retry-btn");
const genFilter = document.getElementById("gen-filter");
const typeFilter = document.getElementById("type-filter");
const groupFilter = document.getElementById("group-filter");
const spriteGrid = document.getElementById("sprite-grid");
const progressBar = document.getElementById("progress-bar");
const progressValue = document.getElementById("progress-value");
const resetBtn = document.getElementById("reset-btn");
const resetBtnCompact = document.getElementById("reset-btn-compact");
const filtersToggleCompact = document.getElementById("filters-toggle-compact");
const outlineToggle = document.getElementById("outline-toggle");
const filtersToggle = document.getElementById("filters-toggle");
const compactToggle = document.getElementById("compact-toggle");
const criesToggle = document.getElementById("cries-toggle");
const legacyCriesToggle = document.getElementById("legacy-cries-toggle");
const settingsClose = document.getElementById("settings-close");
const showDexToggle = document.getElementById("show-dex-toggle");
const shinyToggle = document.getElementById("shiny-toggle");
const settingsReset = document.getElementById("settings-reset");
const darkToggle = document.getElementById("dark-toggle");
const themeChooser = document.getElementById("theme-chooser");
const infoModal = document.getElementById("info-modal");
const infoClose = document.getElementById("info-close");
const infoSprite = document.getElementById("info-sprite");
const infoTitle = document.getElementById("info-title");
const infoMeta = document.getElementById("info-meta");
const infoTypes = document.getElementById("info-types");
const infoGenus = document.getElementById("info-genus");
const infoSize = document.getElementById("info-size");
const infoAbilities = document.getElementById("info-abilities");

const pokedex = new Pokedex.Pokedex({
  cache: true,
  timeout: 10000,
  cacheImages: true
});
const typeIconBase =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/small/";
const DEFAULT_THEME = "normal";
const DEFAULT_INPUT_PLACEHOLDER = "Charizard";
const THEMES = [
  { id: "normal", name: "Normal", color: "#A8A878", accent2: "#8A8A58" },
  { id: "fire", name: "Fire", color: "#F08030", accent2: "#E0621A" },
  { id: "water", name: "Water", color: "#6890F0", accent2: "#4E7CE8" },
  { id: "electric", name: "Electric", color: "#F8D030", accent2: "#E6B800" },
  { id: "grass", name: "Grass", color: "#78C850", accent2: "#5FA63A" },
  { id: "ice", name: "Ice", color: "#98D8D8", accent2: "#7FC6C6" },
  { id: "fighting", name: "Fighting", color: "#C03028", accent2: "#A61F1A" },
  { id: "poison", name: "Poison", color: "#A040A0", accent2: "#7F2E7F" },
  { id: "ground", name: "Ground", color: "#E0C068", accent2: "#C9A84A" },
  { id: "flying", name: "Flying", color: "#A890F0", accent2: "#8E72E6" },
  { id: "psychic", name: "Psychic", color: "#F85888", accent2: "#E04070" },
  { id: "bug", name: "Bug", color: "#A8B820", accent2: "#8C9A12" },
  { id: "rock", name: "Rock", color: "#B8A038", accent2: "#9E8524" },
  { id: "ghost", name: "Ghost", color: "#705898", accent2: "#5A457E" },
  { id: "dragon", name: "Dragon", color: "#7038F8", accent2: "#5A22E6" },
  { id: "dark", name: "Dark", color: "#705848", accent2: "#5A463A" },
  { id: "steel", name: "Steel", color: "#B8B8D0", accent2: "#9FA0B7" },
  { id: "fairy", name: "Fairy", color: "#EE99AC", accent2: "#DB8097" }
];
const spriteFallback =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png";
const spriteBase =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";
const spriteShinyBase =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/";
const criesLatestBase =
  "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/";
const criesLegacyBase =
  "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy/";
const STORAGE_KEY = "pokequiz-state";
const DEFAULT_STATUS = "";

function normalizeName(value) {
  if (!value) return "";
  let name = value
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/♀/g, "-f")
    .replace(/♂/g, "-m")
    .replace(/\s+/g, "-")
    .replace(/\.+/g, "")
    .replace(/[^a-z0-9-]/g, "");
  name = name.replace(/-+/g, "-");
  return name;
}

function prettifyName(value) {
  return value
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
    .replace("Hp", "HP");
}

function normalizeGuess(value) {
  if (!value) return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/\s+/g, "")
    .replace(/\.+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function formatGenerationLabel(genName) {
  const map = {
    "generation-i": "Kanto (Gen I)",
    "generation-ii": "Johto (Gen II)",
    "generation-iii": "Hoenn (Gen III)",
    "generation-iv": "Sinnoh (Gen IV)",
    "generation-v": "Unova (Gen V)",
    "generation-vi": "Kalos (Gen VI)",
    "generation-vii": "Alola (Gen VII)",
    "generation-viii": "Galar (Gen VIII)",
    "generation-ix": "Paldea (Gen IX)"
  };
  return map[genName] || prettifyName(genName);
}

function generationOrder(genName) {
  const order = {
    "generation-i": 1,
    "generation-ii": 2,
    "generation-iii": 3,
    "generation-iv": 4,
    "generation-v": 5,
    "generation-vi": 6,
    "generation-vii": 7,
    "generation-viii": 8,
    "generation-ix": 9
  };
  return order[genName] || 999;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function focusInput(preventScroll = true) {
  if (!inputEl) return;
  const scrollY = window.scrollY;
  try {
    if (preventScroll) {
      inputEl.focus({ preventScroll: true });
    } else {
      inputEl.focus();
    }
  } catch (err) {
    inputEl.focus();
  }
  requestAnimationFrame(() => {
    if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
  });
  setTimeout(() => {
    if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
  }, 0);
}

function getSpriteForEntry(entry) {
  if (!entry) return spriteFallback;
  if (shinyToggle && shinyToggle.checked && entry.dexId) {
    return `${spriteShinyBase}${entry.dexId}.png`;
  }
  return entry.sprite || spriteFallback;
}

function setTimerText(value) {
  if (timerEl) timerEl.textContent = value;
  if (compactTimerEl) compactTimerEl.textContent = value;
}

async function playCry(canonical) {
  if (!canonical) return;
  const entry = state.meta.get(canonical);
  if (!entry || !entry.cryId) return;
  if (criesToggle && !criesToggle.checked) return;
  try {
    if (!state.cryAudio) {
      state.cryAudio = new Audio();
      state.cryAudio.preload = "auto";
    }
    state.cryAudio.pause();
    const useLegacy = legacyCriesToggle && legacyCriesToggle.checked;
    const legacyUrl = `${criesLegacyBase}${entry.cryId}.ogg`;
    const modernUrl = `${criesLatestBase}${entry.cryId}.ogg`;
    state.cryAudio.volume = 0.1;
    if (useLegacy) {
      await playCryWithFallback(legacyUrl, modernUrl);
      return;
    }
    state.cryAudio.src = modernUrl;
    await state.cryAudio.play();
  } catch (err) {
    // no-op: audio is optional
  }
}

async function playCryWithFallback(legacyUrl, modernUrl) {
  if (!state.cryAudio) return;
  return new Promise((resolve, reject) => {
    const audio = state.cryAudio;
    let settled = false;

    const cleanup = () => {
      audio.removeEventListener("error", onLegacyError);
      audio.removeEventListener("playing", onPlaying);
    };

    const onPlaying = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const onLegacyError = () => {
      audio.removeEventListener("error", onLegacyError);
      audio.src = modernUrl;
      audio
        .play()
        .then(() => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve();
        })
        .catch((err) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(err);
        });
    };

    audio.addEventListener("playing", onPlaying, { once: true });
    audio.addEventListener("error", onLegacyError, { once: true });
    audio.src = legacyUrl;
    audio.play().catch(() => {
      // If play fails due to autoplay restrictions, don't force fallback.
    });
  });
}

function startTimer(preserveStart = false) {
  if (state.timerId) return;
  if (!preserveStart || !state.startTime) {
    state.startTime = Date.now();
  }
  state.timerId = setInterval(() => {
    const delta = Math.floor((Date.now() - state.startTime) / 1000);
    setTimerText(formatTime(delta));
    if (delta !== state.lastSavedSec && delta % 5 === 0) {
      state.lastSavedSec = delta;
      saveState();
    }
  }, 1000);
  saveState();
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function saveState() {
  if (state.isRestoring) return;
  const elapsed = state.startTime
    ? Math.floor((Date.now() - state.startTime) / 1000)
    : 0;
  const payload = {
    found: [...state.found],
    elapsed,
    running: Boolean(state.timerId),
    group: groupFilter ? groupFilter.value : "none",
    gens: getSelectedGenerations(),
    types: getSelectedTypes()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

function restoreState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return false;
  }
  state.isRestoring = true;

  if (groupFilter && data.group) {
    const allowed = new Set(["none", "generation", "type"]);
    groupFilter.value = allowed.has(data.group) ? data.group : "generation";
  }

  setChipGroupSelections(genFilter, data.gens || []);
  setChipGroupSelections(typeFilter, data.types || []);

  if (Array.isArray(data.found)) {
    state.found = new Set(data.found);
  }

  if (data.elapsed) {
    setTimerText(formatTime(data.elapsed));
    if (data.running) {
      state.startTime = Date.now() - data.elapsed * 1000;
      startTimer(true);
    }
  }

  state.isRestoring = false;
  return true;
}

function saveSettings() {
  const payload = {
    compact: document.body.classList.contains("compact-mode"),
    outlinesOff: document.body.classList.contains("outlines-off"),
    cries: criesToggle ? criesToggle.checked : false,
    legacyCries: legacyCriesToggle ? legacyCriesToggle.checked : false,
    showDex: showDexToggle ? showDexToggle.checked : false,
    shiny: shinyToggle ? shinyToggle.checked : false,
    sidebarCollapsed: document.body.classList.contains("sidebar-collapsed"),
    dark: document.body.classList.contains("dark-mode"),
    theme: document.body.dataset.theme || DEFAULT_THEME
  };
  localStorage.setItem(`${STORAGE_KEY}:settings`, JSON.stringify(payload));
}

function restoreSettings() {
  const raw = localStorage.getItem(`${STORAGE_KEY}:settings`);
  if (!raw) return;
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return;
  }
  if (data.compact) {
    document.body.classList.add("compact-mode");
    if (compactToggle) compactToggle.textContent = "Normal Mode";
  }
  if (outlineToggle) outlineToggle.checked = !data.outlinesOff;
  document.body.classList.toggle("outlines-off", Boolean(data.outlinesOff));
  if (data.sidebarCollapsed) {
    document.body.classList.add("sidebar-collapsed");
    if (filtersToggle) filtersToggle.textContent = "Show Settings";
    if (filtersToggleCompact) filtersToggleCompact.textContent = "Show Settings";
  } else if (filtersToggle) {
    filtersToggle.textContent = "Hide Settings";
    if (filtersToggleCompact) filtersToggleCompact.textContent = "Hide Settings";
  }
  document.body.classList.toggle("dark-mode", Boolean(data.dark));
  if (darkToggle) darkToggle.checked = Boolean(data.dark);
  setTheme(data.theme || DEFAULT_THEME, false);
  if (criesToggle) criesToggle.checked = Boolean(data.cries);
  if (legacyCriesToggle) legacyCriesToggle.checked = Boolean(data.legacyCries);
  if (showDexToggle) showDexToggle.checked = Boolean(data.showDex);
  if (shinyToggle) shinyToggle.checked = Boolean(data.shiny);
}

function resetSettings() {
  localStorage.removeItem(`${STORAGE_KEY}:settings`);
  document.body.classList.remove("compact-mode");
  document.body.classList.remove("dark-mode");
  document.body.classList.add("outlines-off");
  document.body.classList.add("sidebar-collapsed");
  if (compactToggle) compactToggle.textContent = "Compact Mode";
  if (filtersToggle) filtersToggle.textContent = "Show Settings";
  if (criesToggle) criesToggle.checked = false;
  if (legacyCriesToggle) legacyCriesToggle.checked = false;
  if (showDexToggle) showDexToggle.checked = false;
  if (shinyToggle) shinyToggle.checked = false;
  if (outlineToggle) outlineToggle.checked = false;
  if (darkToggle) darkToggle.checked = false;
  setTheme(DEFAULT_THEME, false);
  if (groupFilter) groupFilter.value = "generation";
  setChipGroupSelections(genFilter, []);
  setChipGroupSelections(typeFilter, []);
  applyFilters();
}

function setTheme(themeId, persist = true) {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  document.body.dataset.theme = theme.id;
  document.documentElement.style.setProperty("--accent", theme.color);
  document.documentElement.style.setProperty("--accent-2", theme.accent2);
  const bg1 = tint(theme.color, 0.92);
  const bg2 = tint(theme.color, 0.85);
  const bg3 = tint(theme.color, 0.72);
  document.documentElement.style.setProperty("--bg-1", bg1);
  document.documentElement.style.setProperty("--bg-2", bg2);
  document.documentElement.style.setProperty("--bg-3", bg3);
  if (themeChooser) {
    const chips = [...themeChooser.querySelectorAll(".theme-chip")];
    chips.forEach((chip) => {
      chip.classList.toggle("is-selected", chip.dataset.theme === theme.id);
    });
  }
  if (persist) saveSettings();
}

function initThemes() {
  if (!themeChooser) return;
  themeChooser.innerHTML = "";
  THEMES.forEach((theme) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "theme-chip";
    chip.dataset.theme = theme.id;
    const swatch = document.createElement("span");
    swatch.className = "theme-swatch";
    swatch.style.background = theme.color;
    const text = document.createElement("span");
    text.textContent = theme.name;
    chip.appendChild(swatch);
    chip.appendChild(text);
    chip.addEventListener("click", () => setTheme(theme.id));
    themeChooser.appendChild(chip);
  });
  setTheme(DEFAULT_THEME, false);
}

function tint(hex, amount) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const mix = (channel) => Math.round(channel + (255 - channel) * (1 - amount));
  const r2 = mix(r);
  const g2 = mix(g);
  const b2 = mix(b);
  return `rgb(${r2}, ${g2}, ${b2})`;
}

function updateStats() {
  const total = state.names.length;
  const found = state.names.filter((name) => state.found.has(name)).length;
  totalCount.textContent = total;
  foundCount.textContent = found;
  remainingCount.textContent = total - found;
  if (compactTotalCount) compactTotalCount.textContent = total;
  if (compactFoundCount) compactFoundCount.textContent = found;
  if (compactRemainingCount) compactRemainingCount.textContent = total - found;
  const progress = total === 0 ? 0 : (found / total) * 100;
  progressBar.style.width = `${progress.toFixed(1)}%`;
  if (progressValue) progressValue.textContent = `${Math.round(progress)}%`;
  const isComplete = total > 0 && found === total;
  if (isComplete && !state.hasCelebratedCompletion) {
    triggerCompletionCelebration();
    state.hasCelebratedCompletion = true;
  } else if (!isComplete) {
    state.hasCelebratedCompletion = false;
    clearCompletionCelebration();
  }
}

function triggerCompletionCelebration() {
  const inputWrap = inputEl ? inputEl.closest(".input-wrap") : null;
  if (inputWrap) {
    inputWrap.classList.remove("completion-burst");
    void inputWrap.offsetWidth;
    inputWrap.classList.add("completion-burst");
  }
  if (progressBar) {
    progressBar.classList.remove("progress-bar--complete");
    void progressBar.offsetWidth;
    progressBar.classList.add("progress-bar--complete");
  }
}

function clearCompletionCelebration() {
  const inputWrap = inputEl ? inputEl.closest(".input-wrap") : null;
  if (inputWrap) inputWrap.classList.remove("completion-burst");
  if (progressBar) progressBar.classList.remove("progress-bar--complete");
}

function createSpriteCard(entry, isFound) {
  const card = document.createElement("div");
  const classes = ["sprite-card"];
  const isRevealedNow = isFound && state.recentlyFound.has(entry.normalized);
  if (!isFound) {
    classes.push("sprite-card--hidden");
  }
  if (isRevealedNow) {
    classes.push("sprite-card--revealed");
    if (!document.body.classList.contains("outlines-off")) {
      classes.push("sprite-card--outline-reveal");
    }
  }
  card.className = classes.join(" ");
  card.dataset.pokemon = entry.normalized;

  const img = document.createElement("img");
  img.src = getSpriteForEntry(entry);
  img.alt = isFound ? entry.label : "Unknown Pokemon";
  img.loading = "lazy";
  img.decoding = "async";

  const label = document.createElement("span");
  label.className = "sprite-card__name";
  label.textContent = isFound ? entry.label : getHiddenLabel(entry);

  if (isRevealedNow) {
    const spriteUrl = getSpriteForEntry(entry).replace(/"/g, '\\"');
    card.style.setProperty("--reveal-sprite", `url("${spriteUrl}")`);
  }

  card.appendChild(img);
  card.appendChild(label);
  return card;
}


function renderSprites() {
  if (!spriteGrid) return;
  spriteGrid.innerHTML = "";
  spriteGrid.className = "sprite-grid";
  if (groupFilter && groupFilter.value !== "none") {
    renderSpritesGrouped();
  } else {
    state.names.forEach((name) => {
      const entry = state.meta.get(name);
      if (!entry) return;
      const isFound = state.found.has(name);
      spriteGrid.appendChild(createSpriteCard(entry, isFound));
    });
  }
  state.recentlyFound.clear();
}

function renderSpritesGrouped() {
  const mode = groupFilter ? groupFilter.value : "none";
  if (mode === "none") return;
  const groups = new Map();

  state.names.forEach((name) => {
    const entry = state.meta.get(name);
    if (!entry) return;
    let keys = [];
    if (mode === "generation") {
      keys = [entry.generation || "Unknown"];
    } else if (mode === "type") {
      keys = entry.types && entry.types.length ? entry.types : ["Unknown"];
    }
    keys.forEach((key) => {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    });
  });

  const genLabelOrder = new Map();
  if (mode === "generation") {
    [...state.generationIndex.keys()].forEach((key) => {
      genLabelOrder.set(formatGenerationLabel(key), generationOrder(key));
    });
  }

  const groupKeys = [...groups.keys()];
  if (document.body.classList.contains("compact-mode")) {
    const count = groupKeys.length;
    const cols = Math.min(6, Math.max(1, count));
    if (spriteGrid) spriteGrid.style.setProperty("--compact-cols", String(cols));
  } else if (spriteGrid) {
    spriteGrid.style.removeProperty("--compact-cols");
  }

  groupKeys
    .sort((a, b) => {
      if (mode !== "generation") return a.localeCompare(b);
      return (genLabelOrder.get(a) || 999) - (genLabelOrder.get(b) || 999);
    })
    .forEach((groupName) => {
      const entries = groups.get(groupName) || [];
      const total = entries.length;
      const found = entries.filter((entry) =>
        state.found.has(entry.normalized)
      ).length;
      const percent = total === 0 ? 0 : Math.round((found / total) * 100);
      const section = document.createElement("section");
      section.className = "group-card";
      const title = document.createElement("h3");
      title.className = "group-title";
      title.textContent =
        mode === "generation"
          ? `${groupName} — ${percent}%`
          : groupName;
      const grid = document.createElement("div");
      grid.className = "sprite-grid";
      entries.forEach((entry) => {
        const isFound = state.found.has(entry.normalized);
        grid.appendChild(createSpriteCard(entry, isFound));
      });

      section.appendChild(title);
      section.appendChild(grid);
      spriteGrid.appendChild(section);
    });
  spriteGrid.className = "sprite-groups";
}

function resetQuiz() {
  stopTimer();
  state.found.clear();
  setTimerText("00:00");
  inputEl.value = "";
  focusInput();
  updateStats();
  renderSprites();
  clearState();
}

function confirmReset() {
  const total = state.names.length;
  const found = state.names.filter((name) => state.found.has(name)).length;
  if (total && found) {
    const ok = window.confirm(
      `Reset the quiz? This will clear ${found} found Pokemon and the timer.`
    );
    if (!ok) return;
  } else if (!window.confirm("Reset the quiz?")) {
    return;
  }
  resetQuiz();
}

async function openInfoModal(entry) {
  if (!entry || !infoModal) return;
  if (infoTitle) infoTitle.textContent = entry.label;
  if (infoSprite) {
    infoSprite.src = getSpriteForEntry(entry);
    infoSprite.alt = entry.label;
  }
  if (infoMeta) infoMeta.textContent = entry.generation || "";
  if (infoTypes) infoTypes.textContent = "";
  if (infoGenus) infoGenus.textContent = "Loading details...";
  if (infoSize) infoSize.textContent = "";
  if (infoAbilities) infoAbilities.textContent = "";
  state.activeEntry = entry;
  infoModal.classList.remove("hidden");
  playCry(entry.normalized || normalizeName(entry.label || ""));

  try {
    const details = await getPokedexInfo(entry);
    if (!details) return;
    if (infoGenus) infoGenus.textContent = details.genus || "";
    if (infoSize) infoSize.textContent = details.size || "";
    if (infoAbilities) infoAbilities.textContent = details.abilities || "";
    renderTypeSprites(entry);
  } catch (err) {
    if (infoGenus) infoGenus.textContent = "Could not load details.";
  }
}

function closeInfoModal() {
  if (!infoModal) return;
  infoModal.classList.add("hidden");
  state.activeEntry = null;
}

function renderTypeSprites(entry) {
  if (!infoTypes) return;
  infoTypes.innerHTML = "";
  const types = entry.types || [];
  types.forEach((typeName) => {
    const typeId = getTypeId(typeName);
    const chip = document.createElement("span");
    chip.className = "info-type-chip";
    const icon = document.createElement("img");
    icon.alt = `${typeName} type`;
    icon.src = `${typeIconBase}${typeId}.png`;
    const text = document.createElement("span");
    text.textContent = typeName;
    chip.appendChild(icon);
    chip.appendChild(text);
    infoTypes.appendChild(chip);
  });
}

function getTypeId(typeName) {
  const map = {
    Normal: 1,
    Fighting: 2,
    Flying: 3,
    Poison: 4,
    Ground: 5,
    Rock: 6,
    Bug: 7,
    Ghost: 8,
    Steel: 9,
    Fire: 10,
    Water: 11,
    Grass: 12,
    Electric: 13,
    Psychic: 14,
    Ice: 15,
    Dragon: 16,
    Dark: 17,
    Fairy: 18
  };
  return map[typeName] || 1;
}

async function getPokedexInfo(entry) {
  if (!entry || !entry.dexId) return null;
  if (state.infoCache.has(entry.dexId)) return state.infoCache.get(entry.dexId);
  const [pokemon, species] = await pokedex.resource([
    `/api/v2/pokemon/${entry.dexId}`,
    `/api/v2/pokemon-species/${entry.dexId}`
  ]);
  if (!pokemon || !species) return null;

  const heightM = pokemon.height ? (pokemon.height / 10).toFixed(1) : null;
  const weightKg = pokemon.weight ? (pokemon.weight / 10).toFixed(1) : null;
  const abilities = (pokemon.abilities || [])
    .map((a) => prettifyName(a.ability.name))
    .join(", ");
  const genusEntry = (species.genera || []).find(
    (g) => g.language && g.language.name === "en"
  );

  const details = {
    genus: genusEntry ? genusEntry.genus : "",
    size:
      heightM && weightKg ? `Height: ${heightM} m · Weight: ${weightKg} kg` : "",
    abilities: abilities ? `Abilities: ${abilities}` : ""
  };
  state.infoCache.set(entry.dexId, details);
  return details;
}

function getHiddenLabel(entry) {
  if (showDexToggle && showDexToggle.checked && entry.dexId) {
    return `#${String(entry.dexId).padStart(3, "0")}`;
  }
  return "???";
}

function levenshteinWithin(a, b, max) {
  const alen = a.length;
  const blen = b.length;
  if (Math.abs(alen - blen) > max) return max + 1;
  const row = new Array(blen + 1).fill(0);
  for (let j = 0; j <= blen; j += 1) row[j] = j;
  for (let i = 1; i <= alen; i += 1) {
    let prev = i - 1;
    row[0] = i;
    let minInRow = row[0];
    for (let j = 1; j <= blen; j += 1) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = temp;
      if (row[j] < minInRow) minInRow = row[j];
    }
    if (minInRow > max) return max + 1;
  }
  return row[blen];
}

function findTypoMatch(normalized) {
  if (!normalized) return null;
  if (state.guessPrefixes.has(normalized)) return null;
  if (normalized.length < 4) return null;
  const maxDist = normalized.length <= 6 ? 1 : 2;
  let bestCanonical = null;
  let bestDist = maxDist + 1;
  let bestCount = 0;
  for (const candidate of state.guessIndex.keys()) {
    if (Math.abs(candidate.length - normalized.length) > maxDist) continue;
    const dist = levenshteinWithin(normalized, candidate, maxDist);
    if (dist > maxDist) continue;
    const canonical = state.guessIndex.get(candidate);
    if (dist < bestDist) {
      bestDist = dist;
      bestCanonical = canonical;
      bestCount = 1;
    } else if (dist === bestDist && canonical !== bestCanonical) {
      bestCount += 1;
    }
  }
  if (bestCanonical && bestCount === 1) return bestCanonical;
  return null;
}

function handleGuess(value) {
  const normalized = normalizeGuess(value);
  if (!normalized) return;
  const canonical = state.guessIndex.get(normalized);
  if (canonical && state.names.includes(canonical)) {
    const isNew = !state.found.has(canonical);
    state.found.add(canonical);
    if (isNew) state.recentlyFound.add(canonical);
    updateStats();
    renderSprites();
    if (isNew) {
      showRevealPreview(state.meta.get(canonical));
      playCry(canonical);
      saveState();
      showStatusHint("");
    } else {
      showStatusHint("Already found!");
      highlightPokemon(canonical);
    }
    return;
  }
  const typoMatch = findTypoMatch(normalized);
  if (typoMatch && state.names.includes(typoMatch)) {
    const isNew = !state.found.has(typoMatch);
    state.found.add(typoMatch);
    if (isNew) state.recentlyFound.add(typoMatch);
    updateStats();
    renderSprites();
    if (isNew) {
      showRevealPreview(state.meta.get(typoMatch));
      playCry(typoMatch);
      saveState();
      const label = state.meta.get(typoMatch)?.label || "Pokemon";
      showStatusHint(`Corrected to ${label}.`);
    } else {
      showStatusHint("Already found!");
      highlightPokemon(typoMatch);
    }
  }
}

function highlightPokemon(canonical) {
  if (!canonical || !spriteGrid) return;
  const card = spriteGrid.querySelector(
    `.sprite-card[data-pokemon="${canonical}"]`
  );
  if (!card) return;
  card.classList.remove("sprite-card--highlight");
  void card.offsetWidth;
  card.classList.add("sprite-card--highlight");
  setTimeout(() => {
    card.classList.remove("sprite-card--highlight");
  }, 600);
}

function showRevealPreview(entry) {
  if (!entry || !revealPill) return;
  if (revealPillImg) {
    revealPillImg.src = getSpriteForEntry(entry);
    revealPillImg.alt = entry.label || "Revealed Pokemon";
  }
  if (revealPillLabel) revealPillLabel.textContent = entry.label || "Pokemon";

  revealPill.hidden = false;
  revealPill.classList.remove("is-active");
  void revealPill.offsetWidth;
  revealPill.classList.add("is-active");
  clearTimeout(revealPill._hideTimer);
  revealPill._hideTimer = setTimeout(() => {
    revealPill.classList.remove("is-active");
    revealPill.hidden = true;
  }, 1150);
}

function setInputStatus(message, { hint = false } = {}) {
  if (statusEl) statusEl.textContent = message || "";
  if (!inputEl) return;
  inputEl.placeholder = message || DEFAULT_INPUT_PLACEHOLDER;
  inputEl.classList.toggle("input-status-hint", Boolean(message) && hint);
}

let statusHintTimeout = null;
function showStatusHint(message) {
  if (statusHintTimeout) clearTimeout(statusHintTimeout);
  if (!message) {
    setInputStatus(DEFAULT_STATUS);
    return;
  }
  setInputStatus(message, { hint: true });
  statusHintTimeout = setTimeout(() => {
    setInputStatus(DEFAULT_STATUS);
  }, 1500);
}

function handleInputEvent(e) {
  startTimer();
  const value = e.target.value;
  if (!value.includes(",")) return;
  const parts = value.split(",");
  parts.slice(0, -1).forEach(handleGuess);
  e.target.value = parts[parts.length - 1];
}

function handleLiveMatch(e) {
  const value = e.target.value;
  const normalized = normalizeGuess(value);
  if (!normalized) return;
  if (state.guessIndex.has(normalized) && !state.guessPrefixes.has(normalized)) {
    handleGuess(value);
    e.target.value = "";
  }
}

function handleKeydown(e) {
  if (e.key !== "Enter") return;
  startTimer();
  const value = e.target.value;
  handleGuess(value);
  e.target.value = "";
}

async function loadGenerations() {
  const data = await pokedex.getGenerationsList({ limit: 40 });
  const gens = data && data.results ? data.results : [];
  const generationMap = new Map();
  const genDetails = await pokedex.resource(gens.map((gen) => gen.url));
  const entries = (genDetails || []).map((genData) => {
    if (!genData) return null;
    const species = genData.pokemon_species || [];
    const names = species.map((s) => normalizeName(s.name)).filter(Boolean);
    names.forEach((name) => generationMap.set(name, genData.name));
    return { name: genData.name, label: prettifyName(genData.name), names };
  });
  return { entries: entries.filter(Boolean), generationMap };
}

async function loadTypes() {
  const data = await pokedex.getTypesList({ limit: 40 });
  const types = (data && data.results ? data.results : []).filter(
    (type) => type.name !== "unknown" && type.name !== "shadow"
  );
  const typeMap = new Map();
  const typeDetails = await pokedex.resource(types.map((type) => type.url));
  const entries = (typeDetails || []).map((typeData) => {
    if (!typeData) return null;
    const pokemon = typeData.pokemon || [];
    const names = pokemon
      .map((p) => normalizeName(p.pokemon.name))
      .filter(Boolean);
    names.forEach((name) => {
      if (!typeMap.has(name)) typeMap.set(name, new Set());
      typeMap.get(name).add(typeData.name);
    });
    return {
      name: typeData.name,
      label: prettifyName(typeData.name),
      names,
      id: typeData.id
    };
  });
  return { entries: entries.filter(Boolean), typeMap };
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
      const chip = document.createElement("label");
      chip.className = "chip chip--type";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = entry.name;
      const icon = document.createElement("img");
      icon.alt = `${entry.label} type`;
      icon.src = `${typeIconBase}${entry.id}.png`;
      const text = document.createElement("span");
      text.textContent = entry.label;
      chip.appendChild(input);
      chip.appendChild(icon);
      chip.appendChild(text);
      input.addEventListener("change", onTypeChipChange);
      typeFilter.appendChild(chip);
    });
  syncChipGroup(typeFilter);
}

function onTypeChipChange(e) {
  handleChipGroupChange(typeFilter, e);
  applyFilters();
}

function getSelectedTypes() {
  return getSelectedFromChips(typeFilter);
}

function populateGenChips(entries) {
  if (!genFilter) return;
  genFilter.innerHTML = "";

  const allChip = createChip("All", "all", true);
  genFilter.appendChild(allChip);

  entries
    .slice()
    .sort((a, b) => generationOrder(a.name) - generationOrder(b.name))
    .forEach((entry) => {
      const chip = createChip(formatGenerationLabel(entry.name), entry.name, false);
      genFilter.appendChild(chip);
    });
  syncChipGroup(genFilter);
}

function createChip(label, value, checked) {
  return createChipWithHandler(label, value, checked, onGenChipChange);
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

function onGenChipChange(e) {
  handleChipGroupChange(genFilter, e);
  applyFilters();
}

function getSelectedGenerations() {
  return getSelectedFromChips(genFilter);
}

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
}

function getSelectedFromChips(container) {
  const { allBox, others } = getChipGroupBoxes(container);
  if (!allBox) return [];
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

function applyFilters() {
  const selectedGens = getSelectedGenerations();
  const selectedTypes = getSelectedTypes();
  let filtered = state.allNames.slice();

  if (selectedGens.length) {
    const genUnion = new Set();
    selectedGens.forEach((gen) => {
      const genSet = state.generationIndex.get(gen) || new Set();
      genSet.forEach((name) => genUnion.add(name));
    });
    filtered = filtered.filter((name) => genUnion.has(name));
  }

  if (selectedTypes.length) {
    const typeUnion = new Set();
    selectedTypes.forEach((type) => {
      const typeSet = state.typeIndex.get(type) || new Set();
      typeSet.forEach((name) => typeUnion.add(name));
    });
    filtered = filtered.filter((name) => typeUnion.has(name));
  }

  state.names = filtered;
  updateStats();
  renderSprites();
  buildGuessIndex();
  syncChipGroup(typeFilter);
  syncChipGroup(genFilter);
  saveState();
}

function buildGuessIndex() {
  state.guessIndex.clear();
  state.guessPrefixes.clear();
  state.names.forEach((canonical) => {
    const labels = state.namesByLang.get(canonical);
    const localizedLabels = [
      labels && labels.get("en") ? labels.get("en") : state.normalizedMap.get(canonical),
      labels && labels.get("de") ? labels.get("de") : null,
      labels && labels.get("es") ? labels.get("es") : null
    ];

    localizedLabels.forEach((label) => {
      const guess = normalizeGuess(label);
      if (!guess) return;
      state.guessIndex.set(guess, canonical);
      addPrefixes(guess);
    });

    const fallbackGuess = normalizeGuess(state.normalizedMap.get(canonical));
    if (fallbackGuess) {
      state.guessIndex.set(fallbackGuess, canonical);
      addPrefixes(fallbackGuess);
    }
  });
}

function addPrefixes(value) {
  if (value.length < 3) return;
  for (let i = 2; i < value.length; i += 1) {
    state.guessPrefixes.add(value.slice(0, i));
  }
}

async function loadPokemon() {
  setInputStatus("Loading Pokemon list...");
  if (retryBtn) retryBtn.hidden = true;
  try {
    const [speciesData, generationData, typeData] = await Promise.all([
      pokedex.getPokemonSpeciesList({ limit: 2000 }),
      loadGenerations(),
      loadTypes()
    ]);
    const speciesEntries = speciesData && speciesData.results ? speciesData.results : [];
    const names = [];
    state.normalizedMap.clear();
    state.meta = new Map();
    state.generationIndex = new Map();
    state.typeIndex = new Map();
    state.guessIndex.clear();
    state.namesByLang.clear();

    speciesEntries.forEach((entry) => {
      const normalized = normalizeName(entry.name);
      if (!normalized) return;
      names.push(normalized);
      const label = prettifyName(entry.name);
      state.normalizedMap.set(normalized, label);
      let sprite = "";
      const generation = generationData.generationMap.get(normalized) || "Unknown";
      const types =
        typeData.typeMap.has(normalized)
          ? [...typeData.typeMap.get(normalized)].sort()
          : [];
      if (entry.url) {
        const match = entry.url.match(/\/pokemon-species\/(\d+)\//);
      if (match) {
          sprite = `${spriteBase}${match[1]}.png`;
          entry.cryId = match[1];
      }
      }
      state.meta.set(normalized, {
        label,
        sprite,
        cryUrl: "",
        cryId: entry.cryId || "",
        dexId: entry.cryId || "",
        generation: formatGenerationLabel(generation),
        types: types.map(prettifyName),
        normalized
      });
    });

    const speciesByName = new Map();
    speciesEntries.forEach((entry) => {
      const normalized = normalizeName(entry.name);
      if (normalized) speciesByName.set(normalized, entry.url);
    });

    const detailUrls = names
      .map((canonical) => speciesByName.get(canonical))
      .filter(Boolean);
    const speciesDetails = detailUrls.length
      ? await pokedex.resource(detailUrls)
      : [];

    speciesDetails.forEach((detail) => {
      if (!detail || !detail.name) return;
      const canonical = normalizeName(detail.name);
      if (!canonical) return;
      const namesByLang = new Map();
      (detail.names || []).forEach((nameEntry) => {
        if (!nameEntry || !nameEntry.language) return;
        if (nameEntry.language.name === "en") {
          namesByLang.set("en", nameEntry.name);
        }
        if (nameEntry.language.name === "de") {
          namesByLang.set("de", nameEntry.name);
        }
        if (nameEntry.language.name === "es") {
          namesByLang.set("es", nameEntry.name);
        }
      });
      state.namesByLang.set(canonical, namesByLang);
    });

    state.allNames = names;
    generationData.entries.forEach((entry) => {
      state.generationIndex.set(
        entry.name,
        new Set(entry.names.map(normalizeName))
      );
    });
    typeData.entries.forEach((entry) => {
      state.typeIndex.set(entry.name, new Set(entry.names.map(normalizeName)));
    });

    populateGenChips(generationData.entries);
    populateTypeChips(typeData.entries);
    initThemes();
    restoreSettings();
    restoreState();
    applyFilters();
    buildGuessIndex();
    setInputStatus(DEFAULT_STATUS);
  } catch (err) {
    const message =
      err && err.name === "AbortError"
        ? "PokeAPI is taking too long. Click retry."
        : "Could not load PokeAPI. Check your connection.";
    setInputStatus(message);
    if (retryBtn) retryBtn.hidden = false;
  }
}

inputEl.addEventListener("input", handleInputEvent);
inputEl.addEventListener("keydown", handleKeydown);
inputEl.addEventListener("input", handleLiveMatch);
resetBtn.addEventListener("click", confirmReset);
if (resetBtnCompact) resetBtnCompact.addEventListener("click", confirmReset);
if (retryBtn) retryBtn.addEventListener("click", loadPokemon);
if (groupFilter) groupFilter.addEventListener("change", renderSprites);
if (outlineToggle) {
  outlineToggle.checked = false;
  document.body.classList.add("outlines-off");
  outlineToggle.addEventListener("change", () => {
    document.body.classList.toggle("outlines-off", !outlineToggle.checked);
    saveSettings();
  });
}

if (compactToggle) {
  compactToggle.textContent = "Compact Mode";
  compactToggle.addEventListener("click", () => {
    const isCompact = document.body.classList.toggle("compact-mode");
    compactToggle.textContent = isCompact ? "Normal Mode" : "Compact Mode";
    renderSprites();
    saveSettings();
  });
}

if (filtersToggle) {
  document.body.classList.add("sidebar-collapsed");
  const updateSettingsLabel = (collapsed) => {
    const label = collapsed ? "Show Settings" : "Hide Settings";
    if (filtersToggle) filtersToggle.textContent = label;
    if (filtersToggleCompact) filtersToggleCompact.textContent = label;
  };
  updateSettingsLabel(true);
  const toggleSettings = () => {
    const collapsed = document.body.classList.toggle("sidebar-collapsed");
    updateSettingsLabel(collapsed);
    saveSettings();
  };
  filtersToggle.addEventListener("click", toggleSettings);
  if (filtersToggleCompact) filtersToggleCompact.addEventListener("click", toggleSettings);
}

if (settingsClose) {
  settingsClose.addEventListener("click", () => {
    document.body.classList.add("sidebar-collapsed");
    if (filtersToggle) filtersToggle.textContent = "Show Settings";
    if (filtersToggleCompact) filtersToggleCompact.textContent = "Show Settings";
    saveSettings();
    focusInput();
  });
}

if (legacyCriesToggle) {
  legacyCriesToggle.addEventListener("change", () => {
    if (state.cryAudio) state.cryAudio.pause();
    saveSettings();
  });
}

if (criesToggle) {
  criesToggle.checked = false;
  criesToggle.addEventListener("change", saveSettings);
}

if (showDexToggle) {
  showDexToggle.addEventListener("change", () => {
    renderSprites();
    saveSettings();
  });
}

if (shinyToggle) {
  shinyToggle.checked = false;
  shinyToggle.addEventListener("change", () => {
    renderSprites();
    if (infoModal && !infoModal.classList.contains("hidden") && state.activeEntry) {
      if (infoSprite) infoSprite.src = getSpriteForEntry(state.activeEntry);
    }
    saveSettings();
  });
}

if (settingsReset) {
  settingsReset.addEventListener("click", resetSettings);
}

if (darkToggle) {
  darkToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark-mode", darkToggle.checked);
    saveSettings();
  });
}

if (spriteGrid) {
  spriteGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".sprite-card");
    if (!card || card.classList.contains("sprite-card--hidden")) return;
    const key = card.dataset.pokemon;
    if (!key) return;
    const entry = state.meta.get(key);
    if (entry) openInfoModal(entry);
  });
}

if (infoClose) infoClose.addEventListener("click", closeInfoModal);
if (infoModal) {
  infoModal.addEventListener("click", (event) => {
    if (event.target === infoModal) closeInfoModal();
  });
}

if (inputEl) {
  focusInput();
  document.addEventListener("click", (event) => {
    if (!inputEl) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (
      target.closest(
        "input, textarea, select, button, a, label, .sidebar, .modal, .sprite-board, .sprite-card"
      )
    ) {
      return;
    }
    focusInput();
  });
}

if (inputEl) {
  const inputWrap = inputEl.closest(".input-wrap");
  if (inputWrap) {
    const onScroll = () => {
      const shouldFloat = window.scrollY > 140;
      inputWrap.classList.toggle("is-floating", shouldFloat);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./pokeapi-js-wrapper-sw.js", { scope: "./" })
      .catch(() => {});
  });
}

loadPokemon();
