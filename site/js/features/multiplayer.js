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
  saveSoloStudySnapshot = () => {},
  restoreSoloTimerSnapshot = () => {},
  restoreSoloStudySnapshot = () => {},
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
    return getRoomAccessState().active && Boolean(sessionToken);
  }

  function getRoomAccessState(snapshot = room) {
    const currentRoom = snapshot ?? room;
    const active = Boolean(currentRoom);
    const host =
      active && Boolean(currentRoom?.players.find((player) => player.id === playerId)?.host);
    return {
      active,
      host
    };
  }

  function canHostControlRoom() {
    const access = getRoomAccessState();
    return access.active && access.host;
  }

  function getPlayerName() {
    return (playerNameInput?.value || "").trim();
  }

  function setStatus(message) {
    statusMessage = message || "";
    if (status) status.textContent = statusMessage;
  }

  async function copyRoomText(value, successMessage, fallbackMessage) {
    if (await copyTextToClipboard(value)) {
      setStatus(successMessage);
      return true;
    }
    setStatus(fallbackMessage);
    return false;
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

  function syncRoomStudyState(snapshot) {
    if (snapshot?.settings.mode !== "versus") {
      state.studyDeck = [];
      state.studyCurrent = null;
      state.studyRevealed = false;
      return;
    }
    state.studyDeck = [];
    state.studyCurrent = snapshot.versusCurrent || null;
    state.studyRevealed = Boolean(snapshot.versusRevealed);
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

  function getSpriteCardBadge(canonical) {
    if (room?.settings.mode !== "coop") return null;
    return attribution.get(canonical) || null;
  }

  function renderRoomList(container, items, emptyMessage, createNode) {
    if (!container) return;
    if (!items.length) {
      renderStateMessage(container, emptyMessage, "", "span");
      return;
    }
    renderNodeList(container, items, createNode);
  }

  function renderPlayers(snapshot = room) {
    if (!players) return;
    if (!snapshot) {
      renderStateMessage(players, "No room joined.", "", "span");
      return;
    }
    renderRoomList(players, snapshot.players, "No room players yet.", (player) => {
      const item = document.createElement("span");
      item.className = "multiplayer-player";
      item.style.setProperty("--player-accent", getPlayerAccent(player.id));
      item.textContent = `${player.name}${player.host ? " (host)" : ""}: ${player.foundCount}/${snapshot.activeTotal}`;
      if (player.status === "disconnected") item.classList.add("is-disconnected");
      return item;
    });
  }

  function getVisibleRoomEvents(snapshot) {
    if (!snapshot?.events?.length) return [];
    return snapshot.events.filter((event) => {
      if (snapshot.settings.mode !== "race") return true;
      return event.type !== "guess_accepted" && event.type !== "room_completed";
    });
  }

  function formatRoomEventMessage(event, player) {
    const playerName = player?.name || "Player";
    if (event.type === "guess_accepted" || event.type === "room_completed") {
      return `${playerName} found ${event.label || event.canonical || "Pokemon"}`;
    }
    if (event.type === "room_skip_voted") {
      const skipCount = Number.isFinite(event.skipCount) ? event.skipCount : 1;
      const skipTotal = Number.isFinite(event.skipTotal) ? event.skipTotal : 1;
      return `${playerName} voted to skip (${skipCount}/${skipTotal}).`;
    }
    if (event.type === "room_skipped") {
      return `Skipped the current card.`;
    }
    if (event.type === "room_reset") {
      return `${playerName} reset the room.`;
    }
    return `${playerName} joined.`;
  }

  function renderEvents(snapshot = room) {
    if (!events) return;
    if (!snapshot) {
      renderStateMessage(events, "No room joined.", "", "span");
      return;
    }
    if (!snapshot.events.length) {
      renderStateMessage(events, "No multiplayer events yet.", "", "span");
      return;
    }
    const visibleEvents = getVisibleRoomEvents(snapshot);
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
    renderRoomList(events, visibleEvents.slice(0, 4), "No multiplayer events yet.", (event) => {
      const item = document.createElement("span");
      const player = snapshot.players.find((entry) => entry.id === event.playerId);
      if (player) {
        item.classList.add("multiplayer-event--player");
        item.style.setProperty("--player-accent", getPlayerAccent(player.id));
      }
      item.textContent = formatRoomEventMessage(event, player);
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
    syncRoomStudyState(snapshot);
    if (refreshRoomSettings) {
      applyRoomSettings(snapshot.settings);
    }
    syncMultiplayerTimer(snapshot);
    if (!refreshRoomSettings || snapshot.settings.mode === "versus") {
      refreshLocalGameplayViews();
    }
    render();
    onRoomStateChange(snapshot);
  }

  function applyAcceptedGuess(message) {
    if (!message.snapshot) return;
    const wasFound = state.found.has(message.canonical);
    const shouldReveal =
      message.snapshot.settings.mode === "coop" ||
      message.snapshot.settings.mode === "versus" ||
      message.playerId === playerId;
    if (shouldReveal && !wasFound) {
      state.recentlyFound.add(message.canonical);
    }
    applySnapshot(message.snapshot, { refreshRoomSettings: false });
    if (!shouldReveal) return;

    const isNew =
      message.snapshot.settings.mode === "versus"
        ? !wasFound
        : !wasFound && state.found.has(message.canonical);
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
    saveSoloStudySnapshot();
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
      onClose: (message) => {
        if (room) setStatus(message || "Disconnected from multiplayer room.");
      },
      onError: (message) => setStatus(message || "Could not connect to multiplayer room.")
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

  function resetRoom() {
    if (!canHostControlRoom()) return;
    const sent = client.send({ type: "room:reset" });
    if (!sent) {
      setStatus("Multiplayer connection is not open.");
      return;
    }
    closeRoomModal();
    focusInput();
  }

  function leaveRoom({ restoreSolo = true } = {}) {
    client.send({ type: "room:leave" });
    client.disconnect({ silent: true });
    updateSessionRecord({ autoReconnect: false });
    room = null;
    playerId = "";
    sessionToken = "";
    if (restoreSolo) restoreSoloProgressSnapshot();
    if (restoreSolo) restoreSoloTimerSnapshot();
    restoreLocalSettings();
    if (restoreSolo) restoreSoloStudySnapshot();
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

  function skipRoom() {
    if (!isActive()) return false;
    const sent = client.send({ type: "room:skip" });
    if (!sent) setStatus("Multiplayer connection is not open.");
    return sent;
  }

  function configureRoom() {
    if (!canHostControlRoom()) return;
    client.send({ type: "room:configure", settings: getRoomSettings() });
  }

  const syncRoomSettings = configureRoom;

  async function copyRoomLink() {
    if (!room) return;
    const url = new URL(window.location.href);
    url.hash = `room=${encodeURIComponent(room.roomCode)}`;
    await copyRoomText(url.toString(), "Room link copied.", `Room code: ${room.roomCode}`);
  }

  async function copyRoomCode() {
    if (!room) return;
    await copyRoomText(room.roomCode, "Room code copied.", `Room code: ${room.roomCode}`);
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
  if (leaveBtn) leaveBtn.addEventListener("click", () => leaveRoom());
  if (copyBtn) copyBtn.addEventListener("click", copyRoomLink);
  if (copyCodeBtn) copyCodeBtn.addEventListener("click", copyRoomCode);
  if (modeSelect) modeSelect.addEventListener("change", configureRoom);
  if (inviteAcceptBtn) inviteAcceptBtn.addEventListener("click", joinInviteRoom);

  render(null);
  onRoomStateChange(null);

  return {
    isActive,
    getRoomAccessState,
    getRoomSnapshot: () => room,
    canHostControlRoom,
    configureRoom,
    syncRoomSettings,
    submitGuess,
    skipRoom,
    resetRoom,
    restoreFromHashOrSession,
    leaveRoom,
    getCurrentPlayerId: () => playerId,
    getSpriteCardBadge
  };
}
