import assert from "node:assert/strict";
import test from "node:test";

import { buildGuessIndex } from "../../../shared/src/guess.js";
import type { CatalogSnapshot } from "../catalog/catalog.js";
import { RoomStore } from "../rooms/room-store.js";
import { registerRoomRealtime } from "./room-realtime.js";

function createCatalog(): CatalogSnapshot {
  const entries = [
    {
      canonical: "bulbasaur",
      label: "Bulbasaur",
      guesses: ["Bisasam"],
      dexId: 1,
      generation: "generation-i",
      types: ["grass", "poison"]
    },
    {
      canonical: "charmander",
      label: "Charmander",
      guesses: ["Glumanda"],
      dexId: 4,
      generation: "generation-i",
      types: ["fire"]
    }
  ];

  return {
    version: "test",
    generatedAt: new Date(0).toISOString(),
    entries,
    guessIndex: buildGuessIndex(entries)
  };
}

function createFakeSocket() {
  const listeners = new Map<string, (...args: unknown[]) => unknown>();
  const messages: any[] = [];
  const socket = {
    OPEN: 1,
    readyState: 1,
    messages,
    on(event: string, listener: (...args: unknown[]) => unknown) {
      listeners.set(event, listener);
      return socket;
    },
    send(payload: string) {
      messages.push(JSON.parse(payload));
    },
    close() {
      if (socket.readyState === 3) return;
      socket.readyState = 3;
      listeners.get("close")?.();
    },
    async emit(event: string, payload?: unknown) {
      const listener = listeners.get(event);
      if (!listener) return;
      return await listener(payload);
    }
  };
  return socket;
}

function createFakeLogger() {
  const entries: Array<{ level: string; message: string; data: unknown }> = [];
  const log = {
    entries,
    info(data: unknown, message?: string) {
      entries.push({ level: "info", message: message || "", data });
    },
    warn(data: unknown, message?: string) {
      entries.push({ level: "warn", message: message || "", data });
    },
    error(data: unknown, message?: string) {
      entries.push({ level: "error", message: message || "", data });
    },
    debug(data: unknown, message?: string) {
      entries.push({ level: "debug", message: message || "", data });
    }
  };
  return log;
}

type RouteHandler = (socket: ReturnType<typeof createFakeSocket>, request: any) => Promise<void>;

function createRouteHandler(catalog: CatalogSnapshot, roomStore = new RoomStore()): {
  handler: RouteHandler;
  roomStore: RoomStore;
  log: ReturnType<typeof createFakeLogger>;
} {
  let routeHandler: RouteHandler | null = null;
  const log = createFakeLogger();
  const app = {
    log,
    get(_path: string, _options: unknown, handler: RouteHandler) {
      routeHandler = handler;
    }
  };
  const catalogStore = {
    async getCatalog() {
      return catalog;
    }
  };

  registerRoomRealtime({
    app: app as never,
    catalogStore: catalogStore as never,
    roomStore
  });

  if (!routeHandler) {
    throw new Error("Route handler was not registered.");
  }
  return { handler: routeHandler, roomStore, log };
}

test("registerRoomRealtime wires room snapshots, guesses, resets, and disconnects", async () => {
  const catalog = createCatalog();
  const roomStore = new RoomStore();
  const created = roomStore.createRoom(catalog, { playerName: "Ash" });
  const joined = roomStore.joinRoom(created.roomCode, { playerName: "Misty" });
  assert.ok(joined);
  assert.equal(created.snapshot.status, "active");
  const { handler, log } = createRouteHandler(catalog, roomStore);
  const room = roomStore.getRoomById(created.roomId);
  assert.ok(room);

  const hostSocket = createFakeSocket();
  const guestSocket = createFakeSocket();

  await handler(hostSocket, {
    params: { roomId: created.roomId },
    query: { sessionToken: created.sessionToken }
  });
  await handler(guestSocket, {
    params: { roomId: created.roomId },
    query: { sessionToken: joined.sessionToken }
  });

  assert.equal(hostSocket.messages[0]?.type, "player:presence");
  assert.equal(hostSocket.messages[1]?.type, "room:snapshot");
  assert.equal(hostSocket.messages[2]?.type, "player:presence");
  assert.equal(guestSocket.messages[0]?.type, "player:presence");
  assert.equal(guestSocket.messages[1]?.type, "room:snapshot");
  assert.equal(hostSocket.messages[2]?.snapshot.players[1]?.status, "connected");

  await hostSocket.emit(
    "message",
    Buffer.from(
      JSON.stringify({
        type: "room:configure",
        settings: {
          mode: "coop",
          typoMode: "forgiving",
          autocorrect: false,
          outlinesOff: true,
          showDex: true
        }
      })
    )
  );
  const reconfiguredRoom = roomStore.getRoomById(created.roomId);
  assert.equal(reconfiguredRoom?.settings.mode, "coop");
  assert.equal(reconfiguredRoom?.settings.typoMode, "forgiving");
  assert.equal(reconfiguredRoom?.settings.autocorrect, false);
  assert.equal(reconfiguredRoom?.settings.outlinesOff, true);
  assert.equal(reconfiguredRoom?.settings.showDex, true);

  await hostSocket.emit(
    "message",
    Buffer.from(JSON.stringify({ type: "guess:submit", value: "Bulbasaur" }))
  );
  assert.equal(hostSocket.messages.at(-1)?.type, "guess:accepted");
  assert.equal(guestSocket.messages.at(-1)?.type, "guess:accepted");
  assert.equal(hostSocket.messages.at(-1)?.snapshot.playerFound[created.playerId]?.[0], "bulbasaur");

  await hostSocket.emit(
    "message",
    Buffer.from(
      JSON.stringify({
        type: "room:configure",
        settings: {
          types: ["grass"]
        }
      })
    )
  );
  assert.equal(hostSocket.messages.at(-1)?.type, "room:complete");
  assert.equal(hostSocket.messages.at(-1)?.snapshot.status, "complete");

  await guestSocket.emit("message", Buffer.from(JSON.stringify({ type: "room:reset" })));
  assert.equal(log.entries.at(-1)?.message, "multiplayer room reset rejected");
  assert.equal(log.entries.at(-1)?.level, "warn");

  await hostSocket.emit("message", Buffer.from(JSON.stringify({ type: "room:reset" })));
  assert.equal(hostSocket.messages.at(-1)?.type, "room:snapshot");
  assert.equal(hostSocket.messages.at(-1)?.snapshot.sharedFound.length, 0);
  assert.equal(hostSocket.messages.at(-1)?.snapshot.events.length, 0);

  assert.ok(log.entries.some((entry) => entry.message === "multiplayer websocket connected"));
  assert.ok(log.entries.some((entry) => entry.message === "multiplayer room configured"));
  assert.ok(log.entries.some((entry) => entry.message === "multiplayer guess accepted"));
  assert.ok(log.entries.some((entry) => entry.message === "multiplayer room reset"));

  hostSocket.close();
  assert.equal(guestSocket.messages.at(-1)?.type, "player:presence");
  assert.equal(guestSocket.messages.at(-1)?.snapshot.players[0]?.status, "disconnected");
});

test("registerRoomRealtime advances versus rooms after the reveal window", async () => {
  const catalog = createCatalog();
  const roomStore = new RoomStore();
  const created = roomStore.createRoom(catalog, {
    playerName: "Ash",
    settings: { mode: "versus" }
  });
  const { handler } = createRouteHandler(catalog, roomStore);
  const socket = createFakeSocket();

  await handler(socket, {
    params: { roomId: created.roomId },
    query: { sessionToken: created.sessionToken }
  });

  const current = created.snapshot.versusCurrent;
  assert.ok(current);
  const guess = current === "bulbasaur" ? "Bulbasaur" : "Charmander";

  await socket.emit("message", Buffer.from(JSON.stringify({ type: "guess:submit", value: guess })));
  assert.equal(socket.messages.at(-1)?.type, "guess:accepted");
  assert.equal(socket.messages.at(-1)?.snapshot.versusRevealed, true);

  await new Promise((resolve) => setTimeout(resolve, 1300));

  const latest = socket.messages.at(-1);
  assert.equal(latest?.type, "room:snapshot");
  assert.equal(latest?.snapshot.versusRevealed, false);
  assert.notEqual(latest?.snapshot.versusCurrent, current);
});

test("registerRoomRealtime advances versus rooms after all connected players skip", async () => {
  const catalog = createCatalog();
  const roomStore = new RoomStore();
  const created = roomStore.createRoom(catalog, {
    playerName: "Ash",
    settings: { mode: "versus" }
  });
  const joined = roomStore.joinRoom(created.roomCode, { playerName: "Misty" });
  assert.ok(joined);
  const { handler } = createRouteHandler(catalog, roomStore);
  const hostSocket = createFakeSocket();
  const guestSocket = createFakeSocket();

  await handler(hostSocket, {
    params: { roomId: created.roomId },
    query: { sessionToken: created.sessionToken }
  });
  await handler(guestSocket, {
    params: { roomId: created.roomId },
    query: { sessionToken: joined.sessionToken }
  });

  const current = created.snapshot.versusCurrent;
  assert.ok(current);

  await hostSocket.emit("message", Buffer.from(JSON.stringify({ type: "room:skip" })));
  assert.equal(hostSocket.messages.at(-1)?.type, "room:snapshot");
  assert.deepEqual(hostSocket.messages.at(-1)?.snapshot.versusSkipVotes, [created.playerId]);
  assert.equal(hostSocket.messages.at(-1)?.snapshot.versusCurrent, current);
  assert.equal(hostSocket.messages.at(-1)?.snapshot.events[0]?.type, "room_skip_voted");
  assert.equal(hostSocket.messages.at(-1)?.snapshot.events[0]?.skipCount, 1);

  await guestSocket.emit("message", Buffer.from(JSON.stringify({ type: "room:skip" })));
  assert.equal(hostSocket.messages.at(-1)?.type, "room:snapshot");
  assert.equal(guestSocket.messages.at(-1)?.type, "room:snapshot");
  assert.equal(hostSocket.messages.at(-1)?.snapshot.versusSkipVotes.length, 0);
  assert.notEqual(hostSocket.messages.at(-1)?.snapshot.versusCurrent, current);
  assert.equal(hostSocket.messages.at(-1)?.snapshot.events[0]?.type, "room_skipped");
  assert.equal(hostSocket.messages.at(-1)?.snapshot.events[1]?.type, "room_skip_voted");
});

test("registerRoomRealtime logs room leave before disconnect", async () => {
  const catalog = createCatalog();
  const roomStore = new RoomStore();
  const created = roomStore.createRoom(catalog, { playerName: "Ash" });
  const joined = roomStore.joinRoom(created.roomCode, { playerName: "Misty" });
  assert.ok(joined);
  const { handler, log } = createRouteHandler(catalog, roomStore);
  const socket = createFakeSocket();

  await handler(socket, {
    params: { roomId: created.roomId },
    query: { sessionToken: joined.sessionToken }
  });

  await socket.emit("message", Buffer.from(JSON.stringify({ type: "room:leave" })));

  assert.ok(log.entries.some((entry) => entry.message === "multiplayer room leave"));
  assert.ok(log.entries.some((entry) => entry.message === "multiplayer websocket disconnected"));
});

test("registerRoomRealtime rejects malformed messages", async () => {
  const catalog = createCatalog();
  const roomStore = new RoomStore();
  const created = roomStore.createRoom(catalog, { playerName: "Ash" });
  const { handler } = createRouteHandler(catalog, roomStore);
  const socket = createFakeSocket();

  await handler(socket, {
    params: { roomId: created.roomId },
    query: { sessionToken: created.sessionToken }
  });
  await socket.emit("message", Buffer.from("not json"));

  assert.equal(socket.messages.at(-1)?.type, "error");
  assert.equal(socket.messages.at(-1)?.code, "BAD_MESSAGE");
});

test("registerRoomRealtime rejects connections for missing rooms", async () => {
  const catalog = createCatalog();
  const { handler } = createRouteHandler(catalog);
  const socket = createFakeSocket();

  await handler(socket, {
    params: { roomId: "missing-room" },
    query: { sessionToken: "missing-session" }
  });

  assert.equal(socket.messages[0]?.type, "error");
  assert.equal(socket.messages[0]?.code, "ROOM_NOT_FOUND");
});
