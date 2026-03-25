const state = {
  names: [],
  allNames: [],
  activeNames: new Set(),
  meta: new Map(),
  generationIndex: new Map(),
  typeIndex: new Map(),
  guessIndex: new Map(),
  guessByLength: new Map(),
  guessPrefixes: new Set(),
  namesByLang: new Map(),
  studyDeck: [],
  studyCurrent: null,
  studyRevealed: false,
  found: new Set(),
  recentlyFound: new Set(),
  cryAudio: null,
  isRestoring: false,
  lastSavedSec: -1,
  hasCelebratedCompletion: false,
  badgesPrimed: false,
  infoCache: new Map(),
  timerId: null,
  startTime: null,
  savedElapsed: 0,
  activeEntry: null,
  seenBadges: new Set()
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
const filtersPanel = document.getElementById("filters-panel");
const filtersPanelToggle = document.getElementById("filters-panel-toggle");
const filterSummary = document.getElementById("filter-summary");
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
const gameModeSelect = document.getElementById("game-mode");
const typoModeSelect = document.getElementById("typo-mode");
const autocorrectToggle = document.getElementById("autocorrect-toggle");
const badgeHeading = document.getElementById("badge-heading");
const badgeList = document.getElementById("badge-list");
const achievementToast = document.getElementById("achievement-toast");
const achievementToastIcon = document.getElementById("achievement-toast-icon");
const achievementToastTitle = document.getElementById("achievement-toast-title");
const infoModal = document.getElementById("info-modal");
const infoClose = document.getElementById("info-close");
const infoSprite = document.getElementById("info-sprite");
const infoTitle = document.getElementById("info-title");
const infoMeta = document.getElementById("info-meta");
const infoTypes = document.getElementById("info-types");
const infoGenus = document.getElementById("info-genus");
const infoAbilities = document.getElementById("info-abilities");
const infoStats = document.getElementById("info-stats");
const infoFacts = document.getElementById("info-facts");
const confirmModal = document.getElementById("confirm-modal");
const confirmClose = document.getElementById("confirm-close");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmStats = document.getElementById("confirm-stats");
const confirmCancel = document.getElementById("confirm-cancel");
const confirmAccept = document.getElementById("confirm-accept");
const progressCodeEl = document.getElementById("progress-code");
const progressExportBtn = document.getElementById("progress-export");
const progressCopyBtn = document.getElementById("progress-copy");
const progressImportBtn = document.getElementById("progress-import");
const progressFeedbackEl = document.getElementById("progress-feedback");
const progressIncludeSettingsEl = document.getElementById("progress-include-settings");
const studyPanel = document.getElementById("study-panel");
const studySubtitle = document.getElementById("study-subtitle");
const studyCounter = document.getElementById("study-counter");
const studyCard = document.getElementById("study-card");
const studySpriteWrap = document.querySelector(".study-card__sprite-wrap");
const studySprite = document.getElementById("study-sprite");
const studyMeta = document.getElementById("study-meta");
const studyTypes = document.getElementById("study-types");
const studyName = document.getElementById("study-name");
const studyActions = document.getElementById("study-actions");
const studyRevealBtn = document.getElementById("study-reveal");
const studyNextBtn = document.getElementById("study-next");

const pokedex = new Pokedex.Pokedex({
  cache: true,
  timeout: 10000,
  cacheImages: true
});
const typeIconBase =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/small/";
const themeConfigEl = document.getElementById("theme-config");
const themeConfig = themeConfigEl
  ? JSON.parse(themeConfigEl.textContent)
  : { defaultTheme: "normal", themes: [] };
const DEFAULT_THEME = themeConfig.defaultTheme || "normal";
const DEFAULT_INPUT_PLACEHOLDER = "Charizard";
const THEMES = themeConfig.themes || [];
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
const DEFAULT_GAME_MODE = "off";
const DEFAULT_TYPO_MODE = "normal";
const PROGRESS_CODE_PREFIX = "dq3.";
const BADGES = [
  {
    id: "first-catch",
    icon: "P1",
    title: "First Catch",
    description: "Find your first Pokemon.",
    unlocked: ({ foundCount }) => foundCount >= 1
  },
  {
    id: "rookie-trainer",
    icon: "10",
    title: "Rookie Trainer",
    description: "Find 10 Pokemon.",
    unlocked: ({ foundCount }) => foundCount >= 10
  },
  {
    id: "collector",
    icon: "100",
    title: "Collector",
    description: "Find 100 Pokemon.",
    unlocked: ({ foundCount }) => foundCount >= 100
  },
  {
    id: "halfway-there",
    icon: "50%",
    title: "Halfway There",
    description: "Reach 50% overall completion.",
    unlocked: ({ totalCount, foundCount }) =>
      totalCount > 0 && foundCount / totalCount >= 0.5
  },
  {
    id: "region-master",
    icon: "GEN",
    title: "Region Master",
    description: "Complete any generation.",
    unlocked: ({ completedGenerations }) => completedGenerations.length > 0
  },
  {
    id: "type-specialist",
    icon: "TYPE",
    title: "Type Specialist",
    description: "Complete any type.",
    unlocked: ({ completedTypes }) => completedTypes.length > 0
  },
  {
    id: "national-dex",
    icon: "DEX",
    title: "National Dex",
    description: "Find every Pokemon in the quiz.",
    unlocked: ({ totalCount, foundCount }) =>
      totalCount > 0 && foundCount === totalCount
  }
];

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

function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function writeVarInt(value, bytes) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Invalid progress value");
  }

  let remaining = value;
  do {
    let byte = remaining & 0x7f;
    remaining = Math.floor(remaining / 128);
    if (remaining > 0) byte |= 0x80;
    bytes.push(byte);
  } while (remaining > 0);
}

function readVarInt(bytes, offsetRef) {
  let result = 0;
  let shift = 0;

  while (offsetRef.index < bytes.length) {
    const byte = bytes[offsetRef.index];
    offsetRef.index += 1;
    result += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) {
      return result;
    }
    shift += 7;
    if (shift > 35) break;
  }

  throw new Error("Invalid progress encoding");
}

function computeChecksum(bytes) {
  let hash = 2166136261;
  bytes.forEach((value) => {
    hash ^= value;
    hash = Math.imul(hash, 16777619) >>> 0;
  });
  return hash >>> 0;
}

function checksumBytes(value) {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff
  ];
}

function bytesToChecksum(bytes) {
  if (bytes.length !== 4) {
    throw new Error("Invalid checksum");
  }
  return (
    ((bytes[0] << 24) >>> 0) |
    ((bytes[1] << 16) >>> 0) |
    ((bytes[2] << 8) >>> 0) |
    (bytes[3] >>> 0)
  ) >>> 0;
}

function encodeUtf8(value) {
  return new TextEncoder().encode(value);
}

function decodeUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}

function encodeProgressPayload({ ids, elapsed, settings = null }) {
  const payload = [];
  writeVarInt(elapsed, payload);
  writeVarInt(ids.length, payload);

  let previousId = 0;
  ids.forEach((id) => {
    writeVarInt(id - previousId, payload);
    previousId = id;
  });

  if (settings) {
    const settingsBytes = encodeUtf8(JSON.stringify(settings));
    writeVarInt(1, payload);
    writeVarInt(settingsBytes.length, payload);
    settingsBytes.forEach((value) => payload.push(value));
  } else {
    writeVarInt(0, payload);
  }

  const payloadBytes = Uint8Array.from(payload);
  const checksum = checksumBytes(computeChecksum(payloadBytes));
  return base64UrlEncode(Uint8Array.from([...checksum, ...payloadBytes]));
}

function decodeProgressPayload(serialized) {
  const bytes = base64UrlDecode(serialized);
  if (bytes.length < 4) {
    throw new Error("Invalid progress payload");
  }

  const expectedChecksum = bytesToChecksum([...bytes.slice(0, 4)]);
  const payload = bytes.slice(4);
  const actualChecksum = computeChecksum(payload);
  if (actualChecksum !== expectedChecksum) {
    throw new Error("Progress code checksum mismatch");
  }

  const offsetRef = { index: 0 };
  const elapsed = readVarInt(payload, offsetRef);
  const count = readVarInt(payload, offsetRef);
  const ids = [];
  let previousId = 0;

  for (let i = 0; i < count; i += 1) {
    const delta = readVarInt(payload, offsetRef);
    if (delta <= 0) {
      throw new Error("Invalid progress delta");
    }
    previousId += delta;
    ids.push(previousId);
  }

  let settings = null;
  const hasSettings = offsetRef.index < payload.length ? readVarInt(payload, offsetRef) : 0;
  if (hasSettings) {
    const settingsLength = readVarInt(payload, offsetRef);
    const settingsEnd = offsetRef.index + settingsLength;
    if (settingsEnd > payload.length) {
      throw new Error("Invalid progress payload");
    }
    settings = JSON.parse(
      decodeUtf8(payload.slice(offsetRef.index, settingsEnd))
    );
    offsetRef.index = settingsEnd;
  }

  if (offsetRef.index !== payload.length) {
    throw new Error("Invalid progress payload");
  }

  return { elapsed, ids, settings };
}

function getStableProgressIds() {
  return [...state.found]
    .map((name) => state.meta.get(name))
    .filter((entry) => entry && entry.dexId)
    .map((entry) => Number(entry.dexId))
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b);
}

function getSettingsPayload() {
  return {
    gameMode: getGameMode(),
    compact: document.body.classList.contains("compact-mode"),
    outlinesOff: document.body.classList.contains("outlines-off"),
    cries: criesToggle ? criesToggle.checked : false,
    legacyCries: legacyCriesToggle ? legacyCriesToggle.checked : false,
    showDex: showDexToggle ? showDexToggle.checked : false,
    shiny: shinyToggle ? shinyToggle.checked : false,
    typoMode: typoModeSelect ? typoModeSelect.value : DEFAULT_TYPO_MODE,
    autocorrect: autocorrectToggle ? autocorrectToggle.checked : true,
    sidebarCollapsed: document.body.classList.contains("sidebar-collapsed"),
    filtersPanelExpanded: Boolean(filtersPanel && !filtersPanel.hidden),
    dark: document.body.classList.contains("dark-mode"),
    theme: document.body.dataset.theme || DEFAULT_THEME
  };
}

function getShareableSettingsPayload() {
  const { sidebarCollapsed, filtersPanelExpanded, ...shareableSettings } = getSettingsPayload();
  return shareableSettings;
}

function getGameMode() {
  return gameModeSelect ? gameModeSelect.value : DEFAULT_GAME_MODE;
}

function isStudyMode() {
  return getGameMode() === "study";
}

function applySettingsPayload(data, { persist = true } = {}) {
  if (!data || typeof data !== "object") return;

  if (gameModeSelect) {
    const requestedMode = data.gameMode ?? data.practiceMode;
    gameModeSelect.value = requestedMode === "study" ? "study" : DEFAULT_GAME_MODE;
  }

  document.body.classList.toggle("compact-mode", Boolean(data.compact));
  if (compactToggle) {
    compactToggle.textContent = data.compact ? "Normal Mode" : "Compact Mode";
  }

  if (outlineToggle) outlineToggle.checked = !data.outlinesOff;
  document.body.classList.toggle("outlines-off", Boolean(data.outlinesOff));

  if (Object.prototype.hasOwnProperty.call(data, "sidebarCollapsed")) {
    document.body.classList.toggle("sidebar-collapsed", Boolean(data.sidebarCollapsed));
    const settingsLabel = data.sidebarCollapsed ? "Show Settings" : "Hide Settings";
    if (filtersToggle) filtersToggle.textContent = settingsLabel;
    if (filtersToggleCompact) filtersToggleCompact.textContent = settingsLabel;
  }

  if (Object.prototype.hasOwnProperty.call(data, "filtersPanelExpanded")) {
    setFiltersPanelExpanded(Boolean(data.filtersPanelExpanded), { persist: false });
  } else {
    setFiltersPanelExpanded(false, { persist: false });
  }

  document.body.classList.toggle("dark-mode", Boolean(data.dark));
  if (darkToggle) darkToggle.checked = Boolean(data.dark);

  setTheme(data.theme || DEFAULT_THEME, false);

  if (criesToggle) criesToggle.checked = Boolean(data.cries);
  if (legacyCriesToggle) legacyCriesToggle.checked = Boolean(data.legacyCries);
  if (showDexToggle) showDexToggle.checked = Boolean(data.showDex);
  if (shinyToggle) shinyToggle.checked = Boolean(data.shiny);
  if (typoModeSelect) typoModeSelect.value = data.typoMode || DEFAULT_TYPO_MODE;
  if (autocorrectToggle) autocorrectToggle.checked = data.autocorrect !== false;

  syncTypoSettings();
  updateFilterSummary();

  if (persist) {
    localStorage.setItem(`${STORAGE_KEY}:settings`, JSON.stringify(getSettingsPayload()));
  }
}

function encodeFoundProgress() {
  return `${PROGRESS_CODE_PREFIX}${encodeProgressPayload({
    ids: getStableProgressIds(),
    elapsed: getElapsedSeconds(),
    settings:
      progressIncludeSettingsEl && progressIncludeSettingsEl.checked
        ? getShareableSettingsPayload()
        : null
  })}`;
}

function decodeFoundProgress(code) {
  if (!code || !code.startsWith(PROGRESS_CODE_PREFIX)) {
    throw new Error("Invalid progress code");
  }

  const decoded = decodeProgressPayload(code.slice(PROGRESS_CODE_PREFIX.length));
  const ids = new Set(decoded.ids);
  const found = new Set();
  state.meta.forEach((entry, name) => {
    if (ids.has(Number(entry.dexId))) {
      found.add(name);
    }
  });
  return {
    found,
    elapsed: decoded.elapsed,
    settings: decoded.settings
  };
}

function extractProgressCode(value) {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (raw.startsWith(PROGRESS_CODE_PREFIX)) {
    return raw;
  }

  try {
    const url = new URL(raw, window.location.href);
    const hash = url.hash.replace(/^#/, "");
    if (hash.startsWith("progress=")) {
      return decodeURIComponent(hash.slice("progress=".length));
    }
    if (hash.startsWith(PROGRESS_CODE_PREFIX)) {
      return hash;
    }
  } catch (err) {
    // ignore invalid URLs and try plain-text parsing below
  }

  if (raw.startsWith("#progress=")) {
    return decodeURIComponent(raw.slice("#progress=".length));
  }

  if (raw.startsWith("progress=")) {
    return decodeURIComponent(raw.slice("progress=".length));
  }

  return raw;
}

function isProgressUrlValue(value) {
  const raw = (value || "").trim();
  if (!raw) return false;

  try {
    const url = new URL(raw, window.location.href);
    const hash = url.hash.replace(/^#/, "");
    return hash.startsWith("progress=") || hash.startsWith(PROGRESS_CODE_PREFIX);
  } catch (err) {
    return false;
  }
}

function getImportPreviewStats(imported) {
  const importedCount = [...imported.found].filter((name) => state.meta.has(name)).length;
  return [
    { label: "Pokemon", value: String(importedCount) },
    { label: "Timer", value: formatTime(imported.elapsed) },
    { label: "Settings", value: imported.settings ? "Included" : "Not included" }
  ];
}

function setProgressFeedback(message) {
  if (!progressFeedbackEl) return;
  progressFeedbackEl.textContent = message || "";
}

let progressCleanupTimeout = null;
let confirmResolver = null;
let activeModal = null;

function scheduleImportedProgressCleanup() {
  if (progressCleanupTimeout) clearTimeout(progressCleanupTimeout);
  progressCleanupTimeout = setTimeout(() => {
    if (progressCodeEl) progressCodeEl.value = "";
    setProgressFeedback("");
    progressCleanupTimeout = null;
  }, 4000);
}

function closeConfirmModal(result) {
  if (!confirmModal) return;
  closeModal(confirmModal);
  const resolver = confirmResolver;
  confirmResolver = null;
  if (resolver) resolver(Boolean(result));
}

function getModalFocusableElements(modal) {
  if (!modal) return [];
  return [...modal.querySelectorAll("a[href], button, textarea, input, select, [tabindex]:not([tabindex='-1'])")]
    .filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
}

function trapModalFocus(event) {
  if (!activeModal || event.key !== "Tab") return;
  const focusable = getModalFocusableElements(activeModal);
  if (!focusable.length) {
    event.preventDefault();
    if (activeModal.focus) activeModal.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const current = document.activeElement;
  if (event.shiftKey && current === first) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && current === last) {
    event.preventDefault();
    first.focus();
  }
}

function openModal(modal, initialFocus = null) {
  if (!modal) return;
  const activeEl = document.activeElement;
  if (activeEl instanceof HTMLElement) {
    modal._restoreFocusEl = activeEl;
  }
  modal.classList.remove("hidden");
  activeModal = modal;
  document.body.classList.add("modal-open");
  const fallback = getModalFocusableElements(modal)[0] || modal;
  const target = initialFocus || fallback;
  requestAnimationFrame(() => {
    if (target && target.focus) target.focus();
  });
}

function closeModal(modal, { restoreFocus = true } = {}) {
  if (!modal) return;
  modal.classList.add("hidden");
  if (activeModal === modal) {
    activeModal = null;
  }
  if (!activeModal) {
    document.body.classList.remove("modal-open");
  }
  if (!restoreFocus) return;
  const restoreEl = modal._restoreFocusEl;
  if (restoreEl && typeof restoreEl.focus === "function" && document.contains(restoreEl)) {
    try {
      restoreEl.focus({ preventScroll: true });
    } catch (err) {
      restoreEl.focus();
    }
  }
}

function renderConfirmStats(items) {
  if (!confirmStats) return;
  confirmStats.innerHTML = "";
  if (!items || !items.length) {
    confirmStats.classList.add("hidden");
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "confirm-stat";

    const label = document.createElement("span");
    label.className = "confirm-stat__label";
    label.textContent = item.label;

    const value = document.createElement("strong");
    value.className = "confirm-stat__value";
    value.textContent = item.value;

    card.appendChild(label);
    card.appendChild(value);
    confirmStats.appendChild(card);
  });

  confirmStats.classList.remove("hidden");
}

function requestConfirmation(message, { title = "Confirm Action", confirmLabel = "Confirm", stats = [] } = {}) {
  if (!confirmModal || !confirmMessage || !confirmAccept || !confirmTitle) {
    return Promise.resolve(window.confirm(message));
  }

  if (confirmResolver) {
    confirmResolver(false);
    confirmResolver = null;
  }

  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmAccept.textContent = confirmLabel;
  renderConfirmStats(stats);
  openModal(confirmModal, confirmAccept);

  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function selectProgressCode() {
  if (!progressCodeEl) return;
  progressCodeEl.focus();
  progressCodeEl.select();
}

function buildProgressShareLink() {
  const code = encodeFoundProgress();
  const url = new URL(window.location.href);
  url.hash = `progress=${encodeURIComponent(code)}`;
  return url.toString();
}

function applyImportedProgress(foundSet, { elapsed = 0, persist = true, resumeTimer = true } = {}) {
  stopTimer();
  state.found = new Set(
    [...foundSet].filter((name) => state.meta.has(name))
  );
  state.savedElapsed = Math.max(0, elapsed);
  state.lastSavedSec = -1;
  setTimerText(formatTime(state.savedElapsed));
  if (resumeTimer) startTimer();
  state.seenBadges.clear();
  state.badgesPrimed = false;
  updateStats();
  renderSprites();
  renderStudyPanel();
  if (persist) saveState();
}

async function copyProgressLink() {
  if (!progressCodeEl || !state.allNames.length) return;

  const shareLink = buildProgressShareLink();
  progressCodeEl.value = shareLink;
  selectProgressCode();

  try {
    await navigator.clipboard.writeText(shareLink);
    setProgressFeedback("Progress link copied.");
  } catch (err) {
    setProgressFeedback("Progress link ready to copy.");
  }
}

async function copyExistingProgressValue() {
  if (!progressCodeEl) return;
  const value = progressCodeEl.value.trim();
  if (!value) {
    setProgressFeedback("Export a progress link first.");
    return;
  }

  selectProgressCode();

  try {
    await navigator.clipboard.writeText(value);
    setProgressFeedback("Progress link copied.");
  } catch (err) {
    setProgressFeedback("Progress link ready to copy.");
  }
}

async function importProgressValue(value, { fromHash = false } = {}) {
  if (!state.allNames.length) return false;

  const code = extractProgressCode(value);
  if (!code) {
    if (!fromHash) setProgressFeedback("Paste a progress link or code first.");
    return false;
  }

  try {
    const imported = decodeFoundProgress(code);
    if (!fromHash && isProgressUrlValue(value)) {
      const ok = await requestConfirmation("Import progress from this shared link?", {
        title: "Import Shared Progress",
        confirmLabel: "Import",
        stats: getImportPreviewStats(imported)
      });
      if (!ok) return false;
    }
    if (progressIncludeSettingsEl) {
      progressIncludeSettingsEl.checked = Boolean(imported.settings);
    }
    if (imported.settings) {
      applySettingsPayload(imported.settings);
    }
    applyImportedProgress(imported.found, { elapsed: imported.elapsed });

    if (progressCodeEl) {
      progressCodeEl.value = buildProgressShareLink();
      if (!fromHash) selectProgressCode();
    }

    const importedCount = [...imported.found].filter((name) => state.meta.has(name)).length;
    const settingsNote = imported.settings ? " with settings" : "";
    setProgressFeedback(`Imported ${importedCount} Pokemon, timer ${formatTime(imported.elapsed)}${settingsNote}.`);
    scheduleImportedProgressCleanup();
    showStatusHint("Progress imported.");
    return true;
  } catch (err) {
    if (!fromHash) setProgressFeedback("That progress code is not valid.");
    return false;
  }
}

async function restoreProgressFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return false;
  if (!hash.startsWith("progress=") && !hash.startsWith(PROGRESS_CODE_PREFIX)) {
    return false;
  }
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  try {
    const code = extractProgressCode(hash);
    const imported = decodeFoundProgress(code);
    const ok = await requestConfirmation("Import progress from this shared link?", {
      title: "Import Shared Progress",
      confirmLabel: "Import",
      stats: getImportPreviewStats(imported)
    });
    if (!ok) {
      window.history.replaceState(null, "", cleanUrl);
      return false;
    }
    const didImport = await importProgressValue(hash, { fromHash: true });
    if (didImport) {
      window.history.replaceState(null, "", cleanUrl);
    }
    return didImport;
  } catch (err) {
    window.history.replaceState(null, "", cleanUrl);
    return false;
  }
}

async function handleProgressHashChange() {
  if (!state.allNames.length) return;
  await restoreProgressFromHash();
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
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const weeks = Math.floor(totalSeconds / 604800);
  const days = Math.floor((totalSeconds % 604800) / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (weeks > 0) {
    return `${weeks}w ${days}d ${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getElapsedSeconds() {
  if (state.timerId && state.startTime) {
    return Math.floor((Date.now() - state.startTime) / 1000);
  }
  return state.savedElapsed || 0;
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
    state.startTime = Date.now() - (state.savedElapsed || 0) * 1000;
  }
  state.timerId = setInterval(() => {
    const delta = getElapsedSeconds();
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
    state.savedElapsed = getElapsedSeconds();
    clearInterval(state.timerId);
    state.timerId = null;
  }
  state.startTime = null;
}

function saveState() {
  if (state.isRestoring) return;
  const elapsed = getElapsedSeconds();
  const payload = {
    found: [...state.found],
    studyDeck: state.studyDeck,
    studyCurrent: state.studyCurrent,
    studyRevealed: state.studyRevealed,
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
  if (Array.isArray(data.studyDeck)) {
    state.studyDeck = data.studyDeck.filter((name) => typeof name === "string");
  }
  if (typeof data.studyCurrent === "string") {
    state.studyCurrent = data.studyCurrent;
  }
  state.studyRevealed = Boolean(data.studyRevealed);

  if (typeof data.elapsed === "number" && data.elapsed >= 0) {
    state.savedElapsed = data.elapsed;
    state.lastSavedSec = -1;
    setTimerText(formatTime(data.elapsed));
    if (data.running) {
      startTimer(true);
    }
  }

  state.isRestoring = false;
  return true;
}

function saveSettings() {
  localStorage.setItem(`${STORAGE_KEY}:settings`, JSON.stringify(getSettingsPayload()));
}

function updateThemeColorMeta(color) {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const resolvedColor =
    color ||
    getComputedStyle(document.body).getPropertyValue("--bg-2").trim() ||
    "#f7f1e5";
  document.documentElement.style.backgroundColor = resolvedColor;
  document.body.style.backgroundColor = resolvedColor;
  if (themeColorMeta) themeColorMeta.setAttribute("content", resolvedColor);
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
  applySettingsPayload(data, { persist: false });
}

function resetSettings() {
  localStorage.removeItem(`${STORAGE_KEY}:settings`);
  if (gameModeSelect) gameModeSelect.value = DEFAULT_GAME_MODE;
  document.body.classList.remove("compact-mode");
  document.body.classList.remove("dark-mode");
  document.body.classList.add("outlines-off");
  document.body.classList.add("sidebar-collapsed");
  if (compactToggle) compactToggle.textContent = "Compact Mode";
  if (filtersToggle) filtersToggle.textContent = "Show Settings";
  if (filtersToggleCompact) filtersToggleCompact.textContent = "Show Settings";
  if (criesToggle) criesToggle.checked = false;
  if (legacyCriesToggle) legacyCriesToggle.checked = false;
  if (showDexToggle) showDexToggle.checked = false;
  if (shinyToggle) shinyToggle.checked = false;
  if (typoModeSelect) typoModeSelect.value = DEFAULT_TYPO_MODE;
  if (autocorrectToggle) autocorrectToggle.checked = true;
  if (outlineToggle) outlineToggle.checked = false;
  if (darkToggle) darkToggle.checked = false;
  setFiltersPanelExpanded(false, { persist: false });
  setTheme(DEFAULT_THEME, false);
  syncTypoSettings();
  if (groupFilter) groupFilter.value = "generation";
  setChipGroupSelections(genFilter, []);
  setChipGroupSelections(typeFilter, []);
  applyFilters();
}

function getStudyCandidates() {
  return state.names.filter((name) => !state.found.has(name));
}

function ensureStudyDeck() {
  const candidates = getStudyCandidates();
  const candidateSet = new Set(candidates);
  state.studyDeck = state.studyDeck.filter((name) => candidateSet.has(name));

  if (state.studyCurrent && !candidateSet.has(state.studyCurrent)) {
    state.studyCurrent = null;
    state.studyRevealed = false;
  }

  if (!state.studyCurrent && state.studyDeck.length) {
    state.studyCurrent = state.studyDeck.shift();
    state.studyRevealed = false;
  }

  if (!state.studyCurrent && candidates.length) {
    state.studyDeck = sampleRandomNames(candidates, candidates.length);
    state.studyCurrent = state.studyDeck.shift() || null;
    state.studyRevealed = false;
  }
}

function sampleRandomNames(source, count) {
  const pool = source.slice();
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function renderStudyMeta(entry) {
  if (!studyMeta) return;
  studyMeta.innerHTML = "";
  if (!entry) return;

  const values = [];
  if (entry.dexId) {
    values.push(`#${String(entry.dexId).padStart(4, "0")}`);
  }
  if (entry.generation) {
    values.push(entry.generation);
  }

  values.forEach((value) => {
    const chip = document.createElement("span");
    chip.className = "study-card__meta-chip";
    chip.textContent = value;
    studyMeta.appendChild(chip);
  });
}

function renderStudyTypes(entry) {
  if (!studyTypes) return;
  studyTypes.innerHTML = "";
  if (!entry || !entry.types) return;

  entry.types.forEach((typeName) => {
    const chip = document.createElement("span");
    chip.className = "info-type-chip";
    const icon = document.createElement("img");
    icon.alt = `${typeName} type`;
    icon.src = `${typeIconBase}${getTypeId(typeName)}.png`;
    const text = document.createElement("span");
    text.textContent = typeName;
    chip.appendChild(icon);
    chip.appendChild(text);
    studyTypes.appendChild(chip);
  });
}

function getStudyScenePalette(entry) {
  const sceneByType = {
    Normal: { sky: "#c9d6df", sky2: "#8fa4b3", ground: "#b28f65", ground2: "#6e5438", shadow: "rgba(72, 50, 28, 0.34)" },
    Fire: { sky: "#ffb15c", sky2: "#ff6b2c", ground: "#bf4a24", ground2: "#5f160e", shadow: "rgba(96, 22, 8, 0.4)" },
    Water: { sky: "#88ddff", sky2: "#2d90ff", ground: "#2879b8", ground2: "#173e75", shadow: "rgba(13, 46, 88, 0.38)" },
    Electric: { sky: "#fff06b", sky2: "#ffbf00", ground: "#d28d00", ground2: "#6e4e00", shadow: "rgba(97, 74, 0, 0.34)" },
    Grass: { sky: "#baf06b", sky2: "#61b84a", ground: "#4d9a3f", ground2: "#234d1c", shadow: "rgba(27, 67, 21, 0.34)" },
    Ice: { sky: "#d7fcff", sky2: "#78dbff", ground: "#7cb6d8", ground2: "#3d6f97", shadow: "rgba(43, 78, 101, 0.3)" },
    Fighting: { sky: "#dc9b8f", sky2: "#bb4938", ground: "#8d3128", ground2: "#41120f", shadow: "rgba(65, 18, 15, 0.4)" },
    Poison: { sky: "#d49df2", sky2: "#8f3cc8", ground: "#6e3198", ground2: "#34114e", shadow: "rgba(49, 14, 73, 0.4)" },
    Ground: { sky: "#e5c26b", sky2: "#b9873f", ground: "#8c6330", ground2: "#4b3315", shadow: "rgba(65, 43, 16, 0.36)" },
    Flying: { sky: "#d9e5ff", sky2: "#7ea2ff", ground: "#7b96cf", ground2: "#40548d", shadow: "rgba(47, 66, 110, 0.3)" },
    Psychic: { sky: "#ffb4d3", sky2: "#ff4f97", ground: "#d04d82", ground2: "#6e1f42", shadow: "rgba(95, 18, 51, 0.36)" },
    Bug: { sky: "#d6ee7a", sky2: "#95bc2d", ground: "#758f24", ground2: "#384510", shadow: "rgba(42, 52, 12, 0.36)" },
    Rock: { sky: "#d7c1a1", sky2: "#9a7a4c", ground: "#7c613f", ground2: "#43321f", shadow: "rgba(50, 37, 22, 0.34)" },
    Ghost: { sky: "#b3a5e7", sky2: "#6a56b8", ground: "#574190", ground2: "#261943", shadow: "rgba(28, 18, 53, 0.42)" },
    Dragon: { sky: "#b2a0ff", sky2: "#5f37ff", ground: "#4b39bf", ground2: "#1f1368", shadow: "rgba(25, 17, 76, 0.42)" },
    Dark: { sky: "#988f89", sky2: "#564a42", ground: "#443934", ground2: "#1a1412", shadow: "rgba(16, 12, 10, 0.44)" },
    Steel: { sky: "#d4dee7", sky2: "#8fa2b7", ground: "#74879c", ground2: "#394857", shadow: "rgba(40, 51, 63, 0.32)" },
    Fairy: { sky: "#ffc7df", sky2: "#ff8fbe", ground: "#d978a1", ground2: "#70344f", shadow: "rgba(92, 36, 61, 0.34)" }
  };

  const types = entry?.types || [];
  const primary = sceneByType[types[0]] || sceneByType.Normal;
  const secondary = sceneByType[types[1]] || primary;

  return {
    sky: primary.sky,
    sky2: secondary.sky2,
    ground: primary.ground,
    ground2: secondary.ground2,
    shadow: primary.shadow
  };
}

function applyStudyScene(entry) {
  if (!studySpriteWrap) return;
  const palette = getStudyScenePalette(entry);
  studySpriteWrap.style.setProperty("--study-sky", palette.sky);
  studySpriteWrap.style.setProperty("--study-sky-2", palette.sky2);
  studySpriteWrap.style.setProperty("--study-ground", palette.ground);
  studySpriteWrap.style.setProperty("--study-ground-2", palette.ground2);
  studySpriteWrap.style.setProperty("--study-shadow", palette.shadow);
}

function getMaskedStudyName(label) {
  return [...(label || "")]
    .map((char) => (/\s/.test(char) ? char : "?"))
    .join("");
}

function renderStudyName(label, { revealed = false, animate = false } = {}) {
  if (!studyName) return;
  if (studyName._revealTimer) {
    clearTimeout(studyName._revealTimer);
    studyName._revealTimer = null;
  }
  studyName.dataset.revealed = revealed ? "true" : "false";
  studyName.classList.remove("study-card__name--reveal");

  const text = label || "";
  if (!revealed) {
    studyName.textContent = getMaskedStudyName(text);
    return;
  }

  if (!animate) {
    studyName.textContent = text;
    return;
  }

  const chars = [...text];
  const revealedChars = chars.map((char) => (/\s/.test(char) ? char : "?"));
  const revealIndexes = chars
    .map((char, index) => (/\s/.test(char) ? -1 : index))
    .filter((index) => index >= 0);
  let revealStep = 0;

  studyName.textContent = revealedChars.join("");
  studyName.classList.add("study-card__name--reveal");

  const tick = () => {
    if (!studyName) return;
    const index = revealIndexes[revealStep];
    if (typeof index !== "number") {
      studyName.textContent = text;
      studyName.classList.remove("study-card__name--reveal");
      studyName._revealTimer = null;
      return;
    }
    revealedChars[index] = chars[index];
    studyName.textContent = revealedChars.join("");
    revealStep += 1;
    studyName._revealTimer = setTimeout(tick, 42);
  };

  studyName._revealTimer = setTimeout(tick, 42);
}

function clearStudyNameReveal() {
  if (!studyName) return;
  if (studyName._revealTimer) {
    clearTimeout(studyName._revealTimer);
    studyName._revealTimer = null;
  }
  studyName.classList.remove("study-card__name--reveal");
}

function renderStudyPanel() {
  if (!studyPanel) return;

  const active = isStudyMode();
  studyPanel.hidden = !active;
  if (!active) {
    clearStudyNameReveal();
    syncInlineStatusVisibility();
    return;
  }

  ensureStudyDeck();
  const candidates = getStudyCandidates();
  const currentName = state.studyCurrent;
  const entry = currentName ? state.meta.get(currentName) : null;

  if (!entry) {
    clearStudyNameReveal();
    if (studyCard) studyCard.hidden = true;
    if (studyActions) studyActions.hidden = true;
    if (studySubtitle) {
      studySubtitle.textContent = state.names.length
        ? "Everything here is found."
        : "Adjust your filters.";
    }
    if (studyCounter) studyCounter.textContent = "0 Pokemon left";
    if (studySprite) {
      studySprite.removeAttribute("src");
      studySprite.alt = "";
    }
    applyStudyScene(null);
    if (studyName) studyName.textContent = "";
    setInputStatus(
      state.names.length ? "All Pokemon in this filtered pool are already found." : DEFAULT_STATUS
    );
    renderStudyMeta(null);
    renderStudyTypes(null);
    return;
  }

  if (studyCard) studyCard.hidden = false;
  if (studyActions) studyActions.hidden = false;
  if (studySubtitle) {
    studySubtitle.textContent = state.studyRevealed
      ? "Answer revealed"
      : "Guess from the clues";
  }
  if (studyCounter) {
    const remaining = new Set([...candidates, ...state.studyDeck, currentName]).size;
    studyCounter.textContent = `${remaining} Pokemon left`;
  }
  if (studySprite) {
    studySprite.src = getSpriteForEntry(entry);
    studySprite.alt = state.studyRevealed ? entry.label : "Study Pokemon";
  }
  applyStudyScene(entry);
  renderStudyMeta(entry);
  renderStudyTypes(entry);
  if (studyName) {
    const shouldAnimate = state.studyRevealed && studyName.dataset.lastReveal !== currentName;
    renderStudyName(entry.label, {
      revealed: state.studyRevealed,
      animate: shouldAnimate
    });
    studyName.dataset.lastReveal = state.studyRevealed ? currentName : "";
  }
  if (!inputEl?.value.trim()) {
    setInputStatus(DEFAULT_STATUS);
  }
  if (studyRevealBtn) studyRevealBtn.disabled = state.studyRevealed;
  if (studyNextBtn) studyNextBtn.disabled = false;
}

function advanceStudyCard({ markFound = false, repeat = false } = {}) {
  const currentName = state.studyCurrent;
  if (!currentName) return;

  if (markFound && !state.found.has(currentName)) {
    state.found.add(currentName);
    state.recentlyFound.add(currentName);
    showRevealPreview(state.meta.get(currentName));
    playCry(currentName);
  }

  const candidates = getStudyCandidates().filter((name) => name !== currentName);
  const candidateSet = new Set(candidates);
  state.studyDeck = state.studyDeck.filter((name) => candidateSet.has(name));
  if (repeat && candidateSet.has(currentName)) {
    state.studyDeck.push(currentName);
  }

  state.studyCurrent = state.studyDeck.shift() || null;
  if (!state.studyCurrent && candidates.length) {
    state.studyDeck = sampleRandomNames(candidates, candidates.length);
    state.studyCurrent = state.studyDeck.shift() || null;
  }
  state.studyRevealed = false;
  if (inputEl) inputEl.value = "";
  updateStats();
  if (markFound) {
    updateSpriteCardsForPokemon(currentName, { animateReveal: true });
  }
  renderStudyPanel();
  saveState();
}

async function confirmResetSettings() {
  const ok = await requestConfirmation(
    "Reset all settings to their defaults?",
    { title: "Reset Settings", confirmLabel: "Reset" }
  );
  if (!ok) return;
  resetSettings();
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
  updateThemeColorMeta();
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
  try {
    renderBadges();
  } catch (err) {
    console.error("Badge rendering failed", err);
  }
}

function getBadgeContext() {
  return {
    totalCount: state.allNames.length,
    foundCount: state.found.size,
    completedGenerations: getCompletedGroupEntries(state.generationIndex),
    completedTypes: getCompletedGroupEntries(state.typeIndex)
  };
}

function getCompletedGroupEntries(indexMap) {
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

function renderBadges() {
  if (!badgeList) return;
  const context = getBadgeContext();
  badgeList.innerHTML = "";
  let unlockedCount = 0;
  const unlockedIds = [];

  BADGES.forEach((badge) => {
    const unlocked = badge.unlocked(context);
    if (unlocked) {
      unlockedCount += 1;
      unlockedIds.push(badge.id);
    }
    const item = document.createElement("div");
    item.className = `badge ${unlocked ? "badge--unlocked" : "badge--locked"}`;

    const icon = document.createElement("span");
    icon.className = "badge__icon";
    icon.textContent = badge.icon;

    const copy = document.createElement("div");
    copy.className = "badge__copy";

    const title = document.createElement("strong");
    title.className = "badge__title";
    title.textContent = badge.title;

    const description = document.createElement("span");
    description.className = "badge__description";
    description.textContent = badge.description;

    copy.appendChild(title);
    copy.appendChild(description);
    item.appendChild(icon);
    item.appendChild(copy);
    badgeList.appendChild(item);
  });

  if (badgeHeading) {
    badgeHeading.textContent = `Achievements (${unlockedCount}/${BADGES.length})`;
  }

  if (!state.badgesPrimed) {
    state.seenBadges = new Set(unlockedIds);
    state.badgesPrimed = true;
    return;
  }

  if (state.isRestoring) return;

  unlockedIds.forEach((id) => {
    if (state.seenBadges.has(id)) return;
    state.seenBadges.add(id);
    const badge = BADGES.find((entry) => entry.id === id);
    if (badge) showAchievementToast(badge);
  });
}

function showAchievementToast(badge) {
  if (!badge || !achievementToast) return;
  if (achievementToastIcon) achievementToastIcon.textContent = badge.icon;
  if (achievementToastTitle) achievementToastTitle.textContent = badge.title;
  achievementToast.hidden = false;
  achievementToast.classList.remove("is-active");
  void achievementToast.offsetWidth;
  achievementToast.classList.add("is-active");
  clearTimeout(achievementToast._hideTimer);
  achievementToast._hideTimer = setTimeout(() => {
    achievementToast.classList.remove("is-active");
    achievementToast.hidden = true;
  }, 2400);
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
      section.dataset.groupName = groupName;
      const title = document.createElement("h3");
      title.className = "group-title";
      title.textContent =
        mode === "generation"
          ? `${groupName} - ${percent}%`
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
  state.studyDeck = [];
  state.studyCurrent = null;
  state.studyRevealed = false;
  state.seenBadges.clear();
  state.badgesPrimed = true;
  state.savedElapsed = 0;
  state.lastSavedSec = -1;
  setTimerText("00:00");
  inputEl.value = "";
  focusInput();
  updateStats();
  renderSprites();
  renderStudyPanel();
  clearState();
  if (progressCodeEl) progressCodeEl.value = "";
  setProgressFeedback("");
}

async function confirmReset() {
  const total = state.names.length;
  const found = state.names.filter((name) => state.found.has(name)).length;
  if (total && found) {
    const ok = await requestConfirmation(
      `Reset the quiz? This will clear ${found} found Pokemon and the timer.`,
      { title: "Reset Quiz", confirmLabel: "Reset" }
    );
    if (!ok) return;
  } else if (!(await requestConfirmation("Reset the quiz?", {
    title: "Reset Quiz",
    confirmLabel: "Reset"
  }))) {
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
  renderInfoMeta(entry);
  if (infoTypes) infoTypes.textContent = "";
  if (infoGenus) infoGenus.textContent = "Loading details...";
  if (infoStats) infoStats.innerHTML = "";
  if (infoAbilities) infoAbilities.innerHTML = "";
  if (infoFacts) infoFacts.innerHTML = "";
  state.activeEntry = entry;
  openModal(infoModal, infoClose);
  playCry(entry.normalized || normalizeName(entry.label || ""));

  try {
    const details = await getPokedexInfo(entry);
    if (!details) return;
    if (infoGenus) infoGenus.textContent = details.genus || "";
    renderInfoStats(details);
    renderInfoAbilities(details);
    renderInfoFacts(details);
    renderTypeSprites(entry);
  } catch (err) {
    if (infoGenus) infoGenus.textContent = "Could not load details.";
  }
}

function closeInfoModal() {
  if (!infoModal) return;
  closeModal(infoModal);
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

function renderInfoMeta(entry) {
  if (!infoMeta) return;
  infoMeta.innerHTML = "";
  const items = [];
  if (entry.dexId) {
    items.push(`#${String(entry.dexId).padStart(4, "0")}`);
  }
  if (entry.generation) {
    items.push(entry.generation);
  }
  items.forEach((value) => {
    const chip = document.createElement("span");
    chip.className = "info-meta-chip";
    chip.textContent = value;
    infoMeta.appendChild(chip);
  });
}

function renderInfoStats(details) {
  if (!infoStats) return;
  infoStats.innerHTML = "";
  const stats = [
    { label: "Height", value: details.height || "-" },
    { label: "Weight", value: details.weight || "-" },
    { label: "Base Exp", value: details.baseExperience || "-" },
    { label: "Abilities", value: String((details.abilities || []).length) }
  ];
  stats.forEach((stat) => {
    const card = document.createElement("div");
    card.className = "info-stat-card";
    const label = document.createElement("span");
    label.className = "info-stat-card__label";
    label.textContent = stat.label;
    const value = document.createElement("strong");
    value.className = "info-stat-card__value";
    value.textContent = stat.value;
    card.appendChild(label);
    card.appendChild(value);
    infoStats.appendChild(card);
  });
}

function renderInfoAbilities(details) {
  if (!infoAbilities) return;
  infoAbilities.innerHTML = "";
  const abilities = details.abilities || [];
  if (!abilities.length) {
    infoAbilities.textContent = "No ability data available.";
    return;
  }
  abilities.forEach((ability) => {
    const chip = document.createElement("span");
    chip.className = "info-pill";
    chip.textContent = ability;
    infoAbilities.appendChild(chip);
  });
}

function renderInfoFacts(details) {
  if (!infoFacts) return;
  infoFacts.innerHTML = "";
  const facts = [
    { label: "Color", value: details.color },
    { label: "Habitat", value: details.habitat },
    { label: "Shape", value: details.shape },
    { label: "Growth Rate", value: details.growthRate },
    { label: "Capture Rate", value: details.captureRate },
    { label: "Base Happiness", value: details.baseHappiness }
  ].filter((fact) => fact.value);

  if (!facts.length) {
    infoFacts.textContent = "No additional data available.";
    return;
  }

  facts.forEach((fact) => {
    const row = document.createElement("div");
    row.className = "info-fact";
    const label = document.createElement("span");
    label.className = "info-fact__label";
    label.textContent = fact.label;
    const value = document.createElement("strong");
    value.className = "info-fact__value";
    value.textContent = fact.value;
    row.appendChild(label);
    row.appendChild(value);
    infoFacts.appendChild(row);
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

  const heightM = pokemon.height ? `${(pokemon.height / 10).toFixed(1)} m` : "";
  const weightKg = pokemon.weight ? `${(pokemon.weight / 10).toFixed(1)} kg` : "";
  const abilities = (pokemon.abilities || [])
    .slice()
    .sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0))
    .map((a) => {
      const name = prettifyName(a.ability.name);
      return a.is_hidden ? `${name} (Hidden)` : name;
    });
  const genusEntry = (species.genera || []).find(
    (g) => g.language && g.language.name === "en"
  );

  const details = {
    genus: genusEntry ? genusEntry.genus : "",
    height: heightM,
    weight: weightKg,
    abilities,
    baseExperience: pokemon.base_experience ? String(pokemon.base_experience) : "",
    color: species.color ? prettifyName(species.color.name) : "",
    habitat: species.habitat ? prettifyName(species.habitat.name) : "",
    shape: species.shape ? prettifyName(species.shape.name) : "",
    growthRate: species.growth_rate ? prettifyName(species.growth_rate.name) : "",
    captureRate:
      typeof species.capture_rate === "number" ? String(species.capture_rate) : "",
    baseHappiness:
      typeof species.base_happiness === "number" ? String(species.base_happiness) : ""
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
  const maxDist = getMaxTypoDistance(normalized);
  if (maxDist <= 0) return null;
  let bestCanonical = null;
  let bestDist = maxDist + 1;
  let bestCount = 0;
  for (const candidate of getTypoCandidates(normalized, maxDist)) {
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

function getMaxTypoDistance(normalized) {
  const mode = typoModeSelect ? typoModeSelect.value : DEFAULT_TYPO_MODE;
  if (mode === "strict") return 0;
  if (mode === "forgiving") {
    if (normalized.length <= 4) return 1;
    if (normalized.length <= 8) return 2;
    return 3;
  }
  return normalized.length <= 6 ? 1 : 2;
}

function syncTypoSettings() {
  if (!typoModeSelect || !autocorrectToggle) return;
  const isStrict = typoModeSelect.value === "strict";
  autocorrectToggle.disabled = isStrict;
  autocorrectToggle
    .closest(".toggle")
    ?.classList.toggle("toggle--disabled", isStrict);
}

function getTypoCandidates(normalized, maxDist) {
  if (!state.guessByLength.size) {
    return state.guessIndex.keys();
  }
  const candidates = [];
  for (let len = normalized.length - maxDist; len <= normalized.length + maxDist; len += 1) {
    const guesses = state.guessByLength.get(len);
    if (!guesses) continue;
    guesses.forEach((guess) => candidates.push(guess));
  }
  return candidates;
}

function handleGuess(value) {
  const normalized = normalizeGuess(value);
  if (!normalized) return;
  if (isStudyMode()) {
    const currentName = state.studyCurrent;
    if (!currentName) return;
    if (state.studyRevealed) {
      showStatusHint("Use Next to continue.");
      return;
    }
    const canonical = state.guessIndex.get(normalized);
    if (canonical === currentName) {
      advanceStudyCard({ markFound: true });
      showStatusHint("Correct!");
      return;
    }
    const typoMatch = findTypoMatch(normalized);
    if (typoMatch === currentName) {
      advanceStudyCard({ markFound: true });
      const label = state.meta.get(currentName)?.label || "Pokemon";
      showStatusHint(`Corrected to ${label}.`);
      return;
    }
    showStatusHint("Not quite. Reveal it or press Next.");
    return;
  }
  const canonical = state.guessIndex.get(normalized);
  if (canonical && state.activeNames.has(canonical)) {
    const isNew = !state.found.has(canonical);
    state.found.add(canonical);
    if (isNew) state.recentlyFound.add(canonical);
    updateStats();
    updateSpriteCardsForPokemon(canonical, { animateReveal: isNew });
    renderStudyPanel();
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
  if (typoMatch && state.activeNames.has(typoMatch)) {
    if (autocorrectToggle && !autocorrectToggle.checked) {
      const label = state.meta.get(typoMatch)?.label || "Pokemon";
      showStatusHint(`Did you mean ${label}?`);
      return;
    }
    const isNew = !state.found.has(typoMatch);
    state.found.add(typoMatch);
    if (isNew) state.recentlyFound.add(typoMatch);
    updateStats();
    updateSpriteCardsForPokemon(typoMatch, { animateReveal: isNew });
    renderStudyPanel();
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
    return;
  }

}

function refreshGroupedGenerationHeaders() {
  if (!spriteGrid || !groupFilter || groupFilter.value !== "generation") return;
  const sections = [...spriteGrid.querySelectorAll(".group-card")];
  sections.forEach((section) => {
    const title = section.querySelector(".group-title");
    if (!title) return;
    const cards = [...section.querySelectorAll(".sprite-card")];
    const total = cards.length;
    const found = cards.filter((card) => !card.classList.contains("sprite-card--hidden")).length;
    const percent = total === 0 ? 0 : Math.round((found / total) * 100);
    const groupName = section.dataset.groupName || title.textContent || "";
    title.textContent = `${groupName} - ${percent}%`;
  });
}

function updateSpriteCardsForPokemon(canonical, { animateReveal = false } = {}) {
  if (!canonical || !spriteGrid) return;
  const entry = state.meta.get(canonical);
  if (!entry) return;
  const cards = [...spriteGrid.querySelectorAll(`.sprite-card[data-pokemon="${canonical}"]`)];
  if (!cards.length) return;

  const isFound = state.found.has(canonical);
  cards.forEach((card) => {
    const img = card.querySelector("img");
    const label = card.querySelector(".sprite-card__name");
    card.classList.toggle("sprite-card--hidden", !isFound);
    if (isFound && animateReveal) {
      card.classList.remove("sprite-card--revealed");
      void card.offsetWidth;
      card.classList.add("sprite-card--revealed");
      if (!document.body.classList.contains("outlines-off")) {
        card.classList.add("sprite-card--outline-reveal");
      }
      const spriteUrl = getSpriteForEntry(entry).replace(/"/g, '\\"');
      card.style.setProperty("--reveal-sprite", `url("${spriteUrl}")`);
    } else {
      card.classList.remove("sprite-card--revealed");
      card.classList.remove("sprite-card--outline-reveal");
      card.style.removeProperty("--reveal-sprite");
    }
    if (img) {
      img.src = getSpriteForEntry(entry);
      img.alt = isFound ? entry.label : "Unknown Pokemon";
    }
    if (label) {
      label.textContent = isFound ? entry.label : getHiddenLabel(entry);
    }
  });

  refreshGroupedGenerationHeaders();
  state.recentlyFound.delete(canonical);
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
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.classList.toggle("hint", Boolean(message) && hint);
  statusEl.hidden = !message || Boolean(inputEl && inputEl.value.trim());
  if (inputEl) {
    inputEl.placeholder = message ? "" : DEFAULT_INPUT_PLACEHOLDER;
    inputEl.classList.toggle("input-status-active", Boolean(message) && statusEl.hidden === false);
  }
}

function syncInlineStatusVisibility() {
  if (!statusEl || !inputEl) return;
  statusEl.hidden = !statusEl.textContent.trim() || Boolean(inputEl.value.trim());
  inputEl.classList.toggle("input-status-active", statusEl.hidden === false);
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
  syncInlineStatusVisibility();
  if (!value.includes(",")) return;
  const parts = value.split(",");
  parts.slice(0, -1).forEach(handleGuess);
  e.target.value = parts[parts.length - 1];
  syncInlineStatusVisibility();
}

function handleLiveMatch(e) {
  const value = e.target.value;
  const normalized = normalizeGuess(value);
  syncInlineStatusVisibility();
  if (!normalized) return;
  if (state.guessIndex.has(normalized) && !state.guessPrefixes.has(normalized)) {
    handleGuess(value);
    e.target.value = "";
    syncInlineStatusVisibility();
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

  // Avoid an implicit "all" state with no visible checkmarks.
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

function summarizeFilterSelection(values, formatter) {
  if (!values || !values.length) return "All";
  const labels = values.map(formatter).filter(Boolean);
  if (!labels.length) return "All";
  if (labels.length <= 2) return labels.join(", ");
  return `${labels[0]}, ${labels[1]} +${labels.length - 2}`;
}

function updateFilterSummary() {
  if (!filterSummary) return;
  const groupMap = { none: "None", generation: "Generations", type: "Type" };
  const groupLabel = groupMap[groupFilter ? groupFilter.value : "generation"] || "Generation";
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

function setFiltersPanelExpanded(expanded, { persist = true } = {}) {
  if (!filtersPanel || !filtersPanelToggle) return;
  const isExpanded = Boolean(expanded);
  filtersPanel.hidden = !isExpanded;
  filtersPanelToggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
  filtersPanelToggle.textContent = isExpanded ? "Hide Filters" : "Edit Filters";
  if (persist) saveSettings();
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
  state.activeNames = new Set(filtered);
  updateStats();
  renderSprites();
  buildGuessIndex();
  renderStudyPanel();
  syncChipGroup(typeFilter);
  syncChipGroup(genFilter);
  updateFilterSummary();
  saveState();
}

function buildGuessIndex() {
  state.guessIndex.clear();
  state.guessByLength.clear();
  state.guessPrefixes.clear();
  const registerGuess = (guess, canonical) => {
    if (!guess) return;
    const isNewGuess = !state.guessIndex.has(guess);
    state.guessIndex.set(guess, canonical);
    if (isNewGuess) {
      addPrefixes(guess);
      if (!state.guessByLength.has(guess.length)) {
        state.guessByLength.set(guess.length, []);
      }
      state.guessByLength.get(guess.length).push(guess);
    }
  };
  state.names.forEach((canonical) => {
    const labels = state.namesByLang.get(canonical);
    const entry = state.meta.get(canonical);
    const defaultLabel = entry ? entry.label : prettifyName(canonical);
    const localizedLabels = [
      labels && labels.get("en") ? labels.get("en") : defaultLabel,
      labels && labels.get("de") ? labels.get("de") : null,
      labels && labels.get("es") ? labels.get("es") : null
    ];

    localizedLabels.forEach((label) => {
      const guess = normalizeGuess(label);
      registerGuess(guess, canonical);
    });

    const fallbackGuess = normalizeGuess(defaultLabel);
    registerGuess(fallbackGuess, canonical);
  });
}

async function fetchResourcesInBatches(urls, batchSize = 40) {
  const output = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    if (!batch.length) continue;
    const batchResult = await pokedex.resource(batch);
    if (Array.isArray(batchResult)) {
      output.push(...batchResult);
    } else if (batchResult) {
      output.push(batchResult);
    }
  }
  return output;
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
      ? await fetchResourcesInBatches(detailUrls, 40)
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
    await restoreProgressFromHash();
    setInputStatus(DEFAULT_STATUS);
  } catch (err) {
    console.error("loadPokemon failed", err);
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
if (groupFilter) groupFilter.addEventListener("change", renderStudyPanel);
if (groupFilter) groupFilter.addEventListener("change", updateFilterSummary);
if (groupFilter) groupFilter.addEventListener("change", saveState);
if (filtersPanelToggle) {
  filtersPanelToggle.addEventListener("click", () => {
    setFiltersPanelExpanded(filtersPanel ? filtersPanel.hidden : false);
  });
}
if (progressExportBtn) {
  progressExportBtn.addEventListener("click", () => {
    copyProgressLink();
  });
}
if (progressCopyBtn) {
  progressCopyBtn.addEventListener("click", () => {
    copyExistingProgressValue();
  });
}
if (progressImportBtn) {
  progressImportBtn.addEventListener("click", () => {
    importProgressValue(progressCodeEl ? progressCodeEl.value : "");
  });
}
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
  settingsReset.addEventListener("click", async (event) => {
    event.preventDefault();
    await confirmResetSettings();
  });
}

if (gameModeSelect) {
  gameModeSelect.addEventListener("change", () => {
    if (gameModeSelect.value !== "study") {
      state.studyDeck = [];
      state.studyCurrent = null;
      state.studyRevealed = false;
    }
    applyFilters();
    saveSettings();
  });
}

if (studyRevealBtn) {
  studyRevealBtn.addEventListener("click", () => {
    if (!state.studyCurrent) return;
    if (state.studyRevealed) return;
    startTimer();
    state.studyRevealed = true;
    if (inputEl) {
      inputEl.value = "";
      syncInlineStatusVisibility();
    }
    renderStudyPanel();
    saveState();
  });
}

if (studyNextBtn) {
  studyNextBtn.addEventListener("click", () => {
    if (!state.studyCurrent) return;
    startTimer();
    advanceStudyCard({ repeat: true });
  });
}

if (typoModeSelect) {
  typoModeSelect.addEventListener("change", () => {
    syncTypoSettings();
    saveSettings();
  });
}

if (autocorrectToggle) {
  autocorrectToggle.addEventListener("change", saveSettings);
}

if (darkToggle) {
  darkToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark-mode", darkToggle.checked);
    updateThemeColorMeta();
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
if (confirmAccept) confirmAccept.addEventListener("click", () => closeConfirmModal(true));
if (confirmCancel) confirmCancel.addEventListener("click", () => closeConfirmModal(false));
if (confirmClose) confirmClose.addEventListener("click", () => closeConfirmModal(false));
if (confirmModal) {
  confirmModal.addEventListener("click", (event) => {
    if (event.target === confirmModal) closeConfirmModal(false);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (confirmResolver) {
      closeConfirmModal(false);
      return;
    }
    if (infoModal && !infoModal.classList.contains("hidden")) {
      closeInfoModal();
      return;
    }
  }
  trapModalFocus(event);
});

if (inputEl) {
  focusInput();
  document.addEventListener("click", (event) => {
    if (!inputEl) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (
      target.closest(
        "input, textarea, select, button, a, label, .sidebar, .modal, .sprite-board, .sprite-card, .study-panel"
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

window.addEventListener("hashchange", handleProgressHashChange);

syncTypoSettings();
loadPokemon();
