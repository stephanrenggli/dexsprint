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

type RouteHandler = (socket: ReturnType<typeof createFakeSocket>, request: any) => Promise<void>;

function createRouteHandler(catalog: CatalogSnapshot, roomStore = new RoomStore()): {
  handler: RouteHandler;
  roomStore: RoomStore;
} {
  let routeHandler: RouteHandler | null = null;
  const app = {
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
  return { handler: routeHandler, roomStore };
}

test("registerRoomRealtime wires room snapshots, guesses, resets, and disconnects", async () => {
  const catalog = createCatalog();
  const roomStore = new RoomStore();
  const created = roomStore.createRoom(catalog, { playerName: "Ash" });
  const joined = roomStore.joinRoom(created.roomCode, { playerName: "Misty" });
  assert.ok(joined);
  const { handler } = createRouteHandler(catalog, roomStore);
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
        settings: { mode: "coop", outlinesOff: true }
      })
    )
  );
  const configuredRoom = roomStore.getRoomById(created.roomId);
  assert.equal(configuredRoom?.settings.mode, "coop");
  assert.equal(configuredRoom?.settings.outlinesOff, true);

  await guestSocket.emit(
    "message",
    Buffer.from(
      JSON.stringify({
        type: "room:configure",
        settings: { mode: "race", outlinesOff: false }
      })
    )
  );
  const afterGuestConfigure = roomStore.getRoomById(created.roomId);
  assert.equal(afterGuestConfigure?.settings.mode, "coop");
  assert.equal(afterGuestConfigure?.settings.outlinesOff, true);

  await hostSocket.emit("message", Buffer.from(JSON.stringify({ type: "room:start" })));
  assert.equal(hostSocket.messages.at(-1)?.type, "room:snapshot");
  assert.equal(hostSocket.messages.at(-1)?.snapshot.status, "active");
  assert.equal(guestSocket.messages.at(-1)?.snapshot.status, "active");

  await hostSocket.emit(
    "message",
    Buffer.from(JSON.stringify({ type: "guess:submit", value: "Bulbasaur" }))
  );
  assert.equal(hostSocket.messages.at(-1)?.type, "guess:accepted");
  assert.equal(guestSocket.messages.at(-1)?.type, "guess:accepted");
  assert.equal(hostSocket.messages.at(-1)?.snapshot.playerFound[created.playerId]?.[0], "bulbasaur");

  await hostSocket.emit("message", Buffer.from(JSON.stringify({ type: "room:reset" })));
  assert.equal(hostSocket.messages.at(-1)?.type, "room:snapshot");
  assert.equal(hostSocket.messages.at(-1)?.snapshot.sharedFound.length, 0);
  assert.equal(hostSocket.messages.at(-1)?.snapshot.events.length, 0);

  hostSocket.close();
  assert.equal(guestSocket.messages.at(-1)?.type, "player:presence");
  assert.equal(guestSocket.messages.at(-1)?.snapshot.players[0]?.status, "disconnected");
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
