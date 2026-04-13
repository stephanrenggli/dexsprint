import assert from "node:assert/strict";
import test from "node:test";

import { createMultiplayerClient } from "./multiplayer-client.js";

test("createMultiplayerClient reports websocket constructor failures", () => {
  const originalWindow = globalThis.window;
  const originalWebSocket = globalThis.WebSocket;
  const messages = [];

  globalThis.window = {
    location: {
      href: "http://localhost/"
    }
  };
  globalThis.WebSocket = class {
    constructor() {
      throw new Error("boom");
    }
  };

  try {
    const client = createMultiplayerClient();
    client.connect({
      roomId: "room",
      sessionToken: "token",
      onError: (message) => messages.push(message)
    });

    assert.deepEqual(messages, ["Could not open a multiplayer connection."]);
  } finally {
    globalThis.window = originalWindow;
    globalThis.WebSocket = originalWebSocket;
  }
});

test("createMultiplayerClient reports websocket disconnects after connect", async () => {
  const originalWindow = globalThis.window;
  const originalWebSocket = globalThis.WebSocket;
  const openMessages = [];
  const closeMessages = [];

  class FakeSocket {
    static OPEN = 1;
    static lastInstance = null;
    readyState = 0;
    url = "";
    listeners = new Map();

    constructor(url) {
      this.url = url;
      FakeSocket.lastInstance = this;
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    send() {}

    close() {
      this.readyState = 3;
      this.listeners.get("close")?.();
    }

    emitOpen() {
      this.readyState = 1;
      this.listeners.get("open")?.();
    }
  }

  globalThis.window = {
    location: {
      href: "http://localhost/"
    }
  };
  globalThis.WebSocket = FakeSocket;

  try {
    const client = createMultiplayerClient();
    client.connect({
      roomId: "room",
      sessionToken: "token",
      onOpen: () => openMessages.push("open"),
      onClose: (message) => closeMessages.push(message)
    });

    assert.equal(openMessages.length, 0);
    assert.equal(closeMessages.length, 0);
    assert.ok(FakeSocket.lastInstance);
    FakeSocket.lastInstance.emitOpen();
    FakeSocket.lastInstance.close();

    assert.deepEqual(openMessages, ["open"]);
    assert.deepEqual(closeMessages, ["Disconnected from multiplayer room."]);
  } finally {
    globalThis.window = originalWindow;
    globalThis.WebSocket = originalWebSocket;
  }
});

test("createMultiplayerClient can disconnect silently for intentional leaves", async () => {
  const originalWindow = globalThis.window;
  const originalWebSocket = globalThis.WebSocket;
  const openMessages = [];
  const closeMessages = [];

  class FakeSocket {
    static OPEN = 1;
    static lastInstance = null;
    readyState = 0;
    url = "";
    listeners = new Map();

    constructor(url) {
      this.url = url;
      FakeSocket.lastInstance = this;
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    send() {}

    close() {
      this.readyState = 3;
      this.listeners.get("close")?.();
    }

    emitOpen() {
      this.readyState = 1;
      this.listeners.get("open")?.();
    }
  }

  globalThis.window = {
    location: {
      href: "http://localhost/"
    }
  };
  globalThis.WebSocket = FakeSocket;

  try {
    const client = createMultiplayerClient();
    client.connect({
      roomId: "room",
      sessionToken: "token",
      onOpen: () => openMessages.push("open"),
      onClose: (message) => closeMessages.push(message)
    });

    assert.ok(FakeSocket.lastInstance);
    FakeSocket.lastInstance.emitOpen();
    client.disconnect({ silent: true });

    assert.deepEqual(openMessages, ["open"]);
    assert.deepEqual(closeMessages, []);
  } finally {
    globalThis.window = originalWindow;
    globalThis.WebSocket = originalWebSocket;
  }
});
