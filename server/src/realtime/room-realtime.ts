import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type { ClientMessage, ServerMessage } from "../../../shared/src/protocol.js";
import type { CatalogStore } from "../catalog/catalog-store.js";
import type { RoomStore } from "../rooms/room-store.js";

interface RoomSocketClient {
  socket: WebSocket;
  roomId: string;
  playerId: string;
}

const clientsByRoom = new Map<string, Set<RoomSocketClient>>();

function summarizeRoom(roomStore: RoomStore, room: ReturnType<RoomStore["getRoomById"]>) {
  if (!room) return null;
  const snapshot = roomStore.snapshot(room);
  return {
    roomId: snapshot.roomId,
    roomCode: snapshot.roomCode,
    status: snapshot.status,
    hostId: snapshot.players.find((player) => player.host)?.id || null,
    playerCount: snapshot.players.length,
    activeTotal: snapshot.activeTotal,
    sharedFoundCount: snapshot.sharedFound.length,
    foundByCount: Object.keys(snapshot.foundBy).length,
    timerStartedAt: snapshot.timerStartedAt,
    playerFoundCounts: Object.fromEntries(
      Object.entries(snapshot.playerFound).map(([playerId, found]) => [playerId, found.length])
    )
  };
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify(message));
}

function broadcast(roomId: string, message: ServerMessage): void {
  const clients = clientsByRoom.get(roomId);
  if (!clients) return;
  clients.forEach((client) => send(client.socket, message));
}

function parseClientMessage(raw: Buffer | ArrayBuffer | Buffer[]): ClientMessage | null {
  try {
    const buffer = Array.isArray(raw)
      ? Buffer.concat(raw)
      : raw instanceof ArrayBuffer
        ? Buffer.from(new Uint8Array(raw))
        : raw;
    const text = buffer.toString("utf8");
    const parsed = JSON.parse(text);
    return parsed && typeof parsed.type === "string" ? (parsed as ClientMessage) : null;
  } catch {
    return null;
  }
}

export function registerRoomRealtime({
  app,
  catalogStore,
  roomStore
}: {
  app: FastifyInstance;
  catalogStore: CatalogStore;
  roomStore: RoomStore;
}): void {
  const log = app.log;

  app.get("/ws/rooms/:roomId", { websocket: true }, async (socket, request) => {
    const { roomId } = request.params as { roomId: string };
    const { sessionToken } = request.query as { sessionToken?: string };
    const room = roomStore.getRoomById(roomId);
    const player = room && sessionToken ? roomStore.findPlayer(room, sessionToken) : null;

    if (!room || !player) {
      log.warn(
        { roomId, hasSessionToken: Boolean(sessionToken), room: summarizeRoom(roomStore, room) },
        "multiplayer websocket connection rejected"
      );
      send(socket, { type: "error", code: "ROOM_NOT_FOUND", message: "Room not found." });
      socket.close();
      return;
    }

    const client: RoomSocketClient = { socket, roomId: room.id, playerId: player.id };
    if (!clientsByRoom.has(room.id)) clientsByRoom.set(room.id, new Set());
    clientsByRoom.get(room.id)?.add(client);

    const snapshot = roomStore.markConnected(room, player, true);
    log.info(
      {
        roomId: snapshot.roomId,
        roomCode: snapshot.roomCode,
        playerId: player.id,
        host: player.host,
        room: summarizeRoom(roomStore, room)
      },
      "multiplayer websocket connected"
    );
    broadcast(room.id, { type: "player:presence", snapshot });
    send(socket, { type: "room:snapshot", snapshot });

    socket.on("message", async (raw) => {
      const message = parseClientMessage(raw);
      if (!message) {
        log.warn(
          {
            roomId: room.id,
            playerId: player.id,
            room: summarizeRoom(roomStore, room)
          },
          "multiplayer websocket bad message"
        );
        send(socket, { type: "error", code: "BAD_MESSAGE", message: "Invalid realtime message." });
        return;
      }

      const currentRoom = roomStore.getRoomById(room.id);
      const currentPlayer = currentRoom ? roomStore.findPlayer(currentRoom, player.sessionToken) : null;
      if (!currentRoom || !currentPlayer) {
        log.warn(
          {
            roomId: room.id,
            playerId: player.id,
            messageType: message.type,
            room: summarizeRoom(roomStore, currentRoom)
          },
          "multiplayer websocket room missing"
        );
        send(socket, { type: "error", code: "ROOM_NOT_FOUND", message: "Room not found." });
        return;
      }

      if (message.type === "player:update") {
        const nextSnapshot = roomStore.updatePlayer(currentRoom, currentPlayer, message.name);
        log.info(
          {
            roomId: nextSnapshot.roomId,
            roomCode: nextSnapshot.roomCode,
            playerId: currentPlayer.id,
            host: currentPlayer.host,
            room: summarizeRoom(roomStore, currentRoom)
          },
          "multiplayer player updated"
        );
        broadcast(currentRoom.id, { type: "player:presence", snapshot: nextSnapshot });
        return;
      }

      if (message.type === "room:configure") {
        if (!currentPlayer.host) {
          log.warn(
            {
              roomId: currentRoom.id,
              playerId: currentPlayer.id,
              messageType: message.type,
              room: summarizeRoom(roomStore, currentRoom)
            },
            "multiplayer room configure rejected"
          );
          return;
        }
        const catalog = await catalogStore.getCatalog();
        const nextSnapshot = roomStore.configureRoom(catalog, currentRoom, currentPlayer, message.settings);
        log.info(
          {
            roomId: nextSnapshot.roomId,
            roomCode: nextSnapshot.roomCode,
            playerId: currentPlayer.id,
            host: currentPlayer.host,
            settings: nextSnapshot.settings,
            room: summarizeRoom(roomStore, currentRoom)
          },
          "multiplayer room configured"
        );
        broadcast(currentRoom.id, { type: "room:snapshot", snapshot: nextSnapshot });
        if (nextSnapshot.status === "complete") {
          broadcast(currentRoom.id, { type: "room:complete", snapshot: nextSnapshot });
        }
        return;
      }

      if (message.type === "room:reset") {
        if (!currentPlayer.host) {
          log.warn(
            {
              roomId: currentRoom.id,
              playerId: currentPlayer.id,
              messageType: message.type,
              room: summarizeRoom(roomStore, currentRoom)
            },
            "multiplayer room reset rejected"
          );
          return;
        }
        const nextSnapshot = roomStore.resetRoom(currentRoom, currentPlayer);
        log.info(
          {
            roomId: nextSnapshot.roomId,
            roomCode: nextSnapshot.roomCode,
            playerId: currentPlayer.id,
            host: currentPlayer.host,
            room: summarizeRoom(roomStore, currentRoom)
          },
          "multiplayer room reset"
        );
        broadcast(currentRoom.id, { type: "room:snapshot", snapshot: nextSnapshot });
        return;
      }

      if (message.type === "guess:submit") {
        const catalog = await catalogStore.getCatalog();
        const result = roomStore.submitGuess(catalog, currentRoom, currentPlayer, message.value);
        if (!result.accepted) {
          log.info(
            {
              roomId: currentRoom.id,
              playerId: currentPlayer.id,
              host: currentPlayer.host,
              reason: result.reason,
              messageType: message.type,
              room: summarizeRoom(roomStore, currentRoom)
            },
            "multiplayer guess rejected"
          );
          send(socket, {
            type: "guess:rejected",
            reason: result.reason,
            message: result.message
          });
          return;
        }

        log.info(
          {
            roomId: currentRoom.id,
            roomCode: currentRoom.code,
            playerId: currentPlayer.id,
            host: currentPlayer.host,
            canonical: result.canonical,
            complete: result.complete,
            room: summarizeRoom(roomStore, currentRoom)
          },
          "multiplayer guess accepted"
        );
        broadcast(currentRoom.id, {
          type: "guess:accepted",
          playerId: result.playerId,
          canonical: result.canonical,
          label: result.label,
          snapshot: result.snapshot
        });

        if (result.complete) {
          broadcast(currentRoom.id, { type: "room:complete", snapshot: result.snapshot });
        }
        return;
      }

      if (message.type === "room:leave") {
        log.info(
          {
            roomId: currentRoom.id,
            playerId: currentPlayer.id,
            host: currentPlayer.host,
            room: summarizeRoom(roomStore, currentRoom)
          },
          "multiplayer room leave"
        );
        socket.close();
      }
    });

    socket.on("close", () => {
      clientsByRoom.get(room.id)?.delete(client);
      if (clientsByRoom.get(room.id)?.size === 0) clientsByRoom.delete(room.id);
      const currentRoom = roomStore.getRoomById(room.id);
      const currentPlayer = currentRoom ? roomStore.findPlayer(currentRoom, player.sessionToken) : null;
      if (currentRoom && currentPlayer) {
        const nextSnapshot = roomStore.markConnected(currentRoom, currentPlayer, false);
        log.info(
          {
            roomId: nextSnapshot.roomId,
            roomCode: nextSnapshot.roomCode,
            playerId: currentPlayer.id,
            host: currentPlayer.host,
            room: summarizeRoom(roomStore, currentRoom)
          },
          "multiplayer websocket disconnected"
        );
        broadcast(currentRoom.id, { type: "player:presence", snapshot: nextSnapshot });
      }
    });
  });
}
