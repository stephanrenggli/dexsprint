const state = {
  names: [],
  allNames: [],
  normalizedMap: new Map(),
  meta: new Map(),
  generationIndex: new Map(),
  typeIndex: new Map(),
  guessIndex: new Map(),
  namesByLang: new Map(),
  found: new Set(),
  audioCtx: null,
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

const apiUrl = "https://pokeapi.co/api/v2/pokemon?limit=2000";
const speciesUrl = "https://pokeapi.co/api/v2/pokemon-species?limit=2000";
const generationUrl = "https://pokeapi.co/api/v2/generation?limit=40";
const typeUrl = "https://pokeapi.co/api/v2/type?limit=40";
const spriteFallback =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png";

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
    "generation-i": "Generation I — Kanto",
    "generation-ii": "Generation II — Johto",
    "generation-iii": "Generation III — Hoenn",
    "generation-iv": "Generation IV — Sinnoh",
    "generation-v": "Generation V — Unova",
    "generation-vi": "Generation VI — Kalos",
    "generation-vii": "Generation VII — Alola",
    "generation-viii": "Generation VIII — Galar",
    "generation-ix": "Generation IX — Paldea"
  };
  return map[genName] || prettifyName(genName);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function playTone(type) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!state.audioCtx) state.audioCtx = new AudioCtx();
    const ctx = state.audioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    const settings =
      type === "correct"
        ? { freq: 740, gain: 0.18, dur: 0.14 }
        : { freq: 220, gain: 0.2, dur: 0.2 };

    osc.type = "sine";
    osc.frequency.setValueAtTime(settings.freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(settings.gain, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + settings.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + settings.dur + 0.05);
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

  [...groups.keys()]
    .sort()
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
    if (isNew) playTone("correct");
  } else {
    playTone("wrong");
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
    .sort((a, b) => a.label.localeCompare(b.label))
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
  state.names.forEach((canonical) => {
    const labels = state.namesByLang.get(canonical);
    const enLabel =
      labels && labels.get("en")
        ? labels.get("en")
        : state.normalizedMap.get(canonical);
    const deLabel = labels && labels.get("de") ? labels.get("de") : null;

    const enGuess = normalizeGuess(enLabel);
    if (enGuess) state.guessIndex.set(enGuess, canonical);

    if (deLabel) {
      const deGuess = normalizeGuess(deLabel);
      if (deGuess) state.guessIndex.set(deGuess, canonical);
    }

    const fallbackGuess = normalizeGuess(state.normalizedMap.get(canonical));
    if (fallbackGuess) state.guessIndex.set(fallbackGuess, canonical);
  });
}

async function loadPokemon() {
  statusEl.textContent = "Loading Pokemon list...";
  if (retryBtn) retryBtn.hidden = true;
  try {
    const [res, speciesRes, generationData, typeData] = await Promise.all([
      fetchWithTimeout(apiUrl, 10000),
      fetchWithTimeout(speciesUrl, 10000),
      loadGenerations(),
      loadTypes()
    ]);
    if (!res.ok) throw new Error("Failed to load list");
    if (!speciesRes.ok) throw new Error("Failed to load species list");
    const data = await res.json();
    const speciesData = await speciesRes.json();
    const entries = data.results || [];
    const speciesEntries = speciesData.results || [];
    const names = [];
    state.normalizedMap.clear();
    state.meta = new Map();
    state.generationIndex = new Map();
    state.typeIndex = new Map();
    state.guessIndex.clear();
    state.namesByLang.clear();

    entries.forEach((entry) => {
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
        const match = entry.url.match(/\/pokemon\/(\d+)\//);
        if (match) {
          sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${match[1]}.png`;
        }
      }
      state.meta.set(normalized, {
        label,
        sprite,
        generation: prettifyName(generation),
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

if (filtersToggle) {
  document.body.classList.add("filters-collapsed");
  filtersToggle.textContent = "Show Filters";
  filtersToggle.addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("filters-collapsed");
    filtersToggle.textContent = collapsed ? "Show Filters" : "Hide Filters";
  });
}

loadPokemon();
