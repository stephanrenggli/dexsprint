const SESSION_STORAGE_KEY = "dexsprint-multiplayer-session:v1";

import { copyTextToClipboard, renderNodeList, renderStateMessage } from "../ui/dom.js";

function formatRoomCode(value) {
  return (value || "").trim().toUpperCase();
}

function readSessionRecord() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeSessionRecord(record) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(record));
}

function clearSessionRecord() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function getStoredSessionRecord() {
  const record = readSessionRecord();
  if (!record || typeof record !== "object") return null;
  return record;
}

function getStoredSessionTokenForRoom(roomCode) {
  const record = getStoredSessionRecord();
  if (!record) return "";
  if (formatRoomCode(record.roomCode) !== formatRoomCode(roomCode)) return "";
  return typeof record.sessionToken === "string" ? record.sessionToken : "";
}

function updateSessionRecord(patch) {
  const current = getStoredSessionRecord();
  if (!current) return;
  writeSessionRecord({ ...current, ...patch });
}

export function createMultiplayerController({
  client,
  state,
  elements,
  getRoomSettings,
  recalculateActiveFoundCount = () => {},
  updateStats,
  renderSprites,
  renderStudyPanel,
  showRevealPreview,
  playCry,
  showStatusHint,
  focusInput,
  saveSoloTimerSnapshot = () => {},
  restoreSoloTimerSnapshot = () => {},
  syncMultiplayerTimer = () => {},
  applyRoomSettings = () => {},
  restoreLocalSettings = () => {},
  joinInvite = {},
  openJoinPrompt = () => {},
  closeJoinPrompt = () => {},
  closeRoomModal = () => {},
  onRoomStateChange = () => {}
}) {
  let room = null;
  let playerId = "";
  let sessionToken = "";
  let soloFound = null;
  let statusMessage = "Create or join a private room.";
  let attribution = new Map();

  const {
    panel,
    status,
    players,
    events,
    roomCode,
    modalRoomCode,
    roomCodeDisplay,
    roomCodeField,
    roomCodeInput,
    playerNameInput,
    modeSelect,
    createBtn,
    joinBtn,
    startBtn,
    leaveBtn,
    copyBtn,
    copyCodeBtn
  } = elements;
  const {
    message: inviteMessage,
    playerNameInput: invitePlayerNameInput,
    acceptBtn: inviteAcceptBtn
  } = joinInvite;
  let pendingInviteCode = "";

  function isActive() {
    return Boolean(room && sessionToken);
  }

  function isHost() {
    return Boolean(room?.players.find((player) => player.id === playerId)?.host);
  }

  function canHostControlRoom() {
    return isActive() && isHost();
  }

  function canSyncRoomSettings() {
    return canHostControlRoom() && room?.status === "lobby";
  }

  function getPlayerName() {
    return (playerNameInput?.value || "").trim();
  }

  function setStatus(message) {
    statusMessage = message || "";
    if (status) status.textContent = statusMessage;
  }

  function saveSoloProgressSnapshot() {
    if (!soloFound) soloFound = new Set(state.found);
  }

  function restoreSoloProgressSnapshot() {
    if (!soloFound) return;
    state.found = new Set(soloFound);
    soloFound = null;
    recalculateActiveFoundCount();
    refreshLocalGameplayViews();
  }

  function refreshLocalGameplayViews() {
    updateStats();
    renderSprites();
    renderStudyPanel();
  }

  function getVisibleFound(snapshot) {
    if (!snapshot) return [];
    if (snapshot.settings.mode === "coop") return snapshot.sharedFound || [];
    return snapshot.playerFound?.[playerId] || [];
  }

  function hashPlayerId(foundPlayerId) {
    let hash = 0;
    for (let index = 0; index < foundPlayerId.length; index += 1) {
      hash = (hash * 31 + foundPlayerId.charCodeAt(index)) >>> 0;
    }
    return hash;
  }

  function getPlayerAccent(foundPlayerId) {
    const hash = hashPlayerId(foundPlayerId);
    const hue = hash % 360;
    const saturation = 64 + ((hash >> 8) % 14);
    const lightness = 46 + ((hash >> 16) % 8);
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  }

  function getPlayerNameForJoin() {
    return (invitePlayerNameInput?.value || getPlayerName()).trim();
  }

  function buildAttribution(snapshot) {
    const next = new Map();
    if (!snapshot?.foundBy) return next;
    Object.entries(snapshot.foundBy).forEach(([canonical, foundPlayerId]) => {
      const player = snapshot.players.find((entry) => entry.id === foundPlayerId);
      if (!player) return;
      next.set(canonical, {
        name: player.name,
        accent: getPlayerAccent(foundPlayerId)
      });
    });
    return next;
  }

  function applyAttributionBadges() {
    document.querySelectorAll(".sprite-card").forEach((card) => {
      card.classList.remove("sprite-card--multiplayer-found");
      card.style.removeProperty("--found-by-accent");
      card.querySelector(".sprite-card__found-by")?.remove();
      card.removeAttribute("title");
      if (room?.settings.mode !== "coop") return;
      const canonical = card.dataset.pokemon;
      if (!canonical || card.classList.contains("sprite-card--hidden")) return;
      const foundBy = attribution.get(canonical);
      if (!foundBy) return;
      card.classList.add("sprite-card--multiplayer-found");
      card.style.setProperty("--found-by-accent", foundBy.accent);
      card.title = `First found by ${foundBy.name}`;
      const badge = document.createElement("span");
      badge.className = "sprite-card__found-by";
      badge.textContent = foundBy.name;
      card.appendChild(badge);
    });
  }

  function renderPlayers(snapshot = room) {
    if (!players) return;
    if (!snapshot) {
      renderStateMessage(players, "No room joined.", "", "span");
      return;
    }
    renderNodeList(players, snapshot.players, (player) => {
      const item = document.createElement("span");
      item.className = "multiplayer-player";
      item.style.setProperty("--player-accent", getPlayerAccent(player.id));
      item.textContent = `${player.name}${player.host ? " (host)" : ""}: ${player.foundCount}/${snapshot.activeTotal}`;
      if (player.status === "disconnected") item.classList.add("is-disconnected");
      return item;
    });
  }

  function renderEvents(snapshot = room) {
    if (!events) return;
    if (!snapshot || !snapshot.events.length) {
      renderStateMessage(events, "No multiplayer events yet.", "", "span");
      return;
    }
    const visibleEvents = snapshot.events.filter((event) => {
      if (snapshot.settings.mode !== "race") return true;
      return event.type !== "guess_accepted" && event.type !== "room_completed";
    });
    if (!visibleEvents.length) {
      renderStateMessage(
        events,
        snapshot.settings.mode === "race"
          ? "Race guesses are hidden."
          : "No multiplayer events yet.",
        "",
        "span"
      );
      return;
    }
    renderNodeList(events, visibleEvents.slice(0, 4), (event) => {
      const item = document.createElement("span");
      const player = snapshot.players.find((entry) => entry.id === event.playerId);
      if (player) {
        item.classList.add("multiplayer-event--player");
        item.style.setProperty("--player-accent", getPlayerAccent(player.id));
      }
      if (event.type === "guess_accepted" || event.type === "room_completed") {
        item.textContent = `${player?.name || "Player"} found ${event.label || event.canonical || "Pokemon"}`;
      } else if (event.type === "room_started") {
        item.textContent = "Room started.";
      } else if (event.type === "room_reset") {
        item.textContent = `${player?.name || "Player"} reset the room.`;
      } else {
        item.textContent = `${player?.name || "Player"} joined.`;
      }
      return item;
    });
  }

  function render(snapshot = room) {
    if (panel) panel.hidden = !snapshot;
    if (roomCode) roomCode.textContent = snapshot ? snapshot.roomCode : "-";
    if (modalRoomCode) modalRoomCode.textContent = snapshot ? snapshot.roomCode : "-";
    if (roomCodeDisplay) roomCodeDisplay.hidden = !snapshot;
    if (roomCodeField) roomCodeField.hidden = Boolean(snapshot);
    if (status) status.hidden = Boolean(snapshot);
    if (playerNameInput) playerNameInput.disabled = Boolean(snapshot);
    if (modeSelect && snapshot) modeSelect.value = snapshot.settings.mode;
    if (createBtn) createBtn.hidden = Boolean(snapshot);
    if (joinBtn) joinBtn.hidden = Boolean(snapshot);
    if (roomCodeInput) roomCodeInput.disabled = Boolean(snapshot);
    if (modeSelect) modeSelect.disabled = Boolean(snapshot);
    if (startBtn) {
      const self = snapshot?.players.find((player) => player.id === playerId);
      startBtn.hidden = !snapshot || snapshot.status !== "lobby" || !self?.host;
    }
    if (leaveBtn) leaveBtn.hidden = !snapshot;
    if (copyBtn) copyBtn.hidden = !snapshot;
    if (copyCodeBtn) copyCodeBtn.hidden = !snapshot;
    renderPlayers(snapshot);
    renderEvents(snapshot);
    if (snapshot) {
      setStatus(`Room ${snapshot.roomCode} - ${snapshot.status} - ${snapshot.settings.mode}`);
    } else {
      setStatus(statusMessage);
    }
  }

  function applySnapshot(snapshot, { refreshRoomSettings = true } = {}) {
    room = snapshot;
    attribution = buildAttribution(snapshot);
    state.found = new Set(getVisibleFound(snapshot));
    recalculateActiveFoundCount();
    if (refreshRoomSettings) {
      applyRoomSettings(snapshot.settings);
    }
    syncMultiplayerTimer(snapshot);
    if (!refreshRoomSettings) {
      refreshLocalGameplayViews();
    }
    render();
    onRoomStateChange(snapshot);
  }

  function applyAcceptedGuess(message) {
    if (!message.snapshot) return;
    const wasFound = state.found.has(message.canonical);
    const shouldReveal =
      message.snapshot.settings.mode === "coop" || message.playerId === playerId;
    if (shouldReveal && !wasFound) {
      state.recentlyFound.add(message.canonical);
    }
    applySnapshot(message.snapshot, { refreshRoomSettings: false });
    if (!shouldReveal) return;

    const isNew = !wasFound && state.found.has(message.canonical);
    if (isNew) {
      const entry = state.meta.get(message.canonical);
      if (entry) {
        showRevealPreview(entry);
      }
      playCry(message.canonical);
    }
  }

  function handleServerMessage(message) {
    if (
      message.type === "room:snapshot" ||
      message.type === "player:presence" ||
      message.type === "player:joined"
    ) {
      applySnapshot(message.snapshot);
      return;
    }
    if (message.type === "guess:accepted") {
      applyAcceptedGuess(message);
      return;
    }
    if (message.type === "guess:rejected") {
      showStatusHint(message.message);
      setStatus(message.message);
      return;
    }
    if (message.type === "room:complete") {
      applySnapshot(message.snapshot);
      setStatus("Room complete.");
      return;
    }
    if (message.type === "error") {
      setStatus(message.message || "Multiplayer error.");
    }
  }

  function connectFromResponse(response) {
    saveSoloProgressSnapshot();
    saveSoloTimerSnapshot();
    playerId = response.playerId;
    sessionToken = response.sessionToken;
    writeSessionRecord({
      roomId: response.roomId,
      roomCode: response.roomCode,
      playerId,
      sessionToken,
      autoReconnect: true
    });
    applySnapshot(response.snapshot);
    client.connect({
      roomId: response.roomId,
      sessionToken,
      onMessage: handleServerMessage,
      onOpen: () => setStatus(`Connected to room ${response.roomCode}.`),
      onClose: () => {
        if (room) setStatus("Disconnected from multiplayer room.");
      },
      onError: () => setStatus("Could not connect to multiplayer room.")
    });
  }

  async function createRoom() {
    try {
      setStatus("Creating room...");
      const response = await client.createRoom({
        playerName: getPlayerName(),
        settings: getRoomSettings()
      });
      connectFromResponse(response);
      focusInput();
    } catch (error) {
      setStatus(error.message || "Could not create room.");
    }
  }

  async function joinRoom() {
    const code = formatRoomCode(roomCodeInput?.value);
    if (!code) {
      setStatus("Enter a room code first.");
      return;
    }
    try {
      setStatus("Joining room...");
      const response = await client.joinRoom(code, {
        playerName: getPlayerName(),
        sessionToken: getStoredSessionTokenForRoom(code)
      });
      connectFromResponse(response);
      focusInput();
    } catch (error) {
      setStatus(error.message || "Could not join room.");
    }
  }

  async function joinInviteRoom() {
    const code = formatRoomCode(pendingInviteCode);
    if (!code) return;
    try {
      if (playerNameInput && invitePlayerNameInput?.value) {
        playerNameInput.value = invitePlayerNameInput.value;
      }
      setStatus("Joining room...");
      const response = await client.joinRoom(code, {
        playerName: getPlayerNameForJoin(),
        sessionToken: getStoredSessionTokenForRoom(code)
      });
      closeJoinPrompt();
      connectFromResponse(response);
      focusInput();
    } catch (error) {
      if (inviteMessage) {
        inviteMessage.textContent = error.message || "Could not join this room.";
      }
      setStatus(error.message || "Could not join room.");
    }
  }

  function startRoom() {
    if (!canHostControlRoom()) return;
    client.send({ type: "room:start" });
    closeRoomModal();
    focusInput();
  }

  function resetRoom() {
    if (!canHostControlRoom()) return;
    client.send({ type: "room:reset" });
    closeRoomModal();
    focusInput();
  }

  function leaveRoom({ restoreSolo = true } = {}) {
    client.send({ type: "room:leave" });
    client.disconnect();
    updateSessionRecord({ autoReconnect: false });
    room = null;
    playerId = "";
    sessionToken = "";
    if (restoreSolo) restoreSoloProgressSnapshot();
    if (restoreSolo) restoreSoloTimerSnapshot();
    restoreLocalSettings();
    onRoomStateChange(null);
    setStatus("Left multiplayer room.");
    render(null);
  }

  function submitGuess(value) {
    if (!isActive()) return false;
    const sent = client.send({ type: "guess:submit", value, clientTs: Date.now() });
    if (!sent) setStatus("Multiplayer connection is not open.");
    return sent;
  }

  function configureRoom() {
    if (!canSyncRoomSettings()) return;
    client.send({ type: "room:configure", settings: getRoomSettings() });
  }

  const syncRoomSettings = configureRoom;

  async function copyRoomLink() {
    if (!room) return;
    const url = new URL(window.location.href);
    url.hash = `room=${encodeURIComponent(room.roomCode)}`;
    if (await copyTextToClipboard(url.toString())) {
      setStatus("Room link copied.");
    } else {
      setStatus(`Room code: ${room.roomCode}`);
    }
  }

  async function copyRoomCode() {
    if (!room) return;
    if (await copyTextToClipboard(room.roomCode)) {
      setStatus("Room code copied.");
    } else {
      setStatus(`Room code: ${room.roomCode}`);
    }
  }

  async function restoreFromHashOrSession() {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash.startsWith("room=")) {
      const code = decodeURIComponent(hash.slice("room=".length));
      pendingInviteCode = formatRoomCode(code);
      if (roomCodeInput) roomCodeInput.value = pendingInviteCode;
      if (inviteMessage) {
        inviteMessage.textContent = `Do you want to join room ${pendingInviteCode}?`;
      }
      if (invitePlayerNameInput && playerNameInput?.value) {
        invitePlayerNameInput.value = playerNameInput.value;
      }
      openJoinPrompt();
      setStatus(`Room link ready for ${pendingInviteCode}.`);
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      return;
    }

    const record = readSessionRecord();
    if (!record?.roomCode || !record?.sessionToken) return;
    if (record.autoReconnect === false) return;
    try {
      const response = await client.joinRoom(record.roomCode, {
        sessionToken: record.sessionToken,
        playerName: getPlayerName()
      });
      connectFromResponse(response);
    } catch {
      clearSessionRecord();
    }
  }

  if (createBtn) createBtn.addEventListener("click", createRoom);
  if (joinBtn) joinBtn.addEventListener("click", joinRoom);
  if (startBtn) startBtn.addEventListener("click", startRoom);
  if (leaveBtn) leaveBtn.addEventListener("click", () => leaveRoom());
  if (copyBtn) copyBtn.addEventListener("click", copyRoomLink);
  if (copyCodeBtn) copyCodeBtn.addEventListener("click", copyRoomCode);
  if (modeSelect) modeSelect.addEventListener("change", configureRoom);
  if (inviteAcceptBtn) inviteAcceptBtn.addEventListener("click", joinInviteRoom);

  render(null);
  onRoomStateChange(null);

  return {
    isActive,
    isHost,
    canHostControlRoom,
    canSyncRoomSettings,
    configureRoom,
    syncRoomSettings,
    submitGuess,
    resetRoom,
    restoreFromHashOrSession,
    leaveRoom,
    refreshAttributionBadges: applyAttributionBadges
  };
}
