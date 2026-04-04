function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function writeVarInt(value, bytes) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Invalid progress value");
  }

  let remaining = value;
  do {
    let byte = remaining & 0x7f;
    remaining = Math.floor(remaining / 128);
    if (remaining > 0) byte |= 0x80;
    bytes.push(byte);
  } while (remaining > 0);
}

function readVarInt(bytes, offsetRef) {
  let result = 0;
  let shift = 0;

  while (offsetRef.index < bytes.length) {
    const byte = bytes[offsetRef.index];
    offsetRef.index += 1;
    result += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) {
      return result;
    }
    shift += 7;
    if (shift > 35) break;
  }

  throw new Error("Invalid progress encoding");
}

function computeChecksum(bytes) {
  let hash = 2166136261;
  bytes.forEach((value) => {
    hash ^= value;
    hash = Math.imul(hash, 16777619) >>> 0;
  });
  return hash >>> 0;
}

function checksumBytes(value) {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff
  ];
}

function bytesToChecksum(bytes) {
  if (bytes.length !== 4) {
    throw new Error("Invalid checksum");
  }
  return (
    ((bytes[0] << 24) >>> 0) |
    ((bytes[1] << 16) >>> 0) |
    ((bytes[2] << 8) >>> 0) |
    (bytes[3] >>> 0)
  ) >>> 0;
}

function encodeUtf8(value) {
  return new TextEncoder().encode(value);
}

function decodeUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}

export function encodeProgressPayload({ ids, elapsed, settings = null }) {
  const payload = [];
  writeVarInt(elapsed, payload);
  writeVarInt(ids.length, payload);

  let previousId = 0;
  ids.forEach((id) => {
    writeVarInt(id - previousId, payload);
    previousId = id;
  });

  if (settings) {
    const settingsBytes = encodeUtf8(JSON.stringify(settings));
    writeVarInt(1, payload);
    writeVarInt(settingsBytes.length, payload);
    settingsBytes.forEach((value) => payload.push(value));
  } else {
    writeVarInt(0, payload);
  }

  const payloadBytes = Uint8Array.from(payload);
  const checksum = checksumBytes(computeChecksum(payloadBytes));
  return base64UrlEncode(Uint8Array.from([...checksum, ...payloadBytes]));
}

export function decodeProgressPayload(serialized) {
  const bytes = base64UrlDecode(serialized);
  if (bytes.length < 4) {
    throw new Error("Invalid progress payload");
  }

  const expectedChecksum = bytesToChecksum([...bytes.slice(0, 4)]);
  const payload = bytes.slice(4);
  const actualChecksum = computeChecksum(payload);
  if (actualChecksum !== expectedChecksum) {
    throw new Error("Progress code checksum mismatch");
  }

  const offsetRef = { index: 0 };
  const elapsed = readVarInt(payload, offsetRef);
  const count = readVarInt(payload, offsetRef);
  const ids = [];
  let previousId = 0;

  for (let i = 0; i < count; i += 1) {
    const delta = readVarInt(payload, offsetRef);
    if (delta <= 0) {
      throw new Error("Invalid progress delta");
    }
    previousId += delta;
    ids.push(previousId);
  }

  let settings = null;
  const hasSettings = offsetRef.index < payload.length ? readVarInt(payload, offsetRef) : 0;
  if (hasSettings) {
    const settingsLength = readVarInt(payload, offsetRef);
    const settingsEnd = offsetRef.index + settingsLength;
    if (settingsEnd > payload.length) {
      throw new Error("Invalid progress payload");
    }
    settings = JSON.parse(
      decodeUtf8(payload.slice(offsetRef.index, settingsEnd))
    );
    offsetRef.index = settingsEnd;
  }

  if (offsetRef.index !== payload.length) {
    throw new Error("Invalid progress payload");
  }

  return { elapsed, ids, settings };
}
