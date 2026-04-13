import assert from "node:assert/strict";
import test from "node:test";

import { createMultiplayerController } from "./multiplayer.js";

function createButton() {
  return {
    hidden: false,
    disabled: false,
    listener: null,
    addEventListener(type, listener) {
      if (type === "click") this.listener = listener;
    },
    click() {
      if (this.listener) return this.listener();
      return undefined;
    }
  };
}

function createInput(value = "") {
  return {
    value,
    hidden: false,
    disabled: false,
    textContent: "",
    placeholder: "",
    classList: { toggle() {} },
    addEventListener() {},
    setAttribute() {},
    removeAttribute() {},
    closest() {
      return null;
    }
  };
}

function createDomNode(tagName = "div") {
  return {
    tagName: tagName.toUpperCase(),
    className: "",
    textContent: "",
    hidden: false,
    style: {
      setProperty() {}
    },
    classList: {
      add() {},
      remove() {},
      toggle() {}
    },
    appendChild() {},
    replaceChildren() {}
  };
}

function createControllerElements() {
  const button = () => createButton();
  return {
    panel: { hidden: true },
    status: { hidden: false, textContent: "" },
    players: { replaceChildren() {}, hidden: false },
    events: { replaceChildren() {}, hidden: false },
    roomCode: { textContent: "" },
    modalRoomCode: { textContent: "" },
    roomCodeDisplay: { hidden: false },
    roomCodeField: { hidden: false },
    roomCodeInput: createInput(),
    playerNameInput: createInput("Ash"),
    modeSelect: createInput("race"),
    createBtn: button(),
    joinBtn: button(),
    startBtn: button(),
    leaveBtn: button(),
    copyBtn: button(),
    copyCodeBtn: button()
  };
}

test("createMultiplayerController leaves silently and can rejoin after reconnect", async () => {
  const elements = createControllerElements();
  const disconnectCalls = [];
  const joinCalls = [];
  const originalLocalStorage = globalThis.localStorage;
  const originalDocument = globalThis.document;
  const localStorageState = new Map();
  globalThis.document = {
    createElement: (tagName) => createDomNode(tagName),
    createDocumentFragment: () => ({
      appendChild() {}
    })
  };
  const client = {
    async joinRoom(code, payload) {
      assert.equal(code, "ROOM1");
      joinCalls.push(payload);
      if (joinCalls.length === 1) {
        assert.deepEqual(payload, {
          playerName: "Ash",
          sessionToken: ""
        });
      } else {
        assert.deepEqual(payload, {
          playerName: "Ash",
          sessionToken: "session-1"
        });
      }
      return {
        roomId: "room-1",
        roomCode: "ROOM1",
        playerId: "player-1",
        sessionToken: "session-1",
        snapshot: {
          roomId: "room-1",
          roomCode: "ROOM1",
          status: "lobby",
          settings: {
            mode: "race"
          },
          players: [
            {
              id: "player-1",
              name: "Ash",
              host: true,
              foundCount: 0,
              status: "connected"
            }
          ],
          activeTotal: 1,
          sharedFound: [],
          playerFound: { "player-1": [] },
          foundBy: {},
          events: []
        }
      };
    },
    connect({ onOpen }) {
      if (typeof onOpen === "function") onOpen();
    },
    send() {
      return true;
    },
    disconnect(options = {}) {
      disconnectCalls.push(options);
    }
  };

  globalThis.localStorage = {
    getItem(key) {
      return localStorageState.has(key) ? localStorageState.get(key) : null;
    },
    setItem(key, value) {
      localStorageState.set(key, value);
    },
    removeItem(key) {
      localStorageState.delete(key);
    }
  };

  try {
    const controller = createMultiplayerController({
      client,
      state: { found: new Set() },
      elements,
      getRoomSettings: () => ({ mode: "race" }),
      updateStats() {},
      renderSprites() {},
      renderStudyPanel() {},
      showRevealPreview() {},
      playCry() {},
      showStatusHint() {},
      focusInput() {},
      applyRoomSettings() {},
      restoreLocalSettings() {},
      saveSoloTimerSnapshot() {},
      restoreSoloTimerSnapshot() {},
      syncMultiplayerTimer() {},
      joinInvite: {
        message: { textContent: "" },
        playerNameInput: createInput(),
        acceptBtn: createButton()
      }
    });

    elements.roomCodeInput.value = "ROOM1";
    await elements.joinBtn.click();

    assert.equal(controller.isActive(), true);
    assert.equal(disconnectCalls.length, 0);

    await elements.leaveBtn.click();

    assert.equal(controller.isActive(), false);
    assert.deepEqual(disconnectCalls, [{ silent: true }]);

    await elements.joinBtn.click();
    assert.equal(controller.isActive(), true);
    assert.deepEqual(disconnectCalls, [{ silent: true }]);
    assert.equal(joinCalls.length, 2);
  } finally {
    globalThis.localStorage = originalLocalStorage;
    globalThis.document = originalDocument;
  }
});

test("createMultiplayerController marks the session as non-reconnecting after leave", async () => {
  const elements = createControllerElements();
  const disconnectCalls = [];
  const originalLocalStorage = globalThis.localStorage;
  const originalDocument = globalThis.document;
  const localStorageState = new Map();
  globalThis.document = {
    createElement: (tagName) => createDomNode(tagName),
    createDocumentFragment: () => ({
      appendChild() {}
    })
  };
  const client = {
    async joinRoom() {
      return {
        roomId: "room-1",
        roomCode: "ROOM1",
        playerId: "player-1",
        sessionToken: "session-1",
        snapshot: {
          roomId: "room-1",
          roomCode: "ROOM1",
          status: "lobby",
          settings: {
            mode: "race"
          },
          players: [
            {
              id: "player-1",
              name: "Ash",
              host: true,
              foundCount: 0,
              status: "connected"
            }
          ],
          activeTotal: 1,
          sharedFound: [],
          playerFound: { "player-1": [] },
          foundBy: {},
          events: []
        }
      };
    },
    connect({ onOpen }) {
      if (typeof onOpen === "function") onOpen();
    },
    send() {
      return true;
    },
    disconnect(options = {}) {
      disconnectCalls.push(options);
    }
  };

  globalThis.localStorage = {
    getItem(key) {
      return localStorageState.has(key) ? localStorageState.get(key) : null;
    },
    setItem(key, value) {
      localStorageState.set(key, value);
    },
    removeItem(key) {
      localStorageState.delete(key);
    }
  };

  try {
    const controller = createMultiplayerController({
      client,
      state: { found: new Set() },
      elements,
      getRoomSettings: () => ({ mode: "race" }),
      updateStats() {},
      renderSprites() {},
      renderStudyPanel() {},
      showRevealPreview() {},
      playCry() {},
      showStatusHint() {},
      focusInput() {},
      applyRoomSettings() {},
      restoreLocalSettings() {},
      saveSoloTimerSnapshot() {},
      restoreSoloTimerSnapshot() {},
      syncMultiplayerTimer() {},
      joinInvite: {
        message: { textContent: "" },
        playerNameInput: createInput(),
        acceptBtn: createButton()
      }
    });

    elements.roomCodeInput.value = "ROOM1";
    await elements.joinBtn.click();
    await elements.leaveBtn.click();

    const record = JSON.parse(
      globalThis.localStorage.getItem("dexsprint-multiplayer-session:v1") || "null"
    );

    assert.equal(controller.isActive(), false);
    assert.deepEqual(disconnectCalls, [{ silent: true }]);
    assert.equal(record.roomCode, "ROOM1");
    assert.equal(record.sessionToken, "session-1");
    assert.equal(record.autoReconnect, false);
  } finally {
    globalThis.localStorage = originalLocalStorage;
    globalThis.document = originalDocument;
  }
});
