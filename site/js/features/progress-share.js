export function createProgressShareController({
  state,
  progressCodeEl,
  progressIncludeSettingsEl,
  progressFeedbackEl,
  progressImportBtn,
  progressCopyBtn,
  progressCodePrefix,
  legacyProgressCodePrefix,
  getStableProgressIds,
  getElapsedSeconds,
  formatTime,
  encodeProgressPayload,
  decodeProgressPayload,
  requestConfirmation,
  applySettingsPayload,
  getShareableSettingsPayload,
  saveState,
  showStatusHint,
  setTimerText,
  startTimer,
  stopTimer,
  updateStats,
  renderSprites,
  renderStudyPanel,
  syncProgressUnlockCues,
  syncProgressMilestoneCues,
  selectProgressCode,
  getImportPreviewStats,
  setProgressFeedback
}) {
  let progressCleanupTimeout = null;

  function setProgressFeedback(message) {
    if (!progressFeedbackEl) return;
    progressFeedbackEl.textContent = message || "";
  }

  function encodeFoundProgress() {
    return `${progressCodePrefix}${encodeProgressPayload({
      ids: getStableProgressIds(),
      elapsed: getElapsedSeconds(),
      settings:
        progressIncludeSettingsEl && progressIncludeSettingsEl.checked
          ? getShareableSettingsPayload()
          : null
    })}`;
  }

  function decodeFoundProgress(code) {
    const validPrefixes = [progressCodePrefix, legacyProgressCodePrefix];
    if (!code || !validPrefixes.some((prefix) => code.startsWith(prefix))) {
      throw new Error("Invalid progress code");
    }

    const prefix = validPrefixes.find((value) => code.startsWith(value)) || progressCodePrefix;
    const decoded = decodeProgressPayload(code.slice(prefix.length));
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
    if (raw.startsWith(progressCodePrefix) || raw.startsWith(legacyProgressCodePrefix)) {
      return raw;
    }

    try {
      const url = new URL(raw, window.location.href);
      const hash = url.hash.replace(/^#/, "");
      if (hash.startsWith("progress=")) {
        return decodeURIComponent(hash.slice("progress=".length));
      }
      if (hash.startsWith(progressCodePrefix) || hash.startsWith(legacyProgressCodePrefix)) {
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
      return hash.startsWith("progress=") || hash.startsWith(progressCodePrefix) || hash.startsWith(legacyProgressCodePrefix);
    } catch (err) {
      return false;
    }
  }

  function scheduleImportedProgressCleanup() {
    if (progressCleanupTimeout) clearTimeout(progressCleanupTimeout);
    progressCleanupTimeout = setTimeout(() => {
      if (progressCodeEl) progressCodeEl.value = "";
      setProgressFeedback("");
      progressCleanupTimeout = null;
    }, 4000);
  }

  function buildProgressShareLink() {
    const code = encodeFoundProgress();
    const url = new URL(window.location.href);
    url.hash = `progress=${encodeURIComponent(code)}`;
    return url.toString();
  }

  function syncProgressLinkPreview({ preserveSelection = false } = {}) {
    if (!progressCodeEl) return "";
    if (!state.allNames.length) {
      progressCodeEl.value = "";
      return "";
    }
    const shareLink = buildProgressShareLink();
    const shouldRestoreSelection = preserveSelection && document.activeElement === progressCodeEl;
    const selection = shouldRestoreSelection
      ? {
          start: progressCodeEl.selectionStart,
          end: progressCodeEl.selectionEnd
        }
      : null;
    progressCodeEl.value = shareLink;
    if (selection && Number.isInteger(selection.start) && Number.isInteger(selection.end)) {
      try {
        progressCodeEl.setSelectionRange(selection.start, selection.end);
      } catch (err) {
        // Ignore selection restore failures in unsupported browsers.
      }
    }
    return shareLink;
  }

  function applyImportedProgress(foundSet, { elapsed = 0, persist = true, resumeTimer = true } = {}) {
    stopTimer();
    state.found = new Set([...foundSet].filter((name) => state.meta.has(name)));
    state.badgeRevision += 1;
    state.savedElapsed = Math.max(0, elapsed);
    state.lastSavedSec = -1;
    setTimerText(formatTime(state.savedElapsed));
    if (resumeTimer) startTimer();
    state.seenBadges.clear();
    state.badgesPrimed = false;
    state.seenCompletedGenerations.clear();
    state.seenCompletedTypes.clear();
    state.pendingProgressUnlocks = {
      generations: new Set(),
      types: new Set()
    };
    state.progressPrimed = false;
    state.lastFoundTotal = state.found.size;
    updateStats();
    renderSprites();
    renderStudyPanel();
    if (persist) saveState();
  }

  async function copyExistingProgressValue() {
    if (!progressCodeEl) return;
    const value = syncProgressLinkPreview({ preserveSelection: true }).trim();
    if (!value) {
      setProgressFeedback("Open a quiz to generate a progress link.");
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
        syncProgressLinkPreview();
        if (!fromHash) selectProgressCode();
      }

      const importedCount = [...imported.found].filter((name) => state.meta.has(name)).length;
      const settingsNote = imported.settings ? " with settings" : "";
      setProgressFeedback(
        `Imported ${importedCount} Pokemon, timer ${formatTime(imported.elapsed)}${settingsNote}.`
      );
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
    if (
      !hash.startsWith("progress=") &&
      !hash.startsWith(progressCodePrefix) &&
      !hash.startsWith(legacyProgressCodePrefix)
    ) {
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

  return {
    encodeFoundProgress,
    decodeFoundProgress,
    extractProgressCode,
    isProgressUrlValue,
    syncProgressLinkPreview,
    applyImportedProgress,
    copyExistingProgressValue,
    importProgressValue,
    restoreProgressFromHash,
    handleProgressHashChange,
    scheduleImportedProgressCleanup,
    buildProgressShareLink,
    setProgressFeedback
  };
}
