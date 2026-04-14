export type MultiplayerMode = "race" | "coop" | "versus";
export type RoomStatus = "lobby" | "active" | "complete" | "closed";
export type PlayerConnectionStatus = "connected" | "disconnected";

export type GuessRejectReason =
  | "room_not_active"
  | "empty_guess"
  | "too_short"
  | "unknown"
  | "filtered_out"
  | "duplicate";

export interface RoomSettings {
  mode: MultiplayerMode;
  typoMode: "strict" | "normal" | "forgiving";
  autocorrect: boolean;
  outlinesOff: boolean;
  showDex: boolean;
  group: "none" | "generation" | "type";
  generations: string[];
  types: string[];
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  status: PlayerConnectionStatus;
  host: boolean;
  foundCount: number;
}

export interface RoomEvent {
  id: string;
  type: "guess_accepted" | "room_completed" | "room_reset" | "player_joined";
  playerId?: string;
  canonical?: string;
  label?: string;
  createdAt: string;
}

export interface RoomSnapshot {
  roomId: string;
  roomCode: string;
  status: RoomStatus;
  settings: RoomSettings;
  createdAt: string;
  lastActivityAt: string;
  timerStartedAt: string | null;
  players: PlayerSnapshot[];
  activeTotal: number;
  sharedFound: string[];
  playerFound: Record<string, string[]>;
  foundBy: Record<string, string>;
  versusCurrent: string | null;
  versusRevealed: boolean;
  versusAdvanceAt: string | null;
  events: RoomEvent[];
}

export interface CreateRoomRequest {
  playerName?: string;
  settings?: Partial<RoomSettings>;
}

export interface JoinRoomRequest {
  playerName?: string;
  sessionToken?: string;
}

export interface RoomJoinResponse {
  roomId: string;
  roomCode: string;
  playerId: string;
  sessionToken: string;
  snapshot: RoomSnapshot;
}

export type ClientMessage =
  | { type: "player:update"; name: string }
  | { type: "room:configure"; settings: Partial<RoomSettings> }
  | { type: "room:reset" }
  | { type: "guess:submit"; value: string; clientTs?: number }
  | { type: "room:leave" };

export type ServerMessage =
  | { type: "room:snapshot"; snapshot: RoomSnapshot }
  | { type: "player:joined"; snapshot: RoomSnapshot }
  | { type: "player:presence"; snapshot: RoomSnapshot }
  | {
      type: "guess:accepted";
      playerId: string;
      canonical: string;
      label: string;
      snapshot: RoomSnapshot;
    }
  | { type: "guess:rejected"; reason: GuessRejectReason; message: string }
  | { type: "room:complete"; snapshot: RoomSnapshot }
  | { type: "error"; code: string; message: string };

export function defaultRoomSettings(): RoomSettings {
  return {
    mode: "race",
    typoMode: "normal",
    autocorrect: true,
    outlinesOff: false,
    showDex: false,
    group: "generation",
    generations: [],
    types: []
  };
}
