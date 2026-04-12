export function createStatusController({
  inputEl,
  statusEl,
  defaultStatus,
  defaultInputPlaceholder
}) {
  let statusHintTimeout = null;

  function focusInput(preventScroll = true) {
    if (!inputEl) return;
    const scrollY = window.scrollY;
    try {
      if (preventScroll) {
        inputEl.focus({ preventScroll: true });
      } else {
        inputEl.focus();
      }
    } catch {
      inputEl.focus();
    }
    requestAnimationFrame(() => {
      if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
    });
    setTimeout(() => {
      if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
    }, 0);
  }

  function setInputStatus(message, { hint = false } = {}) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.classList.toggle("hint", Boolean(message) && hint);
    statusEl.hidden = !message || Boolean(inputEl && inputEl.value.trim());
    if (inputEl) {
      inputEl.placeholder = message ? "" : defaultInputPlaceholder;
      inputEl.classList.toggle("input-status-active", Boolean(message) && statusEl.hidden === false);
    }
  }

  function syncInlineStatusVisibility() {
    if (!statusEl || !inputEl) return;
    statusEl.hidden = !statusEl.textContent.trim() || Boolean(inputEl.value.trim());
    inputEl.classList.toggle("input-status-active", statusEl.hidden === false);
  }

  function showStatusHint(message) {
    if (statusHintTimeout) clearTimeout(statusHintTimeout);
    if (!message) {
      setInputStatus(defaultStatus);
      return;
    }
    setInputStatus(message, { hint: true });
    statusHintTimeout = setTimeout(() => {
      setInputStatus(defaultStatus);
    }, 1500);
  }

  return {
    focusInput,
    setInputStatus,
    syncInlineStatusVisibility,
    showStatusHint
  };
}
