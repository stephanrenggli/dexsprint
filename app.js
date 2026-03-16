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
  audioCtx: null,
  cryAudio: null,
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
const foundList = document.getElementById("found-list");
const missingList = document.getElementById("missing-list");
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

const speciesUrl = "https://pokeapi.co/api/v2/pokemon-species?limit=2000";
const generationUrl = "https://pokeapi.co/api/v2/generation?limit=40";
const typeUrl = "https://pokeapi.co/api/v2/type?limit=40";
const spriteFallback =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png";
const criesLatestBase =
  "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/";
const criesLegacyBase =
  "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy/";

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

function startTimer() {
  if (state.timerId) return;
  state.startTime = Date.now();
  state.timerId = setInterval(() => {
    const delta = Math.floor((Date.now() - state.startTime) / 1000);
    timerEl.textContent = formatTime(delta);
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
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

function renderFound() {
  foundList.innerHTML = "";
  state.names
    .filter((name) => state.found.has(name))
    .map((name) => state.normalizedMap.get(name))
    .sort()
    .forEach((label) => {
      const pill = document.createElement("span");
      pill.textContent = label;
      foundList.appendChild(pill);
    });
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

    const img = document.createElement("img");
    img.src = entry.sprite || spriteFallback;
    img.alt = isFound ? entry.label : "Unknown Pokemon";
    img.loading = "lazy";
    img.decoding = "async";

    const label = document.createElement("span");
    label.className = "sprite-card__name";
    label.textContent = isFound ? entry.label : "???";

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

  [...groups.keys()]
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

        const img = document.createElement("img");
        img.src = entry.sprite || spriteFallback;
        img.alt = isFound ? entry.label : "Unknown Pokemon";
        img.loading = "lazy";
        img.decoding = "async";

        const label = document.createElement("span");
        label.className = "sprite-card__name";
        label.textContent = isFound ? entry.label : "???";

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
  renderFound();
  renderSprites();
}

function handleGuess(value) {
  const normalized = normalizeGuess(value);
  if (!normalized) return;
  const canonical = state.guessIndex.get(normalized);
  if (canonical && state.names.includes(canonical)) {
    const isNew = !state.found.has(canonical);
    state.found.add(canonical);
    updateStats();
    renderFound();
    renderSprites();
    if (isNew) playCry(canonical);
  }
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
      return { name: typeData.name, label: prettifyName(typeData.name), names };
    })
  );
  return { entries: entries.filter(Boolean), typeMap };
}

function populateFilterOptions(selectEl, entries, allLabel) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = allLabel;
  selectEl.appendChild(allOption);
  entries
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label))
    .forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.name;
      option.textContent = entry.label;
      selectEl.appendChild(option);
    });
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
}

function createChip(label, value, checked) {
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
  input.addEventListener("change", onGenChipChange);
  return chip;
}

function onGenChipChange(e) {
  const value = e.target.value;
  if (!genFilter) return;
  const checkboxes = [...genFilter.querySelectorAll("input[type='checkbox']")];
  const allBox = checkboxes.find((box) => box.value === "all");
  const otherBoxes = checkboxes.filter((box) => box.value !== "all");

  if (value === "all" && e.target.checked) {
    otherBoxes.forEach((box) => (box.checked = false));
  } else if (value !== "all" && e.target.checked && allBox) {
    allBox.checked = false;
  }

  if (value !== "all") {
    const anyChecked = otherBoxes.some((box) => box.checked);
    if (!anyChecked && allBox) {
      allBox.checked = true;
    }
  }

  applyFilters();
}

function getSelectedGenerations() {
  if (!genFilter) return [];
  const checkboxes = [...genFilter.querySelectorAll("input[type='checkbox']")];
  const allBox = checkboxes.find((box) => box.value === "all");
  if (allBox && allBox.checked) return [];
  return checkboxes
    .filter((box) => box.value !== "all" && box.checked)
    .map((box) => box.value);
}

function applyFilters() {
  const selectedGens = getSelectedGenerations();
  const typeValue = typeFilter ? typeFilter.value : "all";
  let filtered = state.allNames.slice();

  if (selectedGens.length) {
    const genUnion = new Set();
    selectedGens.forEach((gen) => {
      const genSet = state.generationIndex.get(gen) || new Set();
      genSet.forEach((name) => genUnion.add(name));
    });
    filtered = filtered.filter((name) => genUnion.has(name));
  }

  if (typeValue !== "all") {
    const typeSet = state.typeIndex.get(typeValue) || new Set();
    filtered = filtered.filter((name) => typeSet.has(name));
  }

  state.names = filtered;
  updateStats();
  renderFound();
  renderSprites();
  buildGuessIndex();
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
    populateFilterOptions(typeFilter, typeData.entries, "All Types");
    applyFilters();
    buildGuessIndex();
    statusEl.textContent = "Start typing to guess Pokemon names.";
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
if (typeFilter) typeFilter.addEventListener("change", applyFilters);
if (groupFilter) groupFilter.addEventListener("change", renderSprites);
if (outlineToggle) {
  document.body.classList.add("outlines-off");
  outlineToggle.textContent = "Show Outlines";
  outlineToggle.addEventListener("click", () => {
    const isOff = document.body.classList.toggle("outlines-off");
    outlineToggle.textContent = isOff ? "Show Outlines" : "Hide Outlines";
  });
}

if (compactToggle) {
  compactToggle.textContent = "Compact Mode";
  compactToggle.addEventListener("click", () => {
    const isCompact = document.body.classList.toggle("compact-mode");
    compactToggle.textContent = isCompact ? "Normal Mode" : "Compact Mode";
  });
}

if (filtersToggle) {
  document.body.classList.add("sidebar-collapsed");
  filtersToggle.textContent = "Show Settings";
  filtersToggle.addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("sidebar-collapsed");
    filtersToggle.textContent = collapsed ? "Show Settings" : "Hide Settings";
  });
}

if (settingsClose) {
  settingsClose.addEventListener("click", () => {
    document.body.classList.add("sidebar-collapsed");
    if (filtersToggle) filtersToggle.textContent = "Show Settings";
  });
}

if (legacyCriesToggle) {
  legacyCriesToggle.addEventListener("change", () => {
    if (state.cryAudio) state.cryAudio.pause();
  });
}

loadPokemon();
