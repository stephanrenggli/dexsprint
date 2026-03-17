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
  cryAudio: null,
  isRestoring: false,
  lastSavedSec: -1,
  infoCache: new Map(),
  timerId: null,
  startTime: null
};

const totalCount = document.getElementById("total-count");
const foundCount = document.getElementById("found-count");
const remainingCount = document.getElementById("remaining-count");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("status");
const inputEl = document.getElementById("name-input");
const retryBtn = document.getElementById("retry-btn");
const genFilter = document.getElementById("gen-filter");
const typeFilter = document.getElementById("type-filter");
const groupFilter = document.getElementById("group-filter");
const spriteGrid = document.getElementById("sprite-grid");
const progressBar = document.getElementById("progress-bar");
const progressValue = document.getElementById("progress-value");
const resetBtn = document.getElementById("reset-btn");
const outlineToggle = document.getElementById("outline-toggle");
const filtersToggle = document.getElementById("filters-toggle");
const compactToggle = document.getElementById("compact-toggle");
const criesToggle = document.getElementById("cries-toggle");
const legacyCriesToggle = document.getElementById("legacy-cries-toggle");
const settingsClose = document.getElementById("settings-close");
const showDexToggle = document.getElementById("show-dex-toggle");
const settingsReset = document.getElementById("settings-reset");
const infoModal = document.getElementById("info-modal");
const infoClose = document.getElementById("info-close");
const infoSprite = document.getElementById("info-sprite");
const infoTitle = document.getElementById("info-title");
const infoMeta = document.getElementById("info-meta");
const infoTypes = document.getElementById("info-types");
const infoGenus = document.getElementById("info-genus");
const infoSize = document.getElementById("info-size");
const infoAbilities = document.getElementById("info-abilities");

const speciesUrl = "https://pokeapi.co/api/v2/pokemon-species?limit=2000";
const generationUrl = "https://pokeapi.co/api/v2/generation?limit=40";
const typeUrl = "https://pokeapi.co/api/v2/type?limit=40";
const typeIconBase =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/small/";
const spriteFallback =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png";
const criesLatestBase =
  "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/";
const criesLegacyBase =
  "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy/";
const STORAGE_KEY = "pokequiz-state";
const DEFAULT_STATUS = "Start typing to guess Pokemon names.";

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
    const base = useLegacy ? criesLegacyBase : criesLatestBase;
    state.cryAudio.src = `${base}${entry.cryId}.ogg`;
    state.cryAudio.volume = 0.1;
    await state.cryAudio.play();
  } catch (err) {
    // no-op: audio is optional
  }
}

function startTimer(preserveStart = false) {
  if (state.timerId) return;
  if (!preserveStart || !state.startTime) {
    state.startTime = Date.now();
  }
  state.timerId = setInterval(() => {
    const delta = Math.floor((Date.now() - state.startTime) / 1000);
    timerEl.textContent = formatTime(delta);
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

  if (groupFilter && data.group) groupFilter.value = data.group;

  setChipGroupSelections(genFilter, data.gens || []);
  setChipGroupSelections(typeFilter, data.types || []);

  if (Array.isArray(data.found)) {
    state.found = new Set(data.found);
  }

  if (data.elapsed) {
    timerEl.textContent = formatTime(data.elapsed);
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
    sidebarCollapsed: document.body.classList.contains("sidebar-collapsed")
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
  } else if (filtersToggle) {
    filtersToggle.textContent = "Hide Settings";
  }
  if (criesToggle) criesToggle.checked = Boolean(data.cries);
  if (legacyCriesToggle) legacyCriesToggle.checked = Boolean(data.legacyCries);
  if (showDexToggle) showDexToggle.checked = Boolean(data.showDex);
}

function resetSettings() {
  localStorage.removeItem(`${STORAGE_KEY}:settings`);
  document.body.classList.remove("compact-mode");
  document.body.classList.add("outlines-off");
  document.body.classList.add("sidebar-collapsed");
  if (compactToggle) compactToggle.textContent = "Compact Mode";
  if (filtersToggle) filtersToggle.textContent = "Show Settings";
  if (criesToggle) criesToggle.checked = false;
  if (legacyCriesToggle) legacyCriesToggle.checked = false;
  if (showDexToggle) showDexToggle.checked = false;
  if (outlineToggle) outlineToggle.checked = false;
  if (groupFilter) groupFilter.value = "generation";
  setChipGroupSelections(genFilter, []);
  setChipGroupSelections(typeFilter, []);
  applyFilters();
}

function updateStats() {
  const total = state.names.length;
  const found = state.names.filter((name) => state.found.has(name)).length;
  totalCount.textContent = total;
  foundCount.textContent = found;
  remainingCount.textContent = total - found;
  const progress = total === 0 ? 0 : (found / total) * 100;
  progressBar.style.width = `${progress.toFixed(1)}%`;
  if (progressValue) progressValue.textContent = `${Math.round(progress)}%`;
}


function renderSprites() {
  if (!spriteGrid) return;
  spriteGrid.innerHTML = "";
  spriteGrid.className = "sprite-grid";
  if (groupFilter && groupFilter.value !== "none") {
    renderSpritesGrouped();
    return;
  }
  state.names.forEach((name) => {
    const entry = state.meta.get(name);
    if (!entry) return;
    const card = document.createElement("div");
    const isFound = state.found.has(name);
    card.className = isFound ? "sprite-card" : "sprite-card sprite-card--hidden";
    card.dataset.pokemon = entry.normalized;

    const img = document.createElement("img");
    img.src = entry.sprite || spriteFallback;
    img.alt = isFound ? entry.label : "Unknown Pokemon";
    img.loading = "lazy";
    img.decoding = "async";

    const label = document.createElement("span");
    label.className = "sprite-card__name";
    label.textContent = isFound ? entry.label : getHiddenLabel(entry);

    card.appendChild(img);
    card.appendChild(label);
    spriteGrid.appendChild(card);
  });
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
        const card = document.createElement("div");
        const isFound = state.found.has(entry.normalized);
        card.className = isFound ? "sprite-card" : "sprite-card sprite-card--hidden";
        card.dataset.pokemon = entry.normalized;

        const img = document.createElement("img");
        img.src = entry.sprite || spriteFallback;
        img.alt = isFound ? entry.label : "Unknown Pokemon";
        img.loading = "lazy";
        img.decoding = "async";

        const label = document.createElement("span");
        label.className = "sprite-card__name";
        label.textContent = isFound ? entry.label : getHiddenLabel(entry);

        card.appendChild(img);
        card.appendChild(label);
        grid.appendChild(card);
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
  timerEl.textContent = "00:00";
  inputEl.value = "";
  updateStats();
  renderSprites();
  clearState();
}

async function openInfoModal(entry) {
  if (!entry || !infoModal) return;
  if (infoTitle) infoTitle.textContent = entry.label;
  if (infoSprite) {
    infoSprite.src = entry.sprite || spriteFallback;
    infoSprite.alt = entry.label;
  }
  if (infoMeta) infoMeta.textContent = entry.generation || "";
  if (infoTypes) infoTypes.textContent = "";
  if (infoGenus) infoGenus.textContent = "Loading details...";
  if (infoSize) infoSize.textContent = "";
  if (infoAbilities) infoAbilities.textContent = "";
  infoModal.classList.remove("hidden");

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
  const [pokemonRes, speciesRes] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${entry.dexId}`),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${entry.dexId}`)
  ]);
  if (!pokemonRes.ok || !speciesRes.ok) return null;
  const pokemon = await pokemonRes.json();
  const species = await speciesRes.json();

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

function handleGuess(value) {
  const normalized = normalizeGuess(value);
  if (!normalized) return;
  const canonical = state.guessIndex.get(normalized);
  if (canonical && state.names.includes(canonical)) {
    const isNew = !state.found.has(canonical);
    state.found.add(canonical);
    updateStats();
    renderSprites();
    if (isNew) {
      playCry(canonical);
      saveState();
      showStatusHint("");
    } else {
      showStatusHint("Already found!");
    }
  }
}

let statusHintTimeout = null;
function showStatusHint(message) {
  if (!statusEl) return;
  if (statusHintTimeout) clearTimeout(statusHintTimeout);
  if (!message) {
    statusEl.classList.remove("hint");
    statusEl.textContent = DEFAULT_STATUS;
    return;
  }
  statusEl.classList.add("hint");
  statusEl.textContent = message;
  statusHintTimeout = setTimeout(() => {
    statusEl.classList.remove("hint");
    statusEl.textContent = DEFAULT_STATUS;
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

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function loadGenerations() {
  const res = await fetchWithTimeout(generationUrl, 10000);
  if (!res.ok) throw new Error("Failed to load generations");
  const data = await res.json();
  const gens = data.results || [];
  const generationMap = new Map();
  const entries = await Promise.all(
    gens.map(async (gen) => {
      const genRes = await fetchWithTimeout(gen.url, 10000);
      if (!genRes.ok) return null;
      const genData = await genRes.json();
      const species = genData.pokemon_species || [];
      const names = species.map((s) => normalizeName(s.name)).filter(Boolean);
      names.forEach((name) => generationMap.set(name, genData.name));
      return { name: genData.name, label: prettifyName(genData.name), names };
    })
  );
  return { entries: entries.filter(Boolean), generationMap };
}

async function loadTypes() {
  const res = await fetchWithTimeout(typeUrl, 10000);
  if (!res.ok) throw new Error("Failed to load types");
  const data = await res.json();
  const types = (data.results || []).filter(
    (type) => type.name !== "unknown" && type.name !== "shadow"
  );
  const typeMap = new Map();
  const entries = await Promise.all(
    types.map(async (type) => {
      const typeRes = await fetchWithTimeout(type.url, 10000);
      if (!typeRes.ok) return null;
      const typeData = await typeRes.json();
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
    })
  );
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
    const enLabel =
      labels && labels.get("en")
        ? labels.get("en")
        : state.normalizedMap.get(canonical);
    const deLabel = labels && labels.get("de") ? labels.get("de") : null;

    const enGuess = normalizeGuess(enLabel);
    if (enGuess) {
      state.guessIndex.set(enGuess, canonical);
      addPrefixes(enGuess);
    }

    if (deLabel) {
      const deGuess = normalizeGuess(deLabel);
      if (deGuess) {
        state.guessIndex.set(deGuess, canonical);
        addPrefixes(deGuess);
      }
    }

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
  statusEl.textContent = "Loading Pokemon list...";
  if (retryBtn) retryBtn.hidden = true;
  try {
    const [speciesRes, generationData, typeData] = await Promise.all([
      fetchWithTimeout(speciesUrl, 10000),
      loadGenerations(),
      loadTypes()
    ]);
    if (!speciesRes.ok) throw new Error("Failed to load species list");
    const speciesData = await speciesRes.json();
    const speciesEntries = speciesData.results || [];
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
          sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${match[1]}.png`;
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

    const speciesDetails = await Promise.all(
      names.map(async (canonical) => {
        const url = speciesByName.get(canonical);
        if (!url) return null;
        const resDetail = await fetchWithTimeout(url, 10000);
        if (!resDetail.ok) return null;
        return resDetail.json();
      })
    );

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
    restoreSettings();
    restoreState();
    applyFilters();
    buildGuessIndex();
    statusEl.textContent = DEFAULT_STATUS;
  } catch (err) {
    const message =
      err && err.name === "AbortError"
        ? "PokeAPI is taking too long. Click retry."
        : "Could not load PokeAPI. Check your connection.";
    statusEl.textContent = message;
    if (retryBtn) retryBtn.hidden = false;
  }
}

inputEl.addEventListener("input", handleInputEvent);
inputEl.addEventListener("keydown", handleKeydown);
inputEl.addEventListener("input", handleLiveMatch);
resetBtn.addEventListener("click", resetQuiz);
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
    saveSettings();
  });
}

if (filtersToggle) {
  document.body.classList.add("sidebar-collapsed");
  filtersToggle.textContent = "Show Settings";
  filtersToggle.addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("sidebar-collapsed");
    filtersToggle.textContent = collapsed ? "Show Settings" : "Hide Settings";
    saveSettings();
  });
}

if (settingsClose) {
  settingsClose.addEventListener("click", () => {
    document.body.classList.add("sidebar-collapsed");
    if (filtersToggle) filtersToggle.textContent = "Show Settings";
    saveSettings();
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

if (settingsReset) {
  settingsReset.addEventListener("click", resetSettings);
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

loadPokemon();
