export function createTimerController({ state, timerEl, compactTimerEl, saveState }) {
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

  function setTimerText(value) {
    if (timerEl) timerEl.textContent = value;
    if (compactTimerEl) compactTimerEl.textContent = value;
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

  return {
    formatTime,
    getElapsedSeconds,
    setTimerText,
    startTimer,
    stopTimer
  };
}
