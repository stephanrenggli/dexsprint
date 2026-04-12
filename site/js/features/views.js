import { BADGES } from "../core/app-state.js";

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
      progressMilestonesEl.innerHTML = "";
      milestones.forEach((entry) => {
        const marker = document.createElement("span");
        marker.className = "progress-milestone";
        marker.dataset.count = String(entry.count);
        marker.style.setProperty("--milestone-left", `${entry.percent}%`);
        marker.title = `${entry.percent}% complete`;
        marker.setAttribute("aria-hidden", "true");
        progressMilestonesEl.appendChild(marker);
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

  function renderBadges() {
    if (!badgeList) return;
    if (!state.groupMetadataReady) {
      const loading = document.createElement("p");
      loading.className = "badge-list__state";
      loading.textContent = "Loading achievements...";
      badgeList.replaceChildren(loading);
      if (badgeHeading) {
        badgeHeading.textContent = "Achievements";
      }
      return;
    }
    const context = getBadgeContext();
    const fragment = document.createDocumentFragment();
    let unlockedCount = 0;
    const unlockedIds = [];

    BADGES.forEach((badge) => {
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
      fragment.appendChild(item);
    });

    badgeList.replaceChildren(fragment);

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

  function refreshGroupedGenerationHeaders() {
    if (!spriteGrid || !groupFilter || groupFilter.value === "none") return;
    const sections = [...spriteGrid.querySelectorAll(".group-card")];
    sections.forEach((section) => {
      const title = section.querySelector(".group-title");
      if (!title) return;
      const cards = [...section.querySelectorAll(".sprite-card")];
      const total = cards.length;
      const found = cards.filter((card) => !card.classList.contains("sprite-card--hidden")).length;
      const percent = total === 0 ? 0 : Math.round((found / total) * 100);
      const groupName = section.dataset.groupName || title.textContent || "";
      const isComplete = percent === 100;
      const isNewlyComplete =
        (groupFilter.value === "generation" &&
          state.pendingProgressUnlocks.generations.has(groupName)) ||
        (groupFilter.value === "type" && state.pendingProgressUnlocks.types.has(groupName));
      title.textContent =
        groupFilter.value === "generation" ? `${groupName} - ${percent}%` : groupName;
      title.classList.toggle("group-title--complete", isComplete);
      section.classList.toggle("group-card--complete", isComplete);
      section.classList.toggle("group-card--just-complete", isNewlyComplete);
    });
  }

  function renderSpritesGrouped(fragment) {
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
        const isComplete = percent === 100;
        const isNewlyComplete =
          (mode === "generation" && state.pendingProgressUnlocks.generations.has(groupName)) ||
          (mode === "type" && state.pendingProgressUnlocks.types.has(groupName));
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
        entries.forEach((entry) => {
          const isFound = state.found.has(entry.normalized);
          grid.appendChild(createSpriteCard(entry, isFound));
        });

        section.appendChild(title);
        section.appendChild(grid);
        fragment.appendChild(section);
      });
    spriteGrid.className = "sprite-groups";
  }

  function renderSprites() {
    if (!spriteGrid) return;
    const fragment = document.createDocumentFragment();
    spriteGrid.className = "sprite-grid";
    if (groupFilter && groupFilter.value !== "none") {
      renderSpritesGrouped(fragment);
    } else {
      state.names.forEach((name) => {
        const entry = state.meta.get(name);
        if (!entry) return;
        const isFound = state.found.has(name);
        fragment.appendChild(createSpriteCard(entry, isFound));
      });
    }
    spriteGrid.replaceChildren(fragment);
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
    renderSprites,
    renderSpritesGrouped,
    refreshGroupedGenerationHeaders
  };
}
