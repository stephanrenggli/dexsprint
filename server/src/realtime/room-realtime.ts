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
  app.get("/ws/rooms/:roomId", { websocket: true }, async (socket, request) => {
    const { roomId } = request.params as { roomId: string };
    const { sessionToken } = request.query as { sessionToken?: string };
    const room = roomStore.getRoomById(roomId);
    const player = room && sessionToken ? roomStore.findPlayer(room, sessionToken) : null;

    if (!room || !player) {
      send(socket, { type: "error", code: "ROOM_NOT_FOUND", message: "Room not found." });
      socket.close();
      return;
    }

    const client: RoomSocketClient = { socket, roomId: room.id, playerId: player.id };
    if (!clientsByRoom.has(room.id)) clientsByRoom.set(room.id, new Set());
    clientsByRoom.get(room.id)?.add(client);

    const snapshot = roomStore.markConnected(room, player, true);
    broadcast(room.id, { type: "player:presence", snapshot });
    send(socket, { type: "room:snapshot", snapshot });

    socket.on("message", async (raw) => {
      const message = parseClientMessage(raw);
      if (!message) {
        send(socket, { type: "error", code: "BAD_MESSAGE", message: "Invalid realtime message." });
        return;
      }

      const currentRoom = roomStore.getRoomById(room.id);
      const currentPlayer = currentRoom ? roomStore.findPlayer(currentRoom, player.sessionToken) : null;
      if (!currentRoom || !currentPlayer) {
        send(socket, { type: "error", code: "ROOM_NOT_FOUND", message: "Room not found." });
        return;
      }

      if (message.type === "player:update") {
        const nextSnapshot = roomStore.updatePlayer(currentRoom, currentPlayer, message.name);
        broadcast(currentRoom.id, { type: "player:presence", snapshot: nextSnapshot });
        return;
      }

      if (message.type === "room:configure") {
        const catalog = await catalogStore.getCatalog();
        const nextSnapshot = roomStore.configureRoom(catalog, currentRoom, currentPlayer, message.settings);
        broadcast(currentRoom.id, { type: "room:snapshot", snapshot: nextSnapshot });
        return;
      }

      if (message.type === "room:start") {
        const nextSnapshot = roomStore.startRoom(currentRoom, currentPlayer);
        broadcast(currentRoom.id, { type: "room:snapshot", snapshot: nextSnapshot });
        return;
      }

      if (message.type === "room:reset") {
        const nextSnapshot = roomStore.resetRoom(currentRoom, currentPlayer);
        broadcast(currentRoom.id, { type: "room:snapshot", snapshot: nextSnapshot });
        return;
      }

      if (message.type === "guess:submit") {
        const catalog = await catalogStore.getCatalog();
        const result = roomStore.submitGuess(catalog, currentRoom, currentPlayer, message.value);
        if (!result.accepted) {
          send(socket, {
            type: "guess:rejected",
            reason: result.reason,
            message: result.message
          });
          return;
        }

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
        broadcast(currentRoom.id, { type: "player:presence", snapshot: nextSnapshot });
      }
    });
  });
}
