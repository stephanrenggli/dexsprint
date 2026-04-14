import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { findExactGuess, type GuessEntry } from "../../../shared/src/guess.js";
import { findTypoMatch } from "../../../shared/src/typo-match.js";
import { normalizeGuess } from "../../../shared/src/text.js";
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
const DEFAULT_PERSISTENCE_DELAY_MS = 50;
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

interface PersistedPlayerRecord {
  id: string;
  sessionToken: string;
  name: string;
  host: boolean;
  connected: boolean;
  found: string[];
}

interface PersistedRoomRecord {
  id: string;
  code: string;
  status: RoomRecord["status"];
  createdAt: string;
  lastActivityAt: string;
  timerStartedAt: string | null;
  settings: RoomSettings;
  activeNames: string[];
  sharedFound: string[];
  foundBy: Record<string, string>;
  players: PersistedPlayerRecord[];
  events: RoomEvent[];
}

interface PersistedRoomStore {
  version: 1;
  rooms: PersistedRoomRecord[];
}

export interface RoomStoreOptions {
  persistencePath?: string | null;
  persistenceDelayMs?: number;
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

function isRoomStatus(value: unknown): value is RoomRecord["status"] {
  return value === "lobby" || value === "active" || value === "complete" || value === "closed";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isRoomEvent(value: unknown): value is RoomEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<RoomEvent>;
  return (
    typeof event.id === "string" &&
    typeof event.createdAt === "string" &&
    (event.type === "guess_accepted" ||
      event.type === "room_completed" ||
      event.type === "room_reset" ||
      event.type === "player_joined")
  );
}

function serializeRoom(room: RoomRecord): PersistedRoomRecord {
  return {
    id: room.id,
    code: room.code,
    status: room.status,
    createdAt: room.createdAt.toISOString(),
    lastActivityAt: room.lastActivityAt.toISOString(),
    timerStartedAt: room.timerStartedAt ? room.timerStartedAt.toISOString() : null,
    settings: room.settings,
    activeNames: [...room.activeNames],
    sharedFound: [...room.sharedFound],
    foundBy: Object.fromEntries(room.foundBy),
    players: [...room.players.values()].map((player) => ({
      id: player.id,
      sessionToken: player.sessionToken,
      name: player.name,
      host: player.host,
      connected: player.connected,
      found: [...player.found]
    })),
    events: room.events
  };
}

function deserializeRoom(
  record: PersistedRoomRecord,
  now: number,
  roomTtlMs: number
): RoomRecord | null {
  if (!record || typeof record !== "object") return null;
  if (!isRoomStatus(record.status)) return null;
  if (record.status === "closed") return null;
  if (typeof record.id !== "string" || typeof record.code !== "string") return null;
  if (typeof record.createdAt !== "string" || typeof record.lastActivityAt !== "string") return null;
  const createdAt = new Date(record.createdAt);
  const lastActivityAt = new Date(record.lastActivityAt);
  if (Number.isNaN(createdAt.getTime()) || Number.isNaN(lastActivityAt.getTime())) return null;
  if (now - lastActivityAt.getTime() >= roomTtlMs) return null;
  if (!record.settings || typeof record.settings !== "object") return null;
  if (!isStringArray(record.activeNames) || !isStringArray(record.sharedFound)) return null;
  if (!record.foundBy || typeof record.foundBy !== "object") return null;
  if (!Array.isArray(record.players) || !Array.isArray(record.events)) return null;

  const players = new Map<string, PlayerRecord>();
  record.players.forEach((player) => {
    if (!player || typeof player !== "object") return;
    if (
      typeof player.id !== "string" ||
      typeof player.sessionToken !== "string" ||
      typeof player.name !== "string" ||
      typeof player.host !== "boolean" ||
      !isStringArray(player.found)
    ) {
      return;
    }
    players.set(player.id, {
      id: player.id,
      sessionToken: player.sessionToken,
      name: player.name,
      host: player.host,
      connected: false,
      found: new Set(player.found)
    });
  });

  if (!players.size) return null;

  const events = record.events.filter(isRoomEvent).slice(0, MAX_EVENTS);
  const room: RoomRecord = {
    id: record.id,
    code: record.code,
    status: record.status,
    createdAt,
    lastActivityAt,
    timerStartedAt: record.timerStartedAt ? new Date(record.timerStartedAt) : null,
    settings: record.settings as RoomSettings,
    activeNames: new Set(record.activeNames),
    sharedFound: new Set(record.sharedFound),
    foundBy: new Map(
      Object.entries(record.foundBy).filter((entry): entry is [string, string] => {
        return typeof entry[0] === "string" && typeof entry[1] === "string";
      })
    ),
    players,
    events
  };

  if (room.timerStartedAt && Number.isNaN(room.timerStartedAt.getTime())) {
    room.timerStartedAt = null;
  }

  return room;
}

export class RoomStore {
  #roomsById = new Map<string, RoomRecord>();
  #roomIdByCode = new Map<string, string>();
  #persistPath: string | null;
  #persistDelayMs: number;
  #persistTimer: ReturnType<typeof setTimeout> | null = null;
  #persistInFlight: Promise<void> | null = null;
  #persistQueued = false;

  constructor(
    private readonly roomTtlMs = DEFAULT_ROOM_TTL_MS,
    options: RoomStoreOptions = {}
  ) {
    this.#persistPath = options.persistencePath === undefined ? null : options.persistencePath;
    this.#persistDelayMs = options.persistenceDelayMs ?? DEFAULT_PERSISTENCE_DELAY_MS;
  }

  async restorePersistedRooms(now = Date.now()): Promise<number> {
    if (!this.#persistPath) return 0;
    let text = "";
    try {
      text = await readFile(this.#persistPath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
      console.warn("Failed to read persisted multiplayer rooms", error);
      return 0;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      console.warn("Failed to parse persisted multiplayer rooms", error);
      return 0;
    }

    if (!parsed || typeof parsed !== "object" || (parsed as PersistedRoomStore).version !== 1) {
      return 0;
    }

    const snapshot = parsed as PersistedRoomStore;
    this.#roomsById.clear();
    this.#roomIdByCode.clear();

    snapshot.rooms.forEach((record) => {
      const room = deserializeRoom(record, now, this.roomTtlMs);
      if (!room) return;
      if (this.#roomsById.has(room.id) || this.#roomIdByCode.has(room.code)) return;
      this.#roomsById.set(room.id, room);
      this.#roomIdByCode.set(room.code, room.id);
    });

    await this.flushPersistence();
    return this.#roomsById.size;
  }

  async flushPersistence(): Promise<void> {
    if (!this.#persistPath) return;
    if (this.#persistTimer) {
      clearTimeout(this.#persistTimer);
      this.#persistTimer = null;
    }
    this.#persistQueued = true;
    await this.#drainPersistenceQueue();
  }

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
      status: "active",
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
    this.#schedulePersistence();

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
    this.#schedulePersistence();

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
    this.#schedulePersistence();
    return this.snapshot(room);
  }

  updatePlayer(room: RoomRecord, player: PlayerRecord, name: string): RoomSnapshot {
    player.name = makePlayerName(name, room, room.players.size);
    this.#touch(room);
    this.#schedulePersistence();
    return this.snapshot(room);
  }

  configureRoom(catalog: CatalogSnapshot, room: RoomRecord, player: PlayerRecord, settings: Partial<RoomSettings>): RoomSnapshot {
    if (!player.host) return this.snapshot(room);
    const previousStatus = room.status;
    room.settings = mergeSettings({ ...room.settings, ...settings });
    room.activeNames = new Set(filterCatalogEntries(catalog, room.settings).map((entry) => entry.canonical));
    const complete = this.#isComplete(room);
    if (room.status !== "lobby") {
      room.status = complete ? "complete" : "active";
    }
    if (complete && previousStatus !== "complete") {
      pushEvent(room, { type: "room_completed", playerId: player.id });
    }
    this.#touch(room);
    this.#schedulePersistence();
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
    this.#schedulePersistence();
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
    if (!canonical) {
      const normalized = normalizeGuess(trimmed);
      const typoMatch = findTypoMatch(
        [...room.activeNames]
          .map((name) => catalog.guessIndex.entries.get(name))
          .filter((entry): entry is GuessEntry => Boolean(entry)),
        normalized,
        room.settings.typoMode,
        defaultRoomSettings().typoMode
      );
      if (!typoMatch) return this.#reject("unknown", "Too far off.");
      if (!room.settings.autocorrect) {
        const typoEntry = catalog.guessIndex.entries.get(typoMatch);
        const typoLabel = typoEntry?.label || typoMatch;
        return this.#reject("unknown", `Did you mean ${typoLabel}?`);
      }
      if (!room.activeNames.has(typoMatch)) {
        return this.#reject("filtered_out", "That Pokemon is filtered out for this room.");
      }
      return this.#acceptGuess(catalog, room, player, typoMatch);
    }
    if (!room.activeNames.has(canonical)) {
      return this.#reject("filtered_out", "That Pokemon is filtered out for this room.");
    }

    return this.#acceptGuess(catalog, room, player, canonical);
  }

  #acceptGuess(
    catalog: CatalogSnapshot,
    room: RoomRecord,
    player: PlayerRecord,
    canonical: string
  ): GuessResult {
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
    this.#schedulePersistence();

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
    if (removed > 0) this.#schedulePersistence();
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

  #schedulePersistence(): void {
    if (!this.#persistPath) return;
    this.#persistQueued = true;
    if (this.#persistTimer || this.#persistInFlight) return;
    this.#persistTimer = setTimeout(() => {
      this.#persistTimer = null;
      void this.#drainPersistenceQueue();
    }, this.#persistDelayMs);
  }

  async #drainPersistenceQueue(): Promise<void> {
    if (!this.#persistPath || !this.#persistQueued) return;
    if (this.#persistInFlight) {
      await this.#persistInFlight;
      return this.#drainPersistenceQueue();
    }
    this.#persistQueued = false;
    this.#persistInFlight = this.#writePersistedRooms()
      .catch((error) => {
        console.warn("Failed to persist multiplayer rooms", error);
      })
      .finally(() => {
        this.#persistInFlight = null;
      });
    await this.#persistInFlight;
    if (this.#persistQueued) {
      return this.#drainPersistenceQueue();
    }
  }

  async #writePersistedRooms(): Promise<void> {
    if (!this.#persistPath) return;
    const snapshot: PersistedRoomStore = {
      version: 1,
      rooms: [...this.#roomsById.values()]
        .map((room) => serializeRoom(room))
        .sort((left, right) => left.code.localeCompare(right.code))
    };
    await mkdir(path.dirname(this.#persistPath), { recursive: true });
    const tempPath = `${this.#persistPath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    await rename(tempPath, this.#persistPath);
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
