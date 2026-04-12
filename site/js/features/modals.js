import {
  getModalBaseLayer,
  getModalFocusableElements,
  trapModalFocus as trapModalFocusUI
} from "../ui/dom.js";

export function createModalController({
  renderBadges,
  renderConfirmStats,
  scheduleSettingsInfoTipsPlacement,
  ensureChangelogLoaded,
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
}) {
  let activeModal = null;
  let modalScrollLock = null;
  let confirmResolver = null;

  function trapModalFocus(event) {
    trapModalFocusUI(activeModal, event);
  }

  function openModal(modal, initialFocus = null) {
    if (!modal) return;
    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLElement) {
      modal._restoreFocusEl = activeEl;
    }
    document.body.appendChild(modal);
    if (!modalScrollLock) {
      modalScrollLock = {
        x: window.scrollX,
        y: window.scrollY
      };
      document.body.classList.add("modal-open");
      document.body.style.position = "fixed";
      document.body.style.top = `-${modalScrollLock.y}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    }
    modal.classList.remove("hidden");
    activeModal = modal;
    modal.style.zIndex = String(getModalBaseLayer(modal.id));
    const fallback = getModalFocusableElements(modal)[0] || modal;
    const target = initialFocus || fallback;
    requestAnimationFrame(() => {
      if (target && target.focus) target.focus();
    });
  }

  function closeModal(modal, { restoreFocus = true } = {}) {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.style.zIndex = "";
    if (activeModal === modal) {
      activeModal = null;
    }
    if (!activeModal) {
      document.body.classList.remove("modal-open");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      if (modalScrollLock) {
        window.scrollTo(modalScrollLock.x, modalScrollLock.y);
        modalScrollLock = null;
      }
    }
    if (!restoreFocus) return;
    const restoreEl = modal._restoreFocusEl;
    if (restoreEl && typeof restoreEl.focus === "function" && document.contains(restoreEl)) {
      try {
        restoreEl.focus({ preventScroll: true });
      } catch {
        restoreEl.focus();
      }
    }
  }

  function closeConfirmModal(result) {
    if (!confirmModal) return;
    closeModal(confirmModal);
    const resolver = confirmResolver;
    confirmResolver = null;
    if (resolver) resolver(Boolean(result));
  }

  function requestConfirmation(
    message,
    { title = "Confirm Action", confirmLabel = "Confirm", stats = [] } = {}
  ) {
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
    if (typeof renderConfirmStats === "function") {
      renderConfirmStats(stats);
    }
    openModal(confirmModal, confirmAccept);

    return new Promise((resolve) => {
      confirmResolver = resolve;
    });
  }

  function openAchievementsModal() {
    if (!achievementsModal) return;
    renderBadges();
    openModal(achievementsModal, achievementsClose);
  }

  function closeAchievementsModal() {
    closeModal(achievementsModal);
  }

  function openChangelogModal() {
    if (!changelogModal) return;
    if (typeof ensureChangelogLoaded === "function") {
      ensureChangelogLoaded();
    }
    openModal(changelogModal, changelogClose);
  }

  function closeChangelogModal() {
    closeModal(changelogModal);
  }

  function openSettingsModal() {
    if (!settingsModal) return;
    openModal(settingsModal, settingsClose);
    requestAnimationFrame(() => {
      if (typeof scheduleSettingsInfoTipsPlacement === "function") {
        scheduleSettingsInfoTipsPlacement();
      }
    });
  }

  function closeSettingsModal() {
    closeModal(settingsModal);
  }

  return {
    trapModalFocus,
    openModal,
    closeModal,
    requestConfirmation,
    closeConfirmModal,
    openAchievementsModal,
    closeAchievementsModal,
    openChangelogModal,
    closeChangelogModal,
    openSettingsModal,
    closeSettingsModal
  };
}
