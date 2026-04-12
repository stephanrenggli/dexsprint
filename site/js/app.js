import { playCry as playCryModule } from "./services/audio.js";
import {
  DEFAULT_GAME_MODE,
  DEFAULT_STATUS,
  DEFAULT_TYPO_MODE,
  LEGACY_STORAGE_KEY,
  LEGACY_STORAGE_SETTINGS_KEY,
  LEGACY_PROGRESS_CODE_PREFIX,
  PROGRESS_CODE_PREFIX,
  SAVE_STATE_DEBOUNCE_MS,
  STORAGE_KEY,
  STORAGE_BACKUP_KEY,
  STORAGE_SCHEMA_VERSION,
  STORAGE_SETTINGS_KEY,
  state,
} from "./core/app-state.js";
import {
  DEFAULT_INPUT_PLACEHOLDER,
  DEFAULT_THEME,
  THEMES,
  STUDY_SCENE_PALETTE_BY_TYPE,
  githubRepo,
  spriteFallback,
  spriteShinyBase
} from "./core/app-config.js";
import {
  formatGenerationLabel,
  generationOrder,
  normalizeGuess,
  normalizeName,
  prettifyName
} from "./domain/text.js";
import { decodeProgressPayload, encodeProgressPayload } from "./domain/progress-code.js";
import {
  buildGuessIndex as buildGuessIndexModule,
  findTypoMatch as findTypoMatchModule,
} from "./domain/typo-match.js";
import {
  buildStatePayload as buildStatePayloadCore,
  clearState as clearStateCore,
  flushStateSave as flushStateSaveCore,
  parsePersistedStateRecord as parsePersistedStateRecordCore,
  restoreState as restoreStateCore
} from "./core/persistence.js";
import { createTimerController } from "./core/timer.js";
import {
  getBadgeContext as getBadgeContextCore,
  getCompletedGroupEntries as getCompletedGroupEntriesCore,
  getProgressMilestoneEntries as getProgressMilestoneEntriesCore,
  getProgressUnlockContext as getProgressUnlockContextCore
} from "./core/selectors.js";
import { createPokemonBootstrap } from "./core/bootstrap.js";
import { createChangelogController } from "./features/changelog.js";
import { createModalController } from "./features/modals.js";
import { createInfoController } from "./features/info.js";
import { createFiltersController } from "./features/filters.js";
import { createDebugController } from "./features/debug.js";
import { createProgressController } from "./features/progress.js";
import { createWeeklyChallengeController } from "./features/weekly-challenge.js";
import { createSettingsController } from "./features/settings.js";
import { createProgressShareController } from "./features/progress-share.js";
import { createQuizController } from "./features/quiz.js";
import { createStudyController } from "./features/study.js";
import { createViewController } from "./features/views.js";
import { createMultiplayerController } from "./features/multiplayer.js";
import { createMultiplayerClient } from "./services/multiplayer-client.js";
import {
  formatFilterSummary,
  getGenerationSlugByInput as getGenerationSlugByInputCore,
  getTypeSlugByInput as getTypeSlugByInputCore,
  summarizeFilterSelection as summarizeFilterSelectionCore
} from "./domain/filters.js";
import {
  applyMetadataIndexes as applyMetadataIndexesModule,
  scheduleLocalizedNameHydration as scheduleLocalizedNameHydrationModule
} from "./services/catalog-hydration.js";
import {
  fetchResourcesInBatches as fetchResourcesInBatchesModule,
  loadGenerations as loadGenerationsModule,
  loadTypes as loadTypesModule
} from "./services/catalog-source.js";
import { flashElement as flashElementUI, setCheckboxGroupDisabled } from "./ui/dom.js";
import {
  enhanceSettingsInfoTips as enhanceSettingsInfoTipsUI,
  positionSettingsInfoTips as positionSettingsInfoTipsUI
} from "./ui/tips.js";
import { showStateToast as showStateToastUI } from "./ui/toasts.js";
import { createStatusController } from "./ui/status.js";

const totalCount = document.getElementById("total-count");
const foundCount = document.getElementById("found-count");
const timerEl = document.getElementById("timer");
const compactTotalCount = document.getElementById("compact-total-count");
const compactFoundCount = document.getElementById("compact-found-count");
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
const spriteBoardFilters = document.querySelector(".app .sprite-board-filters");
const spriteGrid = document.getElementById("sprite-grid");
const progressBar = document.getElementById("progress-bar");
const progressMilestonesEl = document.getElementById("progress-milestones");
const progressValue = document.getElementById("progress-value");
const resetBtn = document.getElementById("reset-btn");
const resetBtnCompact = document.getElementById("reset-btn-compact");
const filtersToggleCompact = document.getElementById("filters-toggle-compact");
const outlineToggle = document.getElementById("outline-toggle");
const filtersToggle = document.getElementById("filters-toggle");
const compactToggle = document.getElementById("compact-toggle");
const criesToggle = document.getElementById("cries-toggle");
const legacyCriesToggle = document.getElementById("legacy-cries-toggle");
const settingsModal = document.getElementById("settings-modal");
const settingsClose = document.getElementById("settings-close");
const multiplayerOpenBtn = document.getElementById("multiplayer-open");
const multiplayerOpenCompactBtn = document.getElementById("multiplayer-open-compact");
const multiplayerModal = document.getElementById("multiplayer-modal");
const multiplayerFiltersSlot = document.getElementById("multiplayer-filters-slot");
const multiplayerFilterSummary = document.getElementById("multiplayer-filter-summary");
const multiplayerFiltersPanel = document.getElementById("multiplayer-filters-panel");
const multiplayerFiltersPanelToggle = document.getElementById("multiplayer-filters-panel-toggle");
const multiplayerGroupFilter = document.getElementById("multiplayer-group-filter");
const multiplayerGenFilter = document.getElementById("multiplayer-gen-filter");
const multiplayerTypeFilter = document.getElementById("multiplayer-type-filter");
const multiplayerClose = document.getElementById("multiplayer-close");
const multiplayerJoinModal = document.getElementById("multiplayer-join-modal");
const multiplayerJoinClose = document.getElementById("multiplayer-join-close");
const multiplayerJoinMessage = document.getElementById("multiplayer-join-message");
const multiplayerJoinPlayerName = document.getElementById("multiplayer-join-player-name");
const multiplayerJoinCancel = document.getElementById("multiplayer-join-cancel");
const multiplayerJoinAccept = document.getElementById("multiplayer-join-accept");
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
const achievementsOpenBtn = document.getElementById("achievements-open");
const achievementsOpenCompactBtn = document.getElementById("achievements-open-compact");
const achievementsModal = document.getElementById("achievements-modal");
const achievementsClose = document.getElementById("achievements-close");
const achievementToast = document.getElementById("achievement-toast");
const achievementToastMeta = document.querySelector(".achievement-toast__meta");
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
const confirmCancel = document.getElementById("confirm-cancel");
const confirmAccept = document.getElementById("confirm-accept");
const changelogModal = document.getElementById("changelog-modal");
const changelogClose = document.getElementById("changelog-close");
const changelogOpen = document.getElementById("changelog-open");
const changelogContent = document.getElementById("changelog-content");
const progressCodeEl = document.getElementById("progress-code");
const progressCopyBtn = document.getElementById("progress-copy");
const progressCopyCodeBtn = document.getElementById("progress-copy-code");
const progressQrBtn = document.getElementById("progress-qr");
const progressImportBtn = document.getElementById("progress-import");
const progressFeedbackEl = document.getElementById("progress-feedback");
const progressIncludeSettingsEl = document.getElementById("progress-include-settings");
const qrModal = document.getElementById("qr-modal");
const qrClose = document.getElementById("qr-close");
const qrImage = document.getElementById("qr-image");
const qrLink = document.getElementById("qr-link");
const qrCopyBtn = document.getElementById("qr-copy");
const settingsPanelCard = settingsModal ? settingsModal.querySelector(".settings-panel") : null;
const multiplayerGameplayLock = document.getElementById("multiplayer-gameplay-lock");
const multiplayerGameplayControls = document.getElementById("multiplayer-gameplay-controls");
const multiplayerProgressLock = document.getElementById("multiplayer-progress-lock");
const multiplayerProgressControls = document.getElementById("multiplayer-progress-controls");
const guessForm = document.getElementById("guess-form");
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
const multiplayerPanel = document.getElementById("multiplayer-panel");
const multiplayerStatus = document.getElementById("multiplayer-status");
const multiplayerPlayers = document.getElementById("multiplayer-players");
const multiplayerEvents = document.getElementById("multiplayer-events");
const multiplayerRoomCode = document.getElementById("multiplayer-room-code");
const multiplayerRoomCodeModal = document.getElementById("multiplayer-room-code-modal");
const multiplayerRoomCodeDisplay = document.getElementById("multiplayer-room-code-display");
const multiplayerRoomCodeField = document.getElementById("multiplayer-room-code-field");
const multiplayerRoomCodeInput = document.getElementById("multiplayer-room-code-input");
const multiplayerPlayerName = document.getElementById("multiplayer-player-name");
const multiplayerMode = document.getElementById("multiplayer-mode");
const multiplayerCreate = document.getElementById("multiplayer-create");
const multiplayerJoin = document.getElementById("multiplayer-join");
const multiplayerStart = document.getElementById("multiplayer-start");
const multiplayerLeave = document.getElementById("multiplayer-leave");
const multiplayerCopy = document.getElementById("multiplayer-copy");
const multiplayerCopyCode = document.getElementById("multiplayer-copy-code");

const pokedex = new Pokedex.Pokedex({
  cache: true,
  timeout: 10000,
  cacheImages: false
});
const stateToastState = { queue: [], active: false };
const multiplayerClient = createMultiplayerClient();
let changelogController = null;
let progressShareController = null;
let weeklyChallengeController = null;
let timerController = null;
let statusController = null;
let filtersController = null;
let progressController = null;
let debugController = null;
let modalController = null;
let infoController = null;
let settingsController = null;
let quizController = null;
let studyController = null;
let viewController = null;
let multiplayerFiltersController = null;
let multiplayerController = null;
let soloTimerSnapshot = null;

function setMultiplayerFiltersInModal(inModal) {
  if (!multiplayerFiltersSlot) return;
  multiplayerFiltersSlot.hidden = !inModal;
  multiplayerFiltersSlot.setAttribute("aria-hidden", inModal ? "false" : "true");
}

function isMultiplayerActive() {
  return multiplayerController?.isActive?.() || false;
}

function isMultiplayerHost() {
  return multiplayerController?.isHost?.() || false;
}

function isMultiplayerModalOpen() {
  return Boolean(multiplayerModal && !multiplayerModal.classList.contains("hidden"));
}

async function registerAppServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.warn("Service worker registration failed", error);
  }
}

function getStableProgressIds() {
  return [...state.found]
    .map((name) => state.meta.get(name))
    .filter((entry) => entry && entry.dexId)
    .map((entry) => Number(entry.dexId))
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b);
}

let settingsInfoTipsRaf = null;
function scheduleSettingsInfoTipsPlacement() {
  if (settingsInfoTipsRaf) cancelAnimationFrame(settingsInfoTipsRaf);
  settingsInfoTipsRaf = requestAnimationFrame(() => {
    settingsInfoTipsRaf = null;
    enhanceSettingsInfoTipsUI(settingsPanelCard);
    positionSettingsInfoTipsUI(settingsPanelCard);
  });
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
    group: groupFilter ? groupFilter.value : "generation",
    filtersPanelExpanded: Boolean(filtersPanel && !filtersPanel.hidden),
    dark: document.documentElement.classList.contains("dark-mode"),
    theme: document.documentElement.dataset.theme || DEFAULT_THEME
  };
}

function getShareableSettingsPayload() {
  const shareableSettings = getSettingsPayload();
  delete shareableSettings.filtersPanelExpanded;
  return shareableSettings;
}

function getMultiplayerRoomSettings() {
  const group = multiplayerGroupFilter && ["none", "generation", "type"].includes(multiplayerGroupFilter.value)
    ? multiplayerGroupFilter.value
    : "generation";
  return {
    mode: multiplayerMode && multiplayerMode.value === "coop" ? "coop" : "race",
    typoMode: typoModeSelect ? typoModeSelect.value : DEFAULT_TYPO_MODE,
    autocorrect: autocorrectToggle ? autocorrectToggle.checked : true,
    outlinesOff: document.body.classList.contains("outlines-off"),
    showDex: showDexToggle ? showDexToggle.checked : false,
    group,
    generations: multiplayerFiltersController?.getSelectedGenerations() || [],
    types: multiplayerFiltersController?.getSelectedTypes() || []
  };
}

timerController = createTimerController({
  state,
  timerEl,
  compactTimerEl,
  saveState
});

statusController = createStatusController({
  state,
  inputEl,
  statusEl,
  defaultStatus: DEFAULT_STATUS,
  defaultInputPlaceholder: DEFAULT_INPUT_PLACEHOLDER
});

progressShareController = createProgressShareController({
  state,
  progressCodeEl,
  progressIncludeSettingsEl,
  progressFeedbackEl,
  progressImportBtn,
  progressCopyBtn,
  progressQrBtn,
  qrModal,
  qrClose,
  qrImage,
  qrLink,
  qrCopyBtn,
  openModal,
  closeModal,
  progressCodePrefix: PROGRESS_CODE_PREFIX,
  legacyProgressCodePrefix: LEGACY_PROGRESS_CODE_PREFIX,
  getStableProgressIds,
  getElapsedSeconds: timerController.getElapsedSeconds,
  formatTime: timerController.formatTime,
  encodeProgressPayload,
  decodeProgressPayload,
  requestConfirmation,
  applySettingsPayload,
  getShareableSettingsPayload,
  saveState,
  showStatusHint,
  setTimerText: timerController.setTimerText,
  startTimer: timerController.startTimer,
  stopTimer: timerController.stopTimer,
  updateStats,
  renderSprites,
  renderStudyPanel,
  syncProgressUnlockCues,
  syncProgressMilestoneCues,
  selectProgressCode,
  getImportPreviewStats,
  setProgressFeedback
});

weeklyChallengeController = createWeeklyChallengeController({
  state,
  genFilter,
  typeFilter,
  filtersPanelToggle,
  setFiltersPanelExpanded,
  inputEl,
  statusEl,
  defaultStatus: DEFAULT_STATUS,
  setInputStatus,
  formatGenerationLabel,
  generationOrder,
  prettifyName,
  getGameMode,
  defaultInputPlaceholder: DEFAULT_INPUT_PLACEHOLDER
});

filtersController = createFiltersController({
  state,
  genFilter,
  typeFilter,
  groupFilter,
  filtersPanel,
  filtersPanelToggle,
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
  buildGuessIndex: buildGuessIndexModule,
  normalizeGuess,
  saveState,
  updateFilterSummary: () => settingsController?.updateFilterSummary(),
  setFiltersPanelExpanded: (expanded, options) => settingsController?.setFiltersPanelExpanded(expanded, options),
  syncWeeklyChallengeState
});

multiplayerFiltersController = createFiltersController({
  state,
  genFilter: multiplayerGenFilter,
  typeFilter: multiplayerTypeFilter,
  filtersPanel: multiplayerFiltersPanel,
  filtersPanelToggle: multiplayerFiltersPanelToggle,
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
  buildGuessIndex: buildGuessIndexModule,
  normalizeGuess,
  saveState: () => {},
  onFiltersChanged: () => multiplayerController?.configureRoom?.(),
  updateFilterSummary: updateMultiplayerFilterSummary,
  setFiltersPanelExpanded: setMultiplayerFiltersPanelExpanded,
  syncWeeklyChallengeState,
  isFiltersLocked: () => isMultiplayerActive() && !isMultiplayerHost()
});

debugController = createDebugController({
  state,
  unlockGeneration,
  unlockType,
  unlockPokemonByCanonical,
  unlockAllPokemon,
  resetQuiz,
  clearState,
  getDebugState,
  listDebugGenerations,
  listDebugTypes,
  forceWeeklyChallengeWeek
});

changelogController = createChangelogController({
  githubRepo,
  changelogContent
});

modalController = createModalController({
  renderBadges,
  scheduleSettingsInfoTipsPlacement,
  ensureChangelogLoaded: () => changelogController?.ensureChangelogLoaded(),
  settingsModal,
  settingsClose,
  achievementsModal,
  achievementsClose,
  changelogModal,
  changelogClose,
  confirmModal,
  confirmTitle,
  confirmMessage,
  confirmAccept
});

infoController = createInfoController({
  state,
  pokedex,
  modalController,
  infoModal,
  infoClose,
  infoSprite,
  infoTitle,
  infoMeta,
  infoTypes,
  infoGenus,
  infoAbilities,
  infoStats,
  infoFacts,
  getSpriteForEntry,
  playCry
});

settingsController = createSettingsController({
  state,
  localStorage,
  storageSettingsKey: STORAGE_SETTINGS_KEY,
  legacyStorageSettingsKey: LEGACY_STORAGE_SETTINGS_KEY,
  defaultTheme: DEFAULT_THEME,
  themes: THEMES,
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
  setInputStatus,
  updateThemeColorMeta,
  getSettingsPayload,
  getGameMode,
  getWeeklyChallengeTheme,
  requestConfirmation: (...args) => modalController.requestConfirmation(...args),
  isFiltersLocked: () => isMultiplayerActive()
});

studyController = createStudyController({
  state,
  studyPanel,
  studyCard,
  studyActions,
  studySubtitle,
  studyCounter,
  studySprite,
  studySpriteWrap,
  studyName,
  studyMeta,
  studyTypes,
  studyRevealBtn,
  studyNextBtn,
  inputEl,
  paletteByType: STUDY_SCENE_PALETTE_BY_TYPE,
  getSpriteForEntry,
  setInputStatus,
  syncInlineStatusVisibility,
  playCry,
  markPokemonFound,
  updateStats,
  updateSpriteCardsForPokemon,
  showRevealPreview,
  saveState,
  isStudyMode
});

viewController = createViewController({
  state,
  spriteGrid,
  groupFilter,
  progressBar,
  progressValue,
  progressMilestonesEl,
  foundCount,
  compactFoundCount,
  badgeList,
  badgeHeading,
  inputEl,
  showStateToast,
  flashElement: flashElementUI,
  getBadgeContext: () => getBadgeContextCore(state),
  getProgressMilestoneEntries: getProgressMilestoneEntriesCore,
  getSpriteForEntry,
  getHiddenLabel,
  formatGenerationLabel,
  generationOrder
});

progressController = createProgressController({
  state,
  foundCount,
  totalCount,
  compactFoundCount,
  compactTotalCount,
  progressBar,
  progressValue,
  saveState,
  stopTimer,
  renderProgressMilestones,
  triggerCompletionCelebration,
  clearCompletionCelebration,
  flashProgressChange,
  flashProgressMilestone,
  syncProgressUnlockCues,
  syncProgressMilestoneCues,
  syncProgressLinkPreview,
  renderBadges,
  getCompletedGroupEntries,
  isStudyMode,
  showStateToast
});

multiplayerController = createMultiplayerController({
  client: multiplayerClient,
  state,
  elements: {
    panel: multiplayerPanel,
    status: multiplayerStatus,
    players: multiplayerPlayers,
    events: multiplayerEvents,
    roomCode: multiplayerRoomCode,
    modalRoomCode: multiplayerRoomCodeModal,
    roomCodeDisplay: multiplayerRoomCodeDisplay,
    roomCodeField: multiplayerRoomCodeField,
    roomCodeInput: multiplayerRoomCodeInput,
    playerNameInput: multiplayerPlayerName,
    modeSelect: multiplayerMode,
    createBtn: multiplayerCreate,
    joinBtn: multiplayerJoin,
    startBtn: multiplayerStart,
    leaveBtn: multiplayerLeave,
    copyBtn: multiplayerCopy,
    copyCodeBtn: multiplayerCopyCode
  },
  joinInvite: {
    message: multiplayerJoinMessage,
    playerNameInput: multiplayerJoinPlayerName,
    acceptBtn: multiplayerJoinAccept,
    cancelBtn: multiplayerJoinCancel,
    closeBtn: multiplayerJoinClose,
    modal: multiplayerJoinModal
  },
  getRoomSettings: getMultiplayerRoomSettings,
  recalculateActiveFoundCount,
  updateStats,
  renderSprites,
  renderStudyPanel,
  showRevealPreview,
  playCry,
  showStatusHint,
  focusInput,
  saveSoloTimerSnapshot,
  restoreSoloTimerSnapshot,
  syncMultiplayerTimer,
  applyRoomSettings: applyMultiplayerRoomSettings,
  restoreLocalSettings: restoreSettings,
  isFiltersLocked: () => isMultiplayerActive(),
  onRoomStateChange: syncMultiplayerLockState,
  openJoinPrompt: openMultiplayerJoinModal,
  closeJoinPrompt: closeMultiplayerJoinModal,
  closeRoomModal: closeMultiplayerModal
});

quizController = createQuizController({
  state,
  inputEl,
  autocorrectToggle,
  typoModeSelect,
  normalizeGuess,
  playCry,
  findTypoMatch,
  isStudyMode,
  advanceStudyCard,
  markPokemonFound,
  showRevealPreview,
  updateStats,
  updateSpriteCardsForPokemon,
  renderStudyPanel,
  saveState,
  showStatusHint,
  setInputStatus,
  startTimer,
  highlightPokemon,
  syncInlineStatusVisibility,
  isMultiplayerActive: () => isMultiplayerActive(),
  submitMultiplayerGuess: (value) => multiplayerController?.submitGuess(value) || false
});
const handleSubmit = quizController.handleSubmit;

function getGameMode() {
  if (isMultiplayerModalOpen() || isMultiplayerActive()) {
    return DEFAULT_GAME_MODE;
  }
  return gameModeSelect ? gameModeSelect.value : DEFAULT_GAME_MODE;
}

function isStudyMode() {
  return getGameMode() === "practice";
}

function isWeeklyChallengeMode() {
  return getGameMode() === "weekly";
}

function refreshWeeklyChallengeCatalog() {
  return weeklyChallengeController?.refreshWeeklyChallengeCatalog();
}

function getWeeklyChallengeTheme() {
  return weeklyChallengeController?.getWeeklyChallengeTheme() || null;
}

function isWeeklyChallengeReady(theme = getWeeklyChallengeTheme()) {
  return weeklyChallengeController?.isWeeklyChallengeReady(theme) || false;
}

function getWeeklyChallengeNames(theme = getWeeklyChallengeTheme()) {
  return weeklyChallengeController?.getWeeklyChallengeNames(theme) || [];
}

function syncWeeklyChallengeState() {
  return weeklyChallengeController?.syncWeeklyChallengeState();
}

function applySettingsPayload(data, { persist = true } = {}) {
  return settingsController?.applySettingsPayload(data, { persist });
}

function setProgressFeedback(message) {
  progressShareController?.setProgressFeedback(message);
}

function updateMultiplayerFilterSummary() {
  if (!multiplayerFilterSummary) return;
  const group = multiplayerGroupFilter?.value || "generation";
  const generationSummary = summarizeFilterSelectionCore(
    multiplayerFiltersController?.getSelectedGenerations() || [],
    (gen) => formatGenerationLabel(gen)
  );
  const typeSummary = summarizeFilterSelectionCore(
    multiplayerFiltersController?.getSelectedTypes() || [],
    (type) => prettifyName(type)
  );
  multiplayerFilterSummary.textContent = formatFilterSummary({
    group,
    generationSummary,
    typeSummary
  });
}

function setMultiplayerFiltersPanelExpanded(expanded, { persist = false } = {}) {
  if (!multiplayerFiltersPanel || !multiplayerFiltersPanelToggle) return;
  const isExpanded = Boolean(expanded);
  multiplayerFiltersPanel.hidden = !isExpanded;
  multiplayerFiltersPanelToggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
  multiplayerFiltersPanelToggle.textContent = isExpanded ? "Hide Filters" : "Edit Filters";
  if (persist) {
    updateMultiplayerFilterSummary();
  }
}

function saveSoloTimerSnapshot() {
  if (soloTimerSnapshot) return;
  soloTimerSnapshot = {
    savedElapsed: state.savedElapsed || 0,
    startTime: state.startTime,
    running: Boolean(state.timerId)
  };
}

function restoreSoloTimerSnapshot() {
  if (!soloTimerSnapshot) return;
  const snapshot = soloTimerSnapshot;
  soloTimerSnapshot = null;
  if (state.timerId) stopTimer();
  state.savedElapsed = snapshot.savedElapsed || 0;
  state.startTime = snapshot.startTime || null;
  if (snapshot.running && state.startTime) {
    startTimer(true);
    setTimerText(formatTime(getElapsedSeconds()));
  } else {
    setTimerText(formatTime(state.savedElapsed || 0));
  }
}

function syncMultiplayerTimer(snapshot = null) {
  if (!snapshot?.timerStartedAt) {
    if (state.timerId) stopTimer();
    state.savedElapsed = 0;
    state.startTime = null;
    setTimerText("00:00");
    return;
  }

  const startedAt = Date.parse(snapshot.timerStartedAt);
  if (!Number.isFinite(startedAt)) return;

  if (state.timerId) stopTimer();
  state.savedElapsed = 0;
  state.startTime = startedAt;
  startTimer(true);
  setTimerText(formatTime(getElapsedSeconds()));
}

function syncMultiplayerLockState(snapshot = null) {
  const inRoom = Boolean(snapshot);
  const host = inRoom && isMultiplayerHost();
  const setupLocked = inRoom && snapshot?.status !== "lobby";
  const filterInputsDisabled = inRoom ? setupLocked || !host : false;
  const showModalFilters =
    isMultiplayerModalOpen() &&
    (!inRoom || host);

  if (multiplayerGameplayLock) multiplayerGameplayLock.hidden = !inRoom;
  if (multiplayerGameplayControls) multiplayerGameplayControls.hidden = inRoom;
  if (multiplayerProgressLock) multiplayerProgressLock.hidden = !inRoom;
  if (multiplayerProgressControls) multiplayerProgressControls.hidden = inRoom;
  if (progressIncludeSettingsEl) progressIncludeSettingsEl.disabled = inRoom;
  if (progressImportBtn) progressImportBtn.disabled = inRoom;
  if (progressCopyBtn) progressCopyBtn.disabled = inRoom;
  if (progressCopyCodeBtn) progressCopyCodeBtn.disabled = inRoom;
  if (progressQrBtn) progressQrBtn.disabled = inRoom;
  if (progressCodeEl) progressCodeEl.disabled = inRoom;
  if (progressCodeEl) progressCodeEl.setAttribute("aria-disabled", inRoom ? "true" : "false");
  if (progressCodeEl) progressCodeEl.classList.toggle("is-disabled", inRoom);
  if (resetBtn) resetBtn.disabled = inRoom && !host;
  if (resetBtnCompact) resetBtnCompact.disabled = inRoom && !host;
  if (spriteBoardFilters) {
    spriteBoardFilters.hidden = inRoom;
  }
  if (multiplayerFiltersPanelToggle) multiplayerFiltersPanelToggle.disabled = inRoom ? setupLocked || !host : false;
  if (multiplayerGroupFilter) multiplayerGroupFilter.disabled = inRoom ? setupLocked || !host : false;
  if (multiplayerFiltersSlot) {
    setCheckboxGroupDisabled(
      multiplayerFiltersSlot.querySelectorAll(".chip-grid input[type='checkbox']"),
      filterInputsDisabled,
      multiplayerFiltersSlot
    );
  }
  if (groupFilter) groupFilter.disabled = inRoom;
  if (filtersPanelToggle) filtersPanelToggle.disabled = inRoom;
  setCheckboxGroupDisabled(document.querySelectorAll(".chip-grid input[type='checkbox']"), filterInputsDisabled);
  if (gameModeSelect) gameModeSelect.disabled = inRoom;
  if (typoModeSelect) typoModeSelect.disabled = inRoom;
  if (autocorrectToggle) autocorrectToggle.disabled = inRoom;
  if (outlineToggle) outlineToggle.disabled = inRoom && !host;
  if (showDexToggle) showDexToggle.disabled = inRoom && !host;
  setMultiplayerFiltersInModal(showModalFilters);
}

function getImportPreviewStats(imported) {
  const importedCount = [...imported.found].filter((name) => state.meta.has(name)).length;
  return [
    { label: "Pokemon", value: String(importedCount) },
    { label: "Timer", value: formatTime(imported.elapsed) },
    { label: "Settings", value: imported.settings ? "Included" : "Not included" }
  ];
}

function selectProgressCode() {
  if (!progressCodeEl) return;
  progressCodeEl.focus();
  progressCodeEl.select();
}

const stateToastRefs = {
  toastEl: achievementToast,
  metaEl: achievementToastMeta,
  iconEl: achievementToastIcon,
  titleEl: achievementToastTitle
};

function closeConfirmModal(result) {
  modalController?.closeConfirmModal(result);
}

function trapModalFocus(event) {
  modalController?.trapModalFocus(event);
}

function openModal(modal, initialFocus = null) {
  modalController?.openModal(modal, initialFocus);
}

function closeModal(modal, { restoreFocus = true } = {}) {
  modalController?.closeModal(modal, { restoreFocus });
}

function openAchievementsModal() {
  modalController?.openAchievementsModal();
}

function closeAchievementsModal() {
  modalController?.closeAchievementsModal();
}

function flashElement(el, className, timeout = 700) {
  flashElementUI(el, className, timeout);
}

function flashProgressChange() {
  return viewController?.flashProgressChange();
}

function flashProgressMilestone(count) {
  return viewController?.flashProgressMilestone(count);
}

function renderProgressMilestones(total, found = state.activeFoundCount) {
  return viewController?.renderProgressMilestones(total, found);
}

function showStateToast({ meta, title, icon }) {
  showStateToastUI(stateToastState, stateToastRefs, { meta, title, icon });
}

function openChangelogModal() {
  modalController?.openChangelogModal();
}

function closeChangelogModal() {
  modalController?.closeChangelogModal();
}

function openSettingsModal() {
  modalController?.openSettingsModal();
}

function closeSettingsModal() {
  modalController?.closeSettingsModal();
}

function openMultiplayerModal() {
  if (multiplayerGroupFilter && groupFilter) multiplayerGroupFilter.value = groupFilter.value;
  setMultiplayerFiltersInModal(!isMultiplayerActive() || isMultiplayerHost());
  syncGameplaySettings();
  updateMultiplayerFilterSummary();
  syncWeeklyChallengeState();
  openModal(multiplayerModal, multiplayerPlayerName || multiplayerRoomCodeInput || multiplayerCreate);
}

function closeMultiplayerModal() {
  closeModal(multiplayerModal);
  setMultiplayerFiltersInModal(false);
  syncGameplaySettings();
  syncWeeklyChallengeState();
}

function openMultiplayerJoinModal() {
  openModal(multiplayerJoinModal, multiplayerJoinPlayerName || multiplayerJoinAccept);
}

function closeMultiplayerJoinModal() {
  closeModal(multiplayerJoinModal);
}

function requestConfirmation(message, { title = "Confirm Action", confirmLabel = "Confirm", stats = [] } = {}) {
  return modalController
    ? modalController.requestConfirmation(message, { title, confirmLabel, stats })
    : Promise.resolve(window.confirm(message));
}

function syncProgressLinkPreview({ preserveSelection = false } = {}) {
  return progressShareController?.syncProgressLinkPreview({ preserveSelection }) || "";
}

function openProgressQrModal() {
  return progressShareController?.openQrModal();
}

function closeProgressQrModal() {
  return progressShareController?.closeQrModal();
}

function copyProgressQrLink() {
  return progressShareController?.copyQrLink();
}

async function copyExistingProgressValue() {
  return progressShareController?.copyExistingProgressValue();
}

async function copyExistingProgressCode() {
  return progressShareController?.copyExistingProgressCode();
}

async function importProgressValue(value, { fromHash = false } = {}) {
  return progressShareController?.importProgressValue(value, { fromHash }) || false;
}

async function restoreProgressFromHash() {
  return progressShareController?.restoreProgressFromHash() || false;
}

async function handleProgressHashChange() {
  return progressShareController?.handleProgressHashChange();
}

function focusInput(preventScroll = true) {
  return statusController?.focusInput(preventScroll);
}

function getSpriteForEntry(entry) {
  if (!entry) return spriteFallback;
  if (shinyToggle && shinyToggle.checked && entry.dexId) {
    return `${spriteShinyBase}${entry.dexId}.png`;
  }
  return entry.sprite || spriteFallback;
}

function setTimerText(value) {
  return timerController?.setTimerText(value);
}

function formatTime(seconds) {
  return timerController?.formatTime(seconds) || "00:00";
}

function getElapsedSeconds() {
  return timerController?.getElapsedSeconds() || 0;
}

function playCry(canonical) {
  return playCryModule(canonical, {
    state,
    criesToggle,
    legacyCriesToggle
  });
}

function startTimer(preserveStart = false) {
  return timerController?.startTimer(preserveStart);
}

function stopTimer() {
  return timerController?.stopTimer();
}

function flushStateSave() {
  return flushStateSaveCore({
    state,
    storage: localStorage,
    storageKey: STORAGE_KEY,
    storageBackupKey: STORAGE_BACKUP_KEY,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    buildStatePayloadFn: buildStatePayloadCore,
    getSelectedGenerations,
    getSelectedTypes,
    getElapsedSeconds,
    groupFilter,
    syncProgressLinkPreview
  });
}

function saveState({ immediate = false } = {}) {
  if (state.isRestoring) return;
  if (isMultiplayerActive()) return;
  if (immediate) {
    flushStateSave();
    return;
  }
  if (state.saveStateTimer) clearTimeout(state.saveStateTimer);
  state.saveStateTimer = setTimeout(() => {
    state.saveStateTimer = null;
    flushStateSave();
  }, SAVE_STATE_DEBOUNCE_MS);
}

function clearState() {
  clearStateCore({
    state,
    storage: localStorage,
    storageKey: STORAGE_KEY,
    storageBackupKey: STORAGE_BACKUP_KEY,
    legacyStorageKey: LEGACY_STORAGE_KEY
  });
}

function restoreState() {
  return restoreStateCore({
    state,
    storage: localStorage,
    storageKey: STORAGE_KEY,
    storageBackupKey: STORAGE_BACKUP_KEY,
    legacyStorageKey: LEGACY_STORAGE_KEY,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    parsePersistedStateRecordFn: parsePersistedStateRecordCore,
    groupFilter,
    setChipGroupSelections,
    genFilter,
    typeFilter,
    startTimer,
    setTimerText,
    formatTime,
    flushStateSaveFn: flushStateSave
  });
}

function saveSettings() {
  return settingsController?.saveSettings();
}

function saveSettingsAndSyncRoom() {
  saveSettings();
  if (isMultiplayerActive() && isMultiplayerHost()) {
    multiplayerController.configureRoom();
  }
}

function updateThemeColorMeta(color) {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const resolvedColor =
    color ||
    getComputedStyle(document.documentElement).getPropertyValue("--bg-2").trim() ||
    "#f7f1e5";
  if (themeColorMeta) themeColorMeta.setAttribute("content", resolvedColor);
}

function restoreSettings() {
  return settingsController?.restoreSettings();
}

function renderStudyPanel() {
  return studyController.renderStudyPanel();
}

function refreshGameplayViews({ stats = true, sprites = true, study = true } = {}) {
  if (stats) updateStats();
  if (sprites) renderSprites();
  if (study) renderStudyPanel();
}

function advanceStudyCard(options = {}) {
  return studyController.advanceStudyCard(options);
}

async function confirmResetSettings() {
  return settingsController?.confirmResetSettings();
}

function initThemes() {
  return settingsController?.initThemes();
}

function updateStats() {
  return progressController?.updateStats();
}

function getProgressUnlockContext() {
  return getProgressUnlockContextCore(state);
}

function getProgressMilestoneEntries(total) {
  return getProgressMilestoneEntriesCore(total);
}

function primeProgressMilestones() {
  const milestones = getProgressMilestoneEntries(state.names.length);
  state.seenProgressMilestones = new Set(
    milestones.filter((entry) => state.activeFoundCount >= entry.count).map((entry) => entry.fraction)
  );
  state.progressMilestonesPrimed = true;
}

function syncProgressMilestoneCues() {
  if (!state.groupMetadataReady) return;
  if (state.isRestoring) return;

  const total = state.names.length;
  const found = state.activeFoundCount;
  const isComplete = total > 0 && found === total;
  const milestones = getProgressMilestoneEntries(total);
  const achieved = milestones.filter((entry) => found >= entry.count);

  if (!state.progressMilestonesPrimed) {
    primeProgressMilestones();
    return;
  }

  if (isComplete) {
    state.seenProgressMilestones = new Set(milestones.map((entry) => entry.fraction));
    return;
  }

  const newMilestones = achieved.filter((entry) => !state.seenProgressMilestones.has(entry.fraction));
  if (!newMilestones.length) return;

  newMilestones.forEach((entry) => state.seenProgressMilestones.add(entry.fraction));
  newMilestones.forEach((entry) => {
    showStateToast({
      meta: "Milestone",
      title: `${entry.percent}% complete`,
      icon: `${entry.percent}%`
    });
    flashProgressMilestone(entry.count);
  });
  flashElement(progressBar, "progress-bar--milestone", 800);
}

function syncProgressUnlockCues() {
  if (!state.groupMetadataReady) return;
  if (state.isRestoring) return;
  const { completedGenerations, completedTypes } = getProgressUnlockContext();

  if (!state.progressPrimed) {
    state.seenCompletedGenerations = new Set(completedGenerations);
    state.seenCompletedTypes = new Set(completedTypes);
    state.pendingProgressUnlocks = {
      generations: new Set(),
      types: new Set()
    };
    state.lastFoundTotal = state.found.size;
    state.progressPrimed = true;
    return;
  }

  const newGenerations = completedGenerations.filter(
    (generation) => !state.seenCompletedGenerations.has(generation)
  );
  const newTypes = completedTypes.filter((type) => !state.seenCompletedTypes.has(type));

  state.pendingProgressUnlocks = {
    generations: new Set(newGenerations),
    types: new Set(newTypes)
  };

  newGenerations.forEach((generation) => state.seenCompletedGenerations.add(generation));
  newTypes.forEach((type) => state.seenCompletedTypes.add(type));

  const unlockedTitles = [
    ...newGenerations.map((generation) => `${generation} complete`),
    ...newTypes.map((type) => `${type} complete`)
  ];

  if (unlockedTitles.length) {
    showStateToast({
      meta: "Progress Unlocked",
      title: unlockedTitles.length > 1 ? unlockedTitles.join(" · ") : unlockedTitles[0],
      icon: "UP"
    });
  }

  if (state.lastFoundTotal !== state.found.size) {
    flashProgressChange();
    state.lastFoundTotal = state.found.size;
  }
}

function getCompletedGroupEntries(indexMap) {
  return getCompletedGroupEntriesCore(state, indexMap);
}

function renderBadges() {
  return viewController?.renderBadges();
}

function triggerCompletionCelebration() {
  return viewController?.triggerCompletionCelebration();
}

function clearCompletionCelebration() {
  return viewController?.clearCompletionCelebration();
}

function recalculateActiveFoundCount() {
  return progressController?.recalculateActiveFoundCount() || 0;
}

function markPokemonFound(canonical) {
  return progressController?.markPokemonFound(canonical) || false;
}

function renderSprites() {
  const result = viewController?.renderSprites();
  if (isMultiplayerActive()) {
    multiplayerController?.refreshAttributionBadges?.();
  }
  return result;
}

function resetQuiz() {
  stopTimer();
  state.found.clear();
  state.activeFoundCount = 0;
  state.studyDeck = [];
  state.studyCurrent = null;
  state.studyRevealed = false;
  state.seenBadges.clear();
  state.seenCompletedGenerations.clear();
  state.seenCompletedTypes.clear();
  state.seenProgressMilestones.clear();
  state.pendingProgressUnlocks = {
    generations: new Set(),
    types: new Set()
  };
  state.progressPrimed = false;
  state.progressMilestonesPrimed = false;
  state.badgeRevision += 1;
  state.badgesPrimed = true;
  state.savedElapsed = 0;
  state.lastSavedSec = -1;
  state.lastFoundTotal = 0;
  setTimerText("00:00");
  inputEl.value = "";
  focusInput();
  refreshGameplayViews();
  clearState();
  if (progressCodeEl) progressCodeEl.value = "";
  setProgressFeedback("");
  syncProgressLinkPreview();
}

async function confirmReset() {
  if (isMultiplayerActive()) {
    if (!isMultiplayerHost()) return;
    const ok = await requestConfirmation(
      "Reset multiplayer progress? This will clear every player's found Pokemon and restart the room timer.",
      { title: "Reset Room", confirmLabel: "Reset" }
    );
    if (!ok) return;
    multiplayerController?.resetRoom?.();
    return;
  }

  const total = state.names.length;
  const found = state.activeFoundCount;
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
  return infoController?.openInfoModal(entry);
}

function closeInfoModal() {
  return infoController?.closeInfoModal();
}

function getHiddenLabel(entry) {
  if (showDexToggle && showDexToggle.checked && entry.dexId) {
    return `#${String(entry.dexId).padStart(3, "0")}`;
  }
  return "???";
}

function findTypoMatch(normalized) {
  return findTypoMatchModule(
    state,
    normalized,
    typoModeSelect ? typoModeSelect.value : DEFAULT_TYPO_MODE,
    DEFAULT_TYPO_MODE
  );
}

function syncTypoSettings() {
  return settingsController?.syncTypoSettings();
}

function syncGameplaySettings() {
  return settingsController?.syncGameplaySettings();
}

function handleInputEvent(e) {
  return quizController?.handleInputEvent(e);
}

function handleLiveMatch(e) {
  return quizController?.handleLiveMatch(e);
}

function refreshGroupedGenerationHeaders() {
  return viewController?.refreshGroupedGenerationHeaders();
}

function updateSpriteCardsForPokemon(canonical, { animateReveal = false } = {}) {
  if (!canonical || !spriteGrid) return false;
  const entry = state.meta.get(canonical);
  if (!entry) return false;
  const cards = [...spriteGrid.querySelectorAll(`.sprite-card[data-pokemon="${canonical}"]`)];
  if (!cards.length) return false;

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
  return true;
}

function highlightPokemon(canonical) {
  return progressController?.highlightPokemon(spriteGrid, canonical);
}

function showRevealPreview(entry) {
  return progressController?.showRevealPreview(
    revealPill,
    revealPillImg,
    revealPillLabel,
    getSpriteForEntry,
    entry
  );
}

function setInputStatus(message, { hint = false } = {}) {
  return statusController?.setInputStatus(message, { hint });
}

function syncInlineStatusVisibility() {
  return statusController?.syncInlineStatusVisibility();
}

function showStatusHint(message) {
  return statusController?.showStatusHint(message);
}

function refreshActiveDetailViews() {
  infoController?.refreshActiveDetailViews();
  renderStudyPanel();
}

function scheduleFilterMetadataHydration(generationPromise, typePromise) {
  const hydrate = async () => {
    const [generationResult, typeResult] = await Promise.allSettled([generationPromise, typePromise]);
    const generationData =
      generationResult.status === "fulfilled"
        ? generationResult.value
        : { entries: [], generationMap: new Map() };
    const typeData =
      typeResult.status === "fulfilled"
        ? typeResult.value
        : { entries: [], typeMap: new Map() };

    if (generationResult.status === "rejected") {
      console.warn("Generation metadata hydration failed", generationResult.reason);
    }
    if (typeResult.status === "rejected") {
      console.warn("Type metadata hydration failed", typeResult.reason);
    }
    if (generationResult.status === "rejected" || typeResult.status === "rejected") {
      showStateToast({
        meta: "Loading",
        title: "Some PokéAPI metadata failed to load",
        icon: "!"
      });
    }

    applyMetadataIndexesModule(state, generationData, typeData, formatGenerationLabel);
    refreshWeeklyChallengeCatalog();
    populateGenChips(generationData.entries);
    populateTypeChips(typeData.entries);
    multiplayerFiltersController?.populateGenChips(generationData.entries);
    multiplayerFiltersController?.populateTypeChips(typeData.entries);
    setChipGroupSelections(genFilter, state.restoredFilterSelections.gens);
    setChipGroupSelections(typeFilter, state.restoredFilterSelections.types);
    setChipGroupSelections(multiplayerGenFilter, state.restoredFilterSelections.gens);
    setChipGroupSelections(multiplayerTypeFilter, state.restoredFilterSelections.types);
    multiplayerFiltersController?.applyFilters({ force: true, persist: false });
    applyFilters();
    syncWeeklyChallengeState();
    refreshActiveDetailViews();
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => {
      void hydrate();
    }, { timeout: 1000 });
    return;
  }

  window.setTimeout(() => {
    void hydrate();
  }, 0);
}

function populateTypeChips(entries) {
  return filtersController?.populateTypeChips(entries);
}

function getSelectedTypes() {
  return filtersController?.getSelectedTypes() || [];
}

function populateGenChips(entries) {
  return filtersController?.populateGenChips(entries);
}

function getSelectedGenerations() {
  return filtersController?.getSelectedGenerations() || [];
}

function setChipGroupSelections(container, selectedValues) {
  return filtersController?.setChipGroupSelections(container, selectedValues);
}

function updateFilterSummary() {
  return filtersController?.updateFilterSummary();
}

function setFiltersPanelExpanded(expanded, { persist = true } = {}) {
  return filtersController?.setFiltersPanelExpanded(expanded, { persist });
}

function applyFilters(options = {}) {
  return filtersController?.applyFilters(options);
}

function applyMultiplayerRoomSettings(settings) {
  if (!settings) return;
  const group = ["none", "generation", "type"].includes(settings.group) ? settings.group : "generation";
  if (groupFilter) groupFilter.value = group;
  if (multiplayerGroupFilter) multiplayerGroupFilter.value = group;
  setChipGroupSelections(
    multiplayerGenFilter,
    Array.isArray(settings.generations) ? settings.generations : []
  );
  setChipGroupSelections(
    multiplayerTypeFilter,
    Array.isArray(settings.types) ? settings.types : []
  );
  if (typoModeSelect) typoModeSelect.value = settings.typoMode || DEFAULT_TYPO_MODE;
  if (autocorrectToggle) autocorrectToggle.checked = settings.autocorrect !== false;
  if (outlineToggle) outlineToggle.checked = !settings.outlinesOff;
  document.body.classList.toggle("outlines-off", Boolean(settings.outlinesOff));
  if (showDexToggle) showDexToggle.checked = Boolean(settings.showDex);
  syncGameplaySettings();
  multiplayerFiltersController?.applyFilters({ force: true, persist: false });
}

const pokemonBootstrap = createPokemonBootstrap({
  state,
  pokedex,
  normalizeName,
  initThemes,
  restoreSettings,
  restoreState,
  applyFilters,
  scheduleLocalizedNameHydration: scheduleLocalizedNameHydrationModule,
  fetchResourcesInBatches: fetchResourcesInBatchesModule,
  loadGenerations: loadGenerationsModule,
  loadTypes: loadTypesModule,
  scheduleFilterMetadataHydration,
  restoreProgressFromHash,
  syncWeeklyChallengeState,
  setInputStatus,
  inputEl,
  retryBtn,
  onCatalogHydrated: () => {
    buildGuessIndexModule(state, normalizeGuess, prettifyName);
    if (isWeeklyChallengeMode()) {
      applyFilters();
    }
  }
});

function loadPokemon() {
  return pokemonBootstrap.loadPokemon();
}

function getGenerationSlugByInput(value) {
  return getGenerationSlugByInputCore(value);
}

function getTypeSlugByInput(value) {
  return getTypeSlugByInputCore(value, state.typeIndex);
}

function unlockPokemonByCanonical(canonical, { refresh = true } = {}) {
  const entry = state.meta.get(canonical);
  if (!entry) return false;
  const isNew = markPokemonFound(canonical);
  if (isNew) {
    state.recentlyFound.add(canonical);
  }
  if (refresh) {
    refreshGameplayViews({ sprites: false });
    updateSpriteCardsForPokemon(canonical, { animateReveal: isNew });
    saveState();
  }
  return isNew;
}

function unlockPokemonList(names) {
  let unlocked = false;
  names.forEach((canonical) => {
    if (unlockPokemonByCanonical(canonical, { refresh: false })) {
      unlocked = true;
    }
  });
  if (!unlocked) return false;
  refreshGameplayViews();
  saveState();
  return true;
}

function unlockGeneration(value) {
  const slug = getGenerationSlugByInput(value);
  if (!slug) return false;
  const names = [...(state.generationIndex.get(slug) || [])];
  return names.length ? unlockPokemonList(names) : false;
}

function unlockType(value) {
  const slug = getTypeSlugByInput(value);
  if (!slug) return false;
  const names = [...(state.typeIndex.get(slug) || [])];
  return names.length ? unlockPokemonList(names) : false;
}

function unlockAllPokemon() {
  if (!state.allNames.length) return false;
  return unlockPokemonList(state.allNames);
}

function listDebugGenerations() {
  return [...state.generationIndex.keys()].map((slug) => ({
    slug,
    label: formatGenerationLabel(slug)
  }));
}

function listDebugTypes() {
  return [...state.typeIndex.keys()].map((slug) => prettifyName(slug));
}

function forceWeeklyChallengeWeek(value) {
  if (value === null || value === undefined || value === "" || value === false) {
    state.weeklyChallengeWeekOverride = null;
  } else {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return false;
    state.weeklyChallengeWeekOverride = parsed;
  }

  if (isWeeklyChallengeMode()) {
    applyFilters();
  } else {
    updateFilterSummary();
  }

  return state.weeklyChallengeWeekOverride;
}

function getDebugState() {
  return progressController?.getDebugState() || {
    total: state.names.length,
    found: state.activeFoundCount,
    remaining: state.names.length - state.activeFoundCount,
    practiceMode: isStudyMode(),
    currentEntry: state.activeEntry ? state.activeEntry.label : null,
    completedGenerations: getCompletedGroupEntries(state.generationIndex),
    completedTypes: getCompletedGroupEntries(state.typeIndex),
    weeklyChallengeWeekOverride: state.weeklyChallengeWeekOverride
  };
}

function installDebugCommands() {
  return debugController?.installDebugCommands();
}

if (guessForm) {
  guessForm.addEventListener("submit", handleSubmit);
}
inputEl.addEventListener("input", handleInputEvent);
inputEl.addEventListener("input", handleLiveMatch);
resetBtn.addEventListener("click", confirmReset);
if (resetBtnCompact) resetBtnCompact.addEventListener("click", confirmReset);
if (retryBtn) retryBtn.addEventListener("click", loadPokemon);
if (groupFilter) {
  groupFilter.addEventListener("change", () => {
    refreshGameplayViews({ stats: false });
    updateFilterSummary();
    saveState();
  });
}
  if (multiplayerGroupFilter) {
    multiplayerGroupFilter.addEventListener("change", () => {
      if (groupFilter) groupFilter.value = multiplayerGroupFilter.value;
      refreshGameplayViews({ stats: false });
      updateFilterSummary();
      updateMultiplayerFilterSummary();
      saveState();
      if (isMultiplayerActive() && isMultiplayerHost()) {
        multiplayerController?.configureRoom?.();
      }
    });
  }
if (filtersPanelToggle) {
  filtersPanelToggle.addEventListener("click", () => {
    setFiltersPanelExpanded(filtersPanel ? filtersPanel.hidden : false);
  });
}
if (progressCopyBtn) {
  progressCopyBtn.addEventListener("click", () => {
    copyExistingProgressValue();
  });
}
if (progressCopyCodeBtn) {
  progressCopyCodeBtn.addEventListener("click", () => {
    copyExistingProgressCode();
  });
}
if (progressQrBtn) {
  progressQrBtn.addEventListener("click", () => {
    openProgressQrModal();
  });
}
if (progressImportBtn) {
  progressImportBtn.addEventListener("click", () => {
    importProgressValue(progressCodeEl ? progressCodeEl.value : "");
  });
}
if (progressIncludeSettingsEl) {
  progressIncludeSettingsEl.addEventListener("change", saveSettings);
}
if (outlineToggle) {
  outlineToggle.checked = false;
  document.body.classList.add("outlines-off");
  outlineToggle.addEventListener("change", () => {
    document.body.classList.toggle("outlines-off", !outlineToggle.checked);
    renderSprites();
    saveSettingsAndSyncRoom();
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
  filtersToggle.textContent = "Settings";
  filtersToggle.addEventListener("click", openSettingsModal);
  if (filtersToggleCompact) {
    filtersToggleCompact.textContent = "Settings";
    filtersToggleCompact.addEventListener("click", openSettingsModal);
  }
}

if (achievementsOpenBtn) achievementsOpenBtn.addEventListener("click", openAchievementsModal);
if (achievementsOpenCompactBtn) {
  achievementsOpenCompactBtn.addEventListener("click", openAchievementsModal);
}
if (achievementsClose) achievementsClose.addEventListener("click", closeAchievementsModal);
if (achievementsModal) {
  achievementsModal.addEventListener("click", (event) => {
    if (event.target === achievementsModal) closeAchievementsModal();
  });
}

if (qrClose) {
  qrClose.addEventListener("click", closeProgressQrModal);
}
if (qrCopyBtn) {
  qrCopyBtn.addEventListener("click", copyProgressQrLink);
}
if (qrModal) {
  qrModal.addEventListener("click", (event) => {
    if (event.target === qrModal) closeProgressQrModal();
  });
}

if (settingsClose) {
  settingsClose.addEventListener("click", closeSettingsModal);
}
if (settingsModal) {
  settingsModal.addEventListener("click", (event) => {
    if (event.target === settingsModal) closeSettingsModal();
  });
}
if (multiplayerOpenBtn) multiplayerOpenBtn.addEventListener("click", openMultiplayerModal);
if (multiplayerOpenCompactBtn) {
  multiplayerOpenCompactBtn.addEventListener("click", openMultiplayerModal);
}
if (multiplayerClose) multiplayerClose.addEventListener("click", closeMultiplayerModal);
if (multiplayerFiltersPanelToggle) {
  multiplayerFiltersPanelToggle.addEventListener("click", () => {
    setMultiplayerFiltersPanelExpanded(
      multiplayerFiltersPanel ? multiplayerFiltersPanel.hidden : false,
      { persist: true }
    );
  });
}
if (multiplayerModal) {
  multiplayerModal.addEventListener("click", (event) => {
    if (event.target === multiplayerModal) closeMultiplayerModal();
  });
}
if (multiplayerJoinClose) multiplayerJoinClose.addEventListener("click", closeMultiplayerJoinModal);
if (multiplayerJoinCancel) {
  multiplayerJoinCancel.addEventListener("click", closeMultiplayerJoinModal);
}
if (multiplayerJoinModal) {
  multiplayerJoinModal.addEventListener("click", (event) => {
    if (event.target === multiplayerJoinModal) closeMultiplayerJoinModal();
  });
}

if (settingsPanelCard) {
  scheduleSettingsInfoTipsPlacement();
  window.addEventListener("resize", scheduleSettingsInfoTipsPlacement);
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
    saveSettingsAndSyncRoom();
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
    if (gameModeSelect.value !== "practice") {
      state.studyDeck = [];
      state.studyCurrent = null;
      state.studyRevealed = false;
    }
    showStatusHint("");
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
    document.documentElement.classList.toggle("dark-mode", darkToggle.checked);
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
if (changelogOpen) changelogOpen.addEventListener("click", openChangelogModal);
if (changelogClose) changelogClose.addEventListener("click", closeChangelogModal);
if (changelogModal) {
  changelogModal.addEventListener("click", (event) => {
    if (event.target === changelogModal) closeChangelogModal();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (confirmModal && !confirmModal.classList.contains("hidden")) {
      closeConfirmModal(false);
      return;
    }
    if (settingsModal && !settingsModal.classList.contains("hidden")) {
      closeSettingsModal();
      return;
    }
    if (isMultiplayerModalOpen()) {
      closeMultiplayerModal();
      return;
    }
    if (multiplayerJoinModal && !multiplayerJoinModal.classList.contains("hidden")) {
      closeMultiplayerJoinModal();
      return;
    }
    if (achievementsModal && !achievementsModal.classList.contains("hidden")) {
      closeAchievementsModal();
      return;
    }
    if (changelogModal && !changelogModal.classList.contains("hidden")) {
      closeChangelogModal();
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
        "input, textarea, select, button, a, label, .settings-panel, .modal, .sprite-board, .sprite-card, .study-panel"
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
window.addEventListener("pagehide", flushStateSave);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    flushStateSave();
  }
});

syncTypoSettings();
registerAppServiceWorker();
installDebugCommands();
loadPokemon().then(() => {
  multiplayerController?.restoreFromHashOrSession();
});
