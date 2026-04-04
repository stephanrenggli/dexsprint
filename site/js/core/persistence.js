export function buildStatePayload({
  state,
  getElapsedSeconds,
  groupFilter,
  getSelectedGenerations,
  getSelectedTypes
}) {
  const elapsed = getElapsedSeconds();
  return {
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
}

export function buildPersistedStateRecord(payload, schemaVersion, now = Date.now()) {
  return {
    schemaVersion,
    payload,
    savedAt: now
  };
}

export function parsePersistedStateRecord(raw, { allowLegacy = false, schemaVersion } = {}) {
  if (!raw) return null;
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return null;
  }

  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    data.schemaVersion === schemaVersion &&
    data.payload &&
    typeof data.payload === "object" &&
    !Array.isArray(data.payload)
  ) {
    return data.payload;
  }

  if (
    allowLegacy &&
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    !Object.prototype.hasOwnProperty.call(data, "schemaVersion")
  ) {
    return data;
  }

  return null;
}

export function flushStateSave({
  state,
  storage,
  storageKey,
  storageBackupKey,
  schemaVersion,
  buildStatePayloadFn,
  getSelectedGenerations,
  getSelectedTypes,
  getElapsedSeconds,
  groupFilter,
  syncProgressLinkPreview
}) {
  if (state.isRestoring) return;
  if (state.saveStateTimer) {
    clearTimeout(state.saveStateTimer);
    state.saveStateTimer = null;
  }
  const payload = buildStatePayloadFn({
    state,
    getElapsedSeconds,
    groupFilter,
    getSelectedGenerations,
    getSelectedTypes
  });
  const record = JSON.stringify(buildPersistedStateRecord(payload, schemaVersion));
  const previous = storage.getItem(storageKey);
  storage.setItem(storageKey, record);
  storage.setItem(storageBackupKey, previous || record);
  syncProgressLinkPreview();
}

export function clearState({
  state,
  storage,
  storageKey,
  storageBackupKey,
  legacyStorageKey
}) {
  if (state.saveStateTimer) {
    clearTimeout(state.saveStateTimer);
    state.saveStateTimer = null;
  }
  storage.removeItem(storageKey);
  storage.removeItem(storageBackupKey);
  storage.removeItem(legacyStorageKey);
}

export function restoreState({
  state,
  storage,
  storageKey,
  storageBackupKey,
  legacyStorageKey,
  schemaVersion,
  parsePersistedStateRecordFn,
  groupFilter,
  setChipGroupSelections,
  genFilter,
  typeFilter,
  startTimer,
  setTimerText,
  formatTime,
  flushStateSaveFn,
}) {
  const raw = storage.getItem(storageKey);
  const backupRaw = storage.getItem(storageBackupKey);
  const legacyRaw = storage.getItem(legacyStorageKey);
  const data =
    parsePersistedStateRecordFn(raw, { schemaVersion }) ||
    parsePersistedStateRecordFn(backupRaw, { schemaVersion }) ||
    parsePersistedStateRecordFn(legacyRaw, { allowLegacy: true, schemaVersion });
  if (!data) return false;
  state.isRestoring = true;

  if (groupFilter && data.group) {
    const allowed = new Set(["none", "generation", "type"]);
    groupFilter.value = allowed.has(data.group) ? data.group : "generation";
  }

  state.restoredFilterSelections = {
    gens: Array.isArray(data.gens) ? data.gens : [],
    types: Array.isArray(data.types) ? data.types : []
  };

  setChipGroupSelections(genFilter, data.gens || []);
  setChipGroupSelections(typeFilter, data.types || []);

  if (Array.isArray(data.found)) {
    state.found = new Set(data.found);
    state.badgeRevision += 1;
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
  if (!raw && !backupRaw && legacyRaw) {
    flushStateSaveFn();
  }
  return true;
}
