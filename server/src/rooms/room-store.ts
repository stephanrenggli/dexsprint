import { randomBytes, randomUUID } from "node:crypto";
import { findExactGuess } from "../../../shared/src/guess.js";
import {
  defaultRoomSettings,
  type CreateRoomRequest,
  type GuessRejectReason,
  type JoinRoomRequest,
  type MultiplayerMode,
  type PlayerSnapshot,
  type RoomEvent,
  type RoomJoinResponse,
  type RoomSettings,
  type RoomSnapshot
} from "../../../shared/src/protocol.js";
import { filterCatalogEntries, type CatalogSnapshot } from "../catalog/catalog.js";

const ROOM_CODE_BYTES = 4;
const MAX_EVENTS = 25;
const DEFAULT_ROOM_TTL_MS = 60 * 60 * 1000;
const TRAINER_NAMES = [
  "Ash",
  "Misty",
  "Brock",
  "Gary",
  "May",
  "Dawn",
  "Iris",
  "Cilan",
  "Serena",
  "Kiawe",
  "Lillie",
  "Goh",
  "Leon",
  "Nemona"
];

interface PlayerRecord {
  id: string;
  sessionToken: string;
  name: string;
  host: boolean;
  connected: boolean;
  found: Set<string>;
}

interface RoomRecord {
  id: string;
  code: string;
  status: "lobby" | "active" | "complete" | "closed";
  createdAt: Date;
  lastActivityAt: Date;
  timerStartedAt: Date | null;
  settings: RoomSettings;
  activeNames: Set<string>;
  sharedFound: Set<string>;
  foundBy: Map<string, string>;
  players: Map<string, PlayerRecord>;
  events: RoomEvent[];
}

export interface GuessAcceptedResult {
  accepted: true;
  playerId: string;
  canonical: string;
  label: string;
  complete: boolean;
  snapshot: RoomSnapshot;
}

export interface GuessRejectedResult {
  accepted: false;
  reason: GuessRejectReason;
  message: string;
}

export type GuessResult = GuessAcceptedResult | GuessRejectedResult;

function makeRoomCode(): string {
  return randomBytes(ROOM_CODE_BYTES).toString("base64url").toUpperCase();
}

function makePlayerName(name: string | undefined, room: RoomRecord | null, count: number): string {
  const trimmed = (name || "").trim();
  if (trimmed) return trimmed;
  const usedNames = new Set(
    Array.from(room?.players.values() ?? [], (player) => player.name.toLowerCase())
  );
  const start = randomBytes(1)[0] % TRAINER_NAMES.length;
  for (let offset = 0; offset < TRAINER_NAMES.length; offset += 1) {
    const candidate = TRAINER_NAMES[(start + offset) % TRAINER_NAMES.length];
    if (!usedNames.has(candidate.toLowerCase())) return candidate;
  }
  return `Trainer ${count}`;
}

function mergeSettings(settings?: Partial<RoomSettings>): RoomSettings {
  const defaults = defaultRoomSettings();
  const mode: MultiplayerMode = settings?.mode === "coop" ? "coop" : "race";
  return {
    ...defaults,
    ...settings,
    mode,
    typoMode: settings?.typoMode || defaults.typoMode,
    autocorrect: settings?.autocorrect ?? defaults.autocorrect,
    outlinesOff: settings?.outlinesOff ?? defaults.outlinesOff,
    showDex: settings?.showDex ?? defaults.showDex,
    group: settings?.group || defaults.group,
    generations: Array.isArray(settings?.generations) ? settings.generations : defaults.generations,
    types: Array.isArray(settings?.types) ? settings.types : defaults.types
  };
}

function pushEvent(room: RoomRecord, event: Omit<RoomEvent, "id" | "createdAt">): void {
  room.events.unshift({
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...event
  });
  room.events = room.events.slice(0, MAX_EVENTS);
}

export class RoomStore {
  #roomsById = new Map<string, RoomRecord>();
  #roomIdByCode = new Map<string, string>();

  constructor(private readonly roomTtlMs = DEFAULT_ROOM_TTL_MS) {}

  createRoom(catalog: CatalogSnapshot, request: CreateRoomRequest = {}): RoomJoinResponse {
    const roomId = randomUUID();
    let roomCode = makeRoomCode();
    while (this.#roomIdByCode.has(roomCode)) roomCode = makeRoomCode();

    const settings = mergeSettings(request.settings);
    const activeEntries = filterCatalogEntries(catalog, settings);
    const player = this.#createPlayer(request.playerName, null, true, 1);
    const now = new Date();
    const room: RoomRecord = {
      id: roomId,
      code: roomCode,
      status: "lobby",
      createdAt: now,
      lastActivityAt: now,
      timerStartedAt: null,
      settings,
      activeNames: new Set(activeEntries.map((entry) => entry.canonical)),
      sharedFound: new Set(),
      foundBy: new Map(),
      players: new Map([[player.id, player]]),
      events: []
    };

    pushEvent(room, { type: "player_joined", playerId: player.id });
    this.#roomsById.set(room.id, room);
    this.#roomIdByCode.set(room.code, room.id);

    return this.#joinResponse(room, player);
  }

  joinRoom(roomCode: string, request: JoinRoomRequest = {}): RoomJoinResponse | null {
    const room = this.getRoomByCode(roomCode);
    if (!room || room.status === "closed") return null;

    const existing = request.sessionToken
      ? [...room.players.values()].find((player) => player.sessionToken === request.sessionToken)
      : null;
    const player = existing || this.#createPlayer(request.playerName, room, false, room.players.size + 1);
    player.connected = true;
    if (request.playerName) player.name = makePlayerName(request.playerName, room, room.players.size + 1);
    room.players.set(player.id, player);
    this.#touch(room);

    if (!existing) pushEvent(room, { type: "player_joined", playerId: player.id });
    return this.#joinResponse(room, player);
  }

  getRoomById(roomId: string): RoomRecord | null {
    return this.#roomsById.get(roomId) || null;
  }

  getRoomByCode(roomCode: string): RoomRecord | null {
    const roomId = this.#roomIdByCode.get(roomCode.toUpperCase());
    return roomId ? this.getRoomById(roomId) : null;
  }

  findPlayer(room: RoomRecord, sessionToken: string): PlayerRecord | null {
    return [...room.players.values()].find((player) => player.sessionToken === sessionToken) || null;
  }

  markConnected(room: RoomRecord, player: PlayerRecord, connected: boolean): RoomSnapshot {
    player.connected = connected;
    this.#touch(room);
    return this.snapshot(room);
  }

  updatePlayer(room: RoomRecord, player: PlayerRecord, name: string): RoomSnapshot {
    player.name = makePlayerName(name, room, room.players.size);
    this.#touch(room);
    return this.snapshot(room);
  }

  configureRoom(catalog: CatalogSnapshot, room: RoomRecord, player: PlayerRecord, settings: Partial<RoomSettings>): RoomSnapshot {
    if (!player.host) return this.snapshot(room);
    if (room.status === "lobby") {
      room.settings = mergeSettings({ ...room.settings, ...settings });
      room.activeNames = new Set(
        filterCatalogEntries(catalog, room.settings).map((entry) => entry.canonical)
      );
    } else {
      room.settings = mergeSettings({
        ...room.settings,
        outlinesOff: settings.outlinesOff ?? room.settings.outlinesOff,
        showDex: settings.showDex ?? room.settings.showDex
      });
    }
    this.#touch(room);
    return this.snapshot(room);
  }

  startRoom(room: RoomRecord, player: PlayerRecord): RoomSnapshot {
    if (player.host && room.status === "lobby") {
      room.status = "active";
      pushEvent(room, { type: "room_started", playerId: player.id });
      this.#touch(room);
    }
    return this.snapshot(room);
  }

  resetRoom(room: RoomRecord, player: PlayerRecord): RoomSnapshot {
    if (!player.host) return this.snapshot(room);

    room.sharedFound.clear();
    room.foundBy.clear();
    room.events = [];
    room.players.forEach((entry) => {
      entry.found.clear();
    });
    room.timerStartedAt = null;
    if (room.status !== "lobby") room.status = "active";
    this.#touch(room);
    return this.snapshot(room);
  }

  submitGuess(catalog: CatalogSnapshot, room: RoomRecord, player: PlayerRecord, value: string): GuessResult {
    if (room.status !== "active") {
      return this.#reject("room_not_active", "The room has not started yet.");
    }

    const trimmed = value.trim();
    if (!trimmed) return this.#reject("empty_guess", "Enter a Pokemon name.");
    if (trimmed.length < 3) return this.#reject("too_short", "That guess is too short.");

    const canonical = findExactGuess(catalog.guessIndex, trimmed);
    if (!canonical) return this.#reject("unknown", "Too far off.");
    if (!room.activeNames.has(canonical)) {
      return this.#reject("filtered_out", "That Pokemon is filtered out for this room.");
    }

    const foundSet = room.settings.mode === "coop" ? room.sharedFound : player.found;
    if (foundSet.has(canonical)) {
      return this.#reject("duplicate", "That Pokemon is already found.");
    }
    foundSet.add(canonical);
    if (room.settings.mode === "coop") {
      player.found.add(canonical);
    }
    if (!room.timerStartedAt) {
      room.timerStartedAt = new Date();
    }
    if (!room.foundBy.has(canonical)) {
      room.foundBy.set(canonical, player.id);
    }
    const entry = catalog.guessIndex.entries.get(canonical);
    const label = entry?.label || canonical;
    const complete = this.#isComplete(room);
    if (complete) room.status = "complete";

    pushEvent(room, {
      type: complete ? "room_completed" : "guess_accepted",
      playerId: player.id,
      canonical,
      label
    });
    this.#touch(room);

    return {
      accepted: true,
      playerId: player.id,
      canonical,
      label,
      complete,
      snapshot: this.snapshot(room)
    };
  }

  snapshot(room: RoomRecord): RoomSnapshot {
    const players = [...room.players.values()].map((player): PlayerSnapshot => ({
      id: player.id,
      name: player.name,
      status: player.connected ? "connected" : "disconnected",
      host: player.host,
      foundCount: player.found.size
    }));

    return {
      roomId: room.id,
      roomCode: room.code,
      status: room.status,
      settings: room.settings,
      createdAt: room.createdAt.toISOString(),
      lastActivityAt: room.lastActivityAt.toISOString(),
      timerStartedAt: room.timerStartedAt ? room.timerStartedAt.toISOString() : null,
      players,
      activeTotal: room.activeNames.size,
      sharedFound: [...room.sharedFound],
      playerFound: Object.fromEntries(
        [...room.players.values()].map((player) => [player.id, [...player.found]])
      ),
      foundBy: Object.fromEntries(room.foundBy),
      events: room.events
    };
  }

  cleanupExpired(now = Date.now()): number {
    let removed = 0;
    for (const room of this.#roomsById.values()) {
      if (now - room.lastActivityAt.getTime() < this.roomTtlMs) continue;
      this.#roomsById.delete(room.id);
      this.#roomIdByCode.delete(room.code);
      removed += 1;
    }
    return removed;
  }

  #createPlayer(name: string | undefined, room: RoomRecord | null, host: boolean, count: number): PlayerRecord {
    return {
      id: randomUUID(),
      sessionToken: randomUUID(),
      name: makePlayerName(name, room, count),
      host,
      connected: true,
      found: new Set()
    };
  }

  #joinResponse(room: RoomRecord, player: PlayerRecord): RoomJoinResponse {
    return {
      roomId: room.id,
      roomCode: room.code,
      playerId: player.id,
      sessionToken: player.sessionToken,
      snapshot: this.snapshot(room)
    };
  }

  #touch(room: RoomRecord): void {
    room.lastActivityAt = new Date();
  }

  #isComplete(room: RoomRecord): boolean {
    if (room.activeNames.size === 0) return false;
    if (room.settings.mode === "coop") return room.sharedFound.size >= room.activeNames.size;
    return [...room.players.values()].some((player) => player.found.size >= room.activeNames.size);
  }

  #reject(reason: GuessRejectReason, message: string): GuessRejectedResult {
    return { accepted: false, reason, message };
  }
}

export type RoomRecordHandle = NonNullable<ReturnType<RoomStore["getRoomById"]>>;
export type PlayerRecordHandle = NonNullable<ReturnType<RoomStore["findPlayer"]>>;
