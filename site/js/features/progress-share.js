import { createQrCodeDataUrl } from "../services/qr-code.js";

export function createProgressShareController({
  state,
  progressCodeEl,
  progressIncludeSettingsEl,
  progressFeedbackEl,
  qrModal,
  qrClose,
  qrImage,
  qrLink,
  openModal,
  closeModal,
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
  selectProgressCode,
  getImportPreviewStats,
}) {
  let progressCleanupTimeout = null;
  let qrLinkValue = "";

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

  function parseProgressInput(value) {
    const raw = (value || "").trim();
    if (!raw) return { code: "", isUrl: false };
    if (raw.startsWith(progressCodePrefix) || raw.startsWith(legacyProgressCodePrefix)) {
      return { code: raw, isUrl: false };
    }

    try {
      const url = new URL(raw, window.location.href);
      const hash = url.hash.replace(/^#/, "");
      if (hash.startsWith("progress=")) {
        return {
          code: decodeURIComponent(hash.slice("progress=".length)),
          isUrl: true
        };
      }
      if (hash.startsWith(progressCodePrefix) || hash.startsWith(legacyProgressCodePrefix)) {
        return { code: hash, isUrl: true };
      }
    } catch {
      // ignore invalid URLs and try plain-text parsing below
    }

    if (raw.startsWith("#progress=")) {
      return {
        code: decodeURIComponent(raw.slice("#progress=".length)),
        isUrl: true
      };
    }

    if (raw.startsWith("progress=")) {
      return {
        code: decodeURIComponent(raw.slice("progress=".length)),
        isUrl: true
      };
    }

    return { code: raw, isUrl: false };
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
    return parseProgressInput(value).code;
  }

  function isProgressUrlValue(value) {
    return parseProgressInput(value).isUrl;
  }

  function scheduleImportedProgressCleanup() {
    if (progressCleanupTimeout) clearTimeout(progressCleanupTimeout);
    progressCleanupTimeout = setTimeout(() => {
      if (progressCodeEl) progressCodeEl.value = "";
      setProgressFeedback("");
      progressCleanupTimeout = null;
    }, 4000);
  }

  function setQrLinkValue(value) {
    qrLinkValue = value || "";
    if (qrLink) qrLink.value = qrLinkValue;
  }

  function openQrModal() {
    if (!qrModal) return false;
    const shareLink = syncProgressLinkPreview({ preserveSelection: true }).trim();
    if (!shareLink) {
      setProgressFeedback("Open a quiz to generate a QR code.");
      return false;
    }
    qrLinkValue = shareLink;
    setQrLinkValue(shareLink);
    if (qrImage) {
      try {
        qrImage.src = createQrCodeDataUrl(shareLink);
      } catch {
        setProgressFeedback("That progress link is too long for the QR code.");
        return false;
      }
      qrImage.alt = "QR code for the current progress link";
    }
    if (typeof openModal === "function") {
      openModal(qrModal, qrClose || qrLink || qrImage);
    }
    return true;
  }

  function closeQrModal() {
    if (!qrModal || typeof closeModal !== "function") return;
    closeModal(qrModal);
  }

  async function copyQrLink() {
    const value = qrLinkValue || syncProgressLinkPreview({ preserveSelection: true }).trim();
    if (!value) {
      setProgressFeedback("Open a quiz to generate a QR code.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setProgressFeedback("Progress link copied.");
    } catch {
      setProgressFeedback("Progress link ready to copy.");
    }
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
      } catch {
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
    } catch {
      setProgressFeedback("Progress link ready to copy.");
    }
  }

  async function copyExistingProgressCode() {
    if (!progressCodeEl) return;
    const code = encodeFoundProgress();
    if (!code) {
      setProgressFeedback("Open a quiz to generate a progress code.");
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setProgressFeedback("Progress code copied.");
    } catch {
      progressCodeEl.value = code;
      selectProgressCode();
      setProgressFeedback("Progress code ready to copy.");
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
    } catch {
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
    } catch {
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
    copyExistingProgressCode,
    importProgressValue,
    restoreProgressFromHash,
    handleProgressHashChange,
    scheduleImportedProgressCleanup,
    buildProgressShareLink,
    setProgressFeedback,
    openQrModal,
    closeQrModal,
    copyQrLink
  };
}
