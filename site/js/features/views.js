import { BADGES } from "../core/app-state.js";
import { renderNodeList, renderStateMessage } from "../ui/dom.js";

export function createViewController({
  state,
  spriteGrid,
  groupFilter,
  progressBar,
  progressMilestonesEl,
  foundCount,
  compactFoundCount,
  badgeList,
  badgeHeading,
  inputEl,
  showStateToast,
  flashElement,
  getBadgeContext,
  getProgressMilestoneEntries,
  getSpriteForEntry,
  getHiddenLabel,
  getSpriteCardBadge = () => null,
  isOutlinesOff = () => document.body.classList.contains("outlines-off"),
  formatGenerationLabel,
  generationOrder
}) {
  function renderProgressMilestones(total, found = state.activeFoundCount) {
    if (!progressMilestonesEl) return;
    const milestones = getProgressMilestoneEntries(total);
    const signature = milestones.map((entry) => entry.count).join("|");
    const shouldRebuild =
      progressMilestonesEl.dataset.signature !== signature ||
      progressMilestonesEl.children.length !== milestones.length;

    if (shouldRebuild) {
      renderNodeList(progressMilestonesEl, milestones, (entry) => {
        const marker = document.createElement("span");
        marker.className = "progress-milestone";
        marker.dataset.count = String(entry.count);
        marker.style.setProperty("--milestone-left", `${entry.percent}%`);
        marker.title = `${entry.percent}% complete`;
        marker.setAttribute("aria-hidden", "true");
        return marker;
      });
      progressMilestonesEl.dataset.signature = signature;
    }

    [...progressMilestonesEl.querySelectorAll(".progress-milestone")].forEach((marker) => {
      const count = Number.parseInt(marker.dataset.count || "0", 10);
      marker.classList.toggle("progress-milestone--hit", Number.isFinite(count) && found >= count);
    });
  }

  function flashProgressChange() {
    flashElement(progressBar, "progress-bar--state-change", 1000);
    [foundCount, compactFoundCount]
      .map((el) => el && el.closest(".stat"))
      .filter(Boolean)
      .forEach((stat) => flashElement(stat, "stat--state-change", 900));
  }

  function flashProgressMilestone(count) {
    if (!progressMilestonesEl) return;
    const marker = progressMilestonesEl.querySelector(`[data-count="${count}"]`);
    if (marker) flashElement(marker, "progress-milestone--pulse", 900);
  }

  function getGroupProgress(items, isFound, groupName) {
    const total = items.length;
    const found = items.filter((item) => isFound(item)).length;
    const percent = total === 0 ? 0 : Math.round((found / total) * 100);
    const isComplete = percent === 100;
    const isNewlyComplete =
      (groupName && state.pendingProgressUnlocks.generations.has(groupName)) ||
      (groupName && state.pendingProgressUnlocks.types.has(groupName));
    return { total, found, percent, isComplete, isNewlyComplete };
  }

  function renderBadges() {
    if (!badgeList) return;
    if (!state.groupMetadataReady) {
      renderStateMessage(badgeList, "Loading achievements...", "badge-list__state");
      if (badgeHeading) {
        badgeHeading.textContent = "Achievements";
      }
      return;
    }
    const context = getBadgeContext();
    let unlockedCount = 0;
    const unlockedIds = [];

    renderNodeList(badgeList, BADGES, (badge) => {
      const unlocked = badge.unlocked(context);
      const isNewlyUnlocked =
        unlocked && state.badgesPrimed && !state.isRestoring && !state.seenBadges.has(badge.id);
      if (unlocked) {
        unlockedCount += 1;
        unlockedIds.push(badge.id);
      }
      const item = document.createElement("div");
      item.className = `badge ${unlocked ? "badge--unlocked" : "badge--locked"}`;
      if (isNewlyUnlocked) {
        item.classList.add("badge--just-unlocked");
      }

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
      return item;
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
      if (badge) {
        showStateToast({
          meta: "Badge Unlocked",
          title: badge.title,
          icon: badge.icon
        });
      }
    });
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
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";

    const label = document.createElement("span");
    label.className = "sprite-card__name";

    card.appendChild(img);
    card.appendChild(label);
    syncSpriteCardState(card, entry, {
      isFound,
      hiddenLabel: getHiddenLabel(entry)
    });
    return card;
  }

  function syncSpriteCardState(card, entry, { isFound, hiddenLabel = "???", animateReveal = false } = {}) {
    if (!card || !entry) return false;
    const classes = ["sprite-card"];
    const isRevealedNow = isFound && state.recentlyFound.has(entry.normalized);
    if (!isFound) {
      classes.push("sprite-card--hidden");
    }
    if (isRevealedNow) {
      classes.push("sprite-card--revealed");
      if (!isOutlinesOff()) {
        classes.push("sprite-card--outline-reveal");
      }
    }
    card.className = classes.join(" ");
    card.dataset.pokemon = entry.normalized;

    const img = card.querySelector("img");
    if (img) {
      img.src = getSpriteForEntry(entry);
      img.alt = isFound ? entry.label : "Unknown Pokemon";
    }

    const label = card.querySelector(".sprite-card__name");
    if (label) {
      label.textContent = isFound ? entry.label : hiddenLabel;
    }

    card.classList.remove("sprite-card--multiplayer-found");
    card.style.removeProperty("--found-by-accent");
    card.querySelector(".sprite-card__found-by")?.remove();
    card.removeAttribute("title");
    const foundBy = getSpriteCardBadge(entry.normalized);
    if (foundBy && isFound) {
      card.classList.add("sprite-card--multiplayer-found");
      card.style.setProperty("--found-by-accent", foundBy.accent);
      card.title = `First found by ${foundBy.name}`;
      const badge = document.createElement("span");
      badge.className = "sprite-card__found-by";
      badge.textContent = foundBy.name;
      card.appendChild(badge);
    }

    if (animateReveal && isFound) {
      card.classList.remove("sprite-card--revealed");
      void card.offsetWidth;
      card.classList.add("sprite-card--revealed");
      if (!isOutlinesOff()) {
        card.classList.add("sprite-card--outline-reveal");
      }
    } else if (!isFound) {
      card.classList.remove("sprite-card--revealed");
      card.classList.remove("sprite-card--outline-reveal");
    }

    if (isRevealedNow) {
      const spriteUrl = getSpriteForEntry(entry).replace(/"/g, '\\"');
      card.style.setProperty("--reveal-sprite", `url("${spriteUrl}")`);
    } else {
      card.style.removeProperty("--reveal-sprite");
    }

    return true;
  }

  function refreshGroupedGenerationHeaders() {
    if (!spriteGrid || !groupFilter || groupFilter.value === "none") return;
    const sections = [...spriteGrid.querySelectorAll(".group-card")];
    sections.forEach((section) => {
      const title = section.querySelector(".group-title");
      if (!title) return;
      const cards = [...section.querySelectorAll(".sprite-card")];
      const groupName = section.dataset.groupName || title.textContent || "";
      const { percent, isComplete, isNewlyComplete } = getGroupProgress(
        cards,
        (card) => !card.classList.contains("sprite-card--hidden"),
        groupName
      );
      title.textContent =
        groupFilter.value === "generation" ? `${groupName} - ${percent}%` : groupName;
      title.classList.toggle("group-title--complete", isComplete);
      section.classList.toggle("group-card--complete", isComplete);
      section.classList.toggle("group-card--just-complete", isNewlyComplete);
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

    const groupKeys = [...groups.keys()];
    if (document.body.classList.contains("compact-mode")) {
      const count = groupKeys.length;
      const cols = Math.min(6, Math.max(1, count));
      if (spriteGrid) spriteGrid.style.setProperty("--compact-cols", String(cols));
    } else if (spriteGrid) {
      spriteGrid.style.removeProperty("--compact-cols");
    }

    const sortedGroupKeys = groupKeys.sort((a, b) => {
      if (mode !== "generation") return a.localeCompare(b);
      return (genLabelOrder.get(a) || 999) - (genLabelOrder.get(b) || 999);
    });

    renderNodeList(spriteGrid, sortedGroupKeys, (groupName) => {
      const entries = groups.get(groupName) || [];
      const { percent, isComplete, isNewlyComplete } = getGroupProgress(
        entries,
        (entry) => state.found.has(entry.normalized),
        groupName
      );
      const section = document.createElement("section");
      section.className = "group-card";
      if (isComplete) section.classList.add("group-card--complete");
      if (isNewlyComplete) section.classList.add("group-card--just-complete");
      section.dataset.groupName = groupName;
      const title = document.createElement("h3");
      title.className = "group-title";
      if (isComplete) title.classList.add("group-title--complete");
      title.textContent =
        mode === "generation"
          ? `${groupName} - ${percent}%`
          : groupName;
      const grid = document.createElement("div");
      grid.className = "sprite-grid";
      renderNodeList(grid, entries, (entry) => {
        const isFound = state.found.has(entry.normalized);
        return createSpriteCard(entry, isFound);
      });

      section.appendChild(title);
      section.appendChild(grid);
      return section;
    });
    spriteGrid.className = "sprite-groups";
  }

  function renderSprites() {
    if (!spriteGrid) return;
    spriteGrid.className = "sprite-grid";
    if (groupFilter && groupFilter.value !== "none") {
      renderSpritesGrouped();
    } else {
      renderNodeList(spriteGrid, state.names, (name) => {
        const entry = state.meta.get(name);
        if (!entry) return;
        const isFound = state.found.has(name);
        return createSpriteCard(entry, isFound);
      });
    }
    state.pendingProgressUnlocks = {
      generations: new Set(),
      types: new Set()
    };
    state.recentlyFound.clear();
  }

  return {
    renderProgressMilestones,
    flashProgressChange,
    flashProgressMilestone,
    renderBadges,
    triggerCompletionCelebration,
    clearCompletionCelebration,
    createSpriteCard,
    syncSpriteCardState,
    renderSprites,
    renderSpritesGrouped,
    refreshGroupedGenerationHeaders
  };
}
