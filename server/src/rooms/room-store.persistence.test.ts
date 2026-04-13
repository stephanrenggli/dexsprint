import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildGuessIndex } from "../../../shared/src/guess.js";
import type { CatalogSnapshot } from "../catalog/catalog.js";
import { RoomStore } from "./room-store.js";

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

test("RoomStore restores persisted rooms and reconnects players after restart", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "dexsprint-room-store-"));
  const cachePath = path.join(cacheDir, "rooms.json");

  try {
    const catalog = createCatalog();
    const store = new RoomStore(undefined, {
      persistencePath: cachePath,
      persistenceDelayMs: 0
    });
    const created = store.createRoom(catalog, {
      playerName: "Ash",
      settings: { mode: "coop" }
    });
    const joined = store.joinRoom(created.roomCode, { playerName: "Misty" });
    assert.ok(joined);

    const room = store.getRoomById(created.roomId);
    assert.ok(room);
    const host = store.findPlayer(room, created.sessionToken);
    assert.ok(host);

    store.startRoom(room, host);
    const guess = store.submitGuess(catalog, room, host, "Bulbasaur");
    assert.equal(guess.accepted, true);

    await store.flushPersistence();

    const restartedStore = new RoomStore(undefined, {
      persistencePath: cachePath,
      persistenceDelayMs: 0
    });
    const restoredCount = await restartedStore.restorePersistedRooms();

    assert.equal(restoredCount, 1);
    const restoredRoom = restartedStore.getRoomById(created.roomId);
    assert.ok(restoredRoom);
    assert.equal(restartedStore.snapshot(restoredRoom).status, "active");
    assert.deepEqual(restartedStore.snapshot(restoredRoom).sharedFound, ["bulbasaur"]);
    assert.equal(restartedStore.snapshot(restoredRoom).players.every((player) => player.status === "disconnected"), true);

    const rejoined = restartedStore.joinRoom(created.roomCode, {
      sessionToken: created.sessionToken,
      playerName: "Ash"
    });

    assert.ok(rejoined);
    assert.equal(rejoined?.snapshot.players[0]?.id, host.id);
    assert.equal(rejoined?.snapshot.players[0]?.status, "connected");
    assert.equal(rejoined?.snapshot.players[0]?.host, true);

    const restoredHost = restartedStore.findPlayer(restoredRoom, created.sessionToken);
    assert.ok(restoredHost);
    const configured = restartedStore.configureRoom(catalog, restoredRoom, restoredHost, {
      outlinesOff: true,
      showDex: true
    });

    assert.equal(configured.settings.outlinesOff, true);
    assert.equal(configured.settings.showDex, true);
    await restartedStore.flushPersistence();
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("RoomStore skips expired persisted rooms and ignores corrupt snapshots", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "dexsprint-room-store-expired-"));
  const cachePath = path.join(cacheDir, "rooms.json");

  try {
    const store = new RoomStore(1000, {
      persistencePath: cachePath,
      persistenceDelayMs: 0
    });
    const created = store.createRoom(createCatalog(), { playerName: "Ash" });
    await store.flushPersistence();

    const expiredStore = new RoomStore(1000, {
      persistencePath: cachePath,
      persistenceDelayMs: 0
    });
    const restoredCount = await expiredStore.restorePersistedRooms(Date.now() + 5000);
    assert.equal(restoredCount, 0);
    assert.equal(expiredStore.getRoomById(created.roomId), null);

    await writeFile(cachePath, "not valid json", "utf8");

    const corruptStore = new RoomStore(undefined, {
      persistencePath: cachePath,
      persistenceDelayMs: 0
    });
    const corruptCount = await corruptStore.restorePersistedRooms();
    assert.equal(corruptCount, 0);
    assert.equal(corruptStore.getRoomById(created.roomId), null);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});
