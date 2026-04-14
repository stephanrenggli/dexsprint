import assert from "node:assert/strict";
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

test("RoomStore creates and joins private rooms", () => {
  const store = new RoomStore();
  const created = store.createRoom(createCatalog(), { playerName: "Ash" });
  const joined = store.joinRoom(created.roomCode, { playerName: "Misty" });

  assert.equal(created.snapshot.players.length, 1);
  assert.equal(created.snapshot.status, "active");
  assert.equal(joined?.snapshot.players.length, 2);
  assert.equal(joined?.snapshot.status, "active");
});

test("RoomStore uses trainer names for blank player names", () => {
  const store = new RoomStore();
  const created = store.createRoom(createCatalog(), {});
  const joined = store.joinRoom(created.roomCode, {});

  assert.ok(created.snapshot.players[0]?.name);
  assert.notEqual(created.snapshot.players[0]?.name, "Player 1");
  assert.ok(joined?.snapshot.players[1]?.name);
  assert.notEqual(joined?.snapshot.players[1]?.name, "Player 2");
});

test("RoomStore only lets the host configure room settings", () => {
  const store = new RoomStore();
  const created = store.createRoom(createCatalog(), { playerName: "Ash" });
  const joined = store.joinRoom(created.roomCode, { playerName: "Misty" });
  assert.ok(joined);

  const room = store.getRoomById(created.roomId);
  assert.ok(room);
  const host = store.findPlayer(room, created.sessionToken);
  const guest = store.findPlayer(room, joined.sessionToken);
  assert.ok(host);
  assert.ok(guest);

  const before = store.snapshot(room);
  const after = store.configureRoom(createCatalog(), room, guest, {
    mode: "coop",
    generations: ["generation-i"]
  });

  assert.deepEqual(after.settings, before.settings);
  assert.equal(after.activeTotal, before.activeTotal);
  assert.equal(after.status, before.status);
});

test("RoomStore lets the host update active-room settings", () => {
  const store = new RoomStore();
  const created = store.createRoom(createCatalog(), {
    playerName: "Ash",
    settings: { typoMode: "strict", autocorrect: false }
  });
  const room = store.getRoomById(created.roomId);
  assert.ok(room);
  const host = store.findPlayer(room, created.sessionToken);
  assert.ok(host);

  const before = store.snapshot(room);
  const after = store.configureRoom(createCatalog(), room, host, {
    typoMode: "forgiving",
    autocorrect: true,
    outlinesOff: true,
    showDex: true
  });

  assert.equal(after.settings.typoMode, "forgiving");
  assert.equal(after.settings.autocorrect, true);
  assert.equal(after.settings.outlinesOff, true);
  assert.equal(after.settings.showDex, true);
  assert.equal(after.settings.mode, before.settings.mode);
});

test("RoomStore marks the room complete when live filters leave only found Pokemon", () => {
  const catalog = createCatalog();
  const store = new RoomStore();
  const created = store.createRoom(catalog, {
    playerName: "Ash",
    settings: { mode: "coop" }
  });
  const room = store.getRoomById(created.roomId);
  assert.ok(room);
  const host = store.findPlayer(room, created.sessionToken);
  assert.ok(host);

  const first = store.submitGuess(catalog, room, host, "Bulbasaur");
  assert.equal(first.accepted, true);

  const after = store.configureRoom(catalog, room, host, {
    types: ["grass"]
  });

  assert.equal(after.status, "complete");
  assert.equal(after.events[0]?.type, "room_completed");
  assert.equal(after.events[0]?.playerId, host.id);
});

test("RoomStore applies multiplayer typo settings to guess acceptance", () => {
  const catalog = createCatalog();
  const store = new RoomStore();
  const created = store.createRoom(catalog, {
    playerName: "Ash",
    settings: { typoMode: "normal", autocorrect: true }
  });
  const room = store.getRoomById(created.roomId);
  assert.ok(room);
  const host = store.findPlayer(room, created.sessionToken);
  assert.ok(host);

  const accepted = store.submitGuess(catalog, room, host, "Bulbasar");

  assert.equal(accepted.accepted, true);
  assert.equal(accepted.accepted && accepted.canonical, "bulbasaur");

  const strictRoom = store.createRoom(catalog, {
    playerName: "Misty",
    settings: { typoMode: "strict", autocorrect: false }
  });
  const strict = store.getRoomById(strictRoom.roomId);
  assert.ok(strict);
  const strictHost = store.findPlayer(strict, strictRoom.sessionToken);
  assert.ok(strictHost);

  const rejected = store.submitGuess(catalog, strict, strictHost, "Bulbasar");

  assert.equal(rejected.accepted, false);
  assert.equal(rejected.reason, "unknown");
  assert.equal(rejected.message, "Too far off.");

  const suggestRoom = store.createRoom(catalog, {
    playerName: "Brock",
    settings: { typoMode: "normal", autocorrect: false }
  });
  const suggest = store.getRoomById(suggestRoom.roomId);
  assert.ok(suggest);
  const suggestHost = store.findPlayer(suggest, suggestRoom.sessionToken);
  assert.ok(suggestHost);

  const suggestion = store.submitGuess(catalog, suggest, suggestHost, "Bulbasar");

  assert.equal(suggestion.accepted, false);
  assert.equal(suggestion.reason, "unknown");
  assert.match(suggestion.message, /Did you mean/i);
});

test("RoomStore accepts server-authoritative race guesses", () => {
  const catalog = createCatalog();
  const store = new RoomStore();
  const created = store.createRoom(catalog, { playerName: "Ash" });
  const room = store.getRoomById(created.roomId);
  assert.ok(room);
  const player = store.findPlayer(room, created.sessionToken);
  assert.ok(player);

  const result = store.submitGuess(catalog, room, player, "Bisasam");

  assert.equal(result.accepted, true);
  assert.equal(result.accepted && result.canonical, "bulbasaur");
  assert.equal(result.accepted && result.snapshot.players[0]?.foundCount, 1);
  assert.ok(result.accepted && result.snapshot.timerStartedAt);
});

test("RoomStore shares co-op progress across players", () => {
  const catalog = createCatalog();
  const store = new RoomStore();
  const created = store.createRoom(catalog, {
    playerName: "Ash",
    settings: { mode: "coop" }
  });
  const joined = store.joinRoom(created.roomCode, { playerName: "Misty" });
  assert.ok(joined);

  const room = store.getRoomById(created.roomId);
  assert.ok(room);
  const host = store.findPlayer(room, created.sessionToken);
  const guest = store.findPlayer(room, joined.sessionToken);
  assert.ok(host);
  assert.ok(guest);

  const first = store.submitGuess(catalog, room, host, "Bulbasaur");
  const duplicate = store.submitGuess(catalog, room, guest, "Bulbasaur");

  assert.equal(first.accepted, true);
  assert.deepEqual(first.accepted && first.snapshot.sharedFound, ["bulbasaur"]);
  assert.equal(first.accepted && first.snapshot.players[0]?.foundCount, 1);
  assert.equal(first.accepted && first.snapshot.foundBy.bulbasaur, host.id);
  assert.equal(duplicate.accepted, false);
  assert.equal(!duplicate.accepted && duplicate.reason, "duplicate");
});

test("RoomStore resets multiplayer progress for the host", () => {
  const catalog = createCatalog();
  const store = new RoomStore();
  const created = store.createRoom(catalog, {
    playerName: "Ash",
    settings: { mode: "coop" }
  });
  const joined = store.joinRoom(created.roomCode, { playerName: "Misty" });
  assert.ok(joined);

  const room = store.getRoomById(created.roomId);
  assert.ok(room);
  const host = store.findPlayer(room, created.sessionToken);
  const guest = store.findPlayer(room, joined.sessionToken);
  assert.ok(host);
  assert.ok(guest);

  const first = store.submitGuess(catalog, room, host, "Bulbasaur");
  assert.equal(first.accepted, true);

  const reset = store.resetRoom(room, host);

  assert.equal(reset.status, "active");
  assert.equal(reset.timerStartedAt, null);
  assert.deepEqual(reset.sharedFound, []);
  assert.deepEqual(reset.events, []);
  assert.deepEqual(reset.playerFound[host.id], []);
  assert.deepEqual(reset.playerFound[guest.id], []);
  assert.equal(reset.foundBy.bulbasaur, undefined);
  assert.equal(reset.players[0]?.foundCount, 0);
  assert.equal(reset.players[1]?.foundCount, 0);
});

test("RoomStore marks players disconnected on disconnect and preserves room state", () => {
  const store = new RoomStore();
  const created = store.createRoom(createCatalog(), { playerName: "Ash" });
  const joined = store.joinRoom(created.roomCode, { playerName: "Misty" });

  assert.ok(joined);
  const room = store.getRoomById(created.roomId);
  assert.ok(room);
  const host = store.findPlayer(room, created.sessionToken);
  assert.ok(host);
  const guest = store.findPlayer(room, joined.sessionToken);
  assert.ok(guest);

  const nextSnapshot = store.markConnected(room, host, false);

  assert.equal(nextSnapshot.players.length, 2);
  assert.equal(nextSnapshot.players[0]?.name, "Ash");
  assert.equal(nextSnapshot.players[0]?.status, "disconnected");
  assert.equal(nextSnapshot.players[1]?.name, "Misty");
  assert.equal(nextSnapshot.players[1]?.host, false);

  const rejoined = store.joinRoom(created.roomCode, {
    sessionToken: created.sessionToken,
    playerName: "Ash"
  });

  assert.ok(rejoined);
  assert.equal(rejoined?.snapshot.players[0]?.id, host.id);
  assert.equal(rejoined?.snapshot.players[0]?.host, true);
  assert.equal(rejoined?.snapshot.players[0]?.status, "connected");
  assert.equal(rejoined?.snapshot.players[0]?.name, "Ash");
});

test("RoomStore starts rooms immediately when created", () => {
  const store = new RoomStore();
  const created = store.createRoom(createCatalog(), { playerName: "Ash" });
  const joined = store.joinRoom(created.roomCode, { playerName: "Misty" });

  assert.ok(joined);
  const room = store.getRoomById(created.roomId);
  assert.ok(room);
  assert.equal(room.status, "active");
  assert.equal(room.events.length, 2);
  assert.deepEqual(
    room.events.map((event) => event.type),
    ["player_joined", "player_joined"]
  );
});
