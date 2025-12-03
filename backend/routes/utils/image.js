const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function buildUserImagePath(username) {
  return `/api/users/${encodeURIComponent(username)}/image`;
}

function parseBase64Image(imageString) {
  if (typeof imageString !== "string") return null;

  const trimmed = imageString.trim();
  if (!trimmed) return { remove: true };

  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
  const base64Payload = dataUrlMatch ? dataUrlMatch[2] : trimmed;
  const contentType = dataUrlMatch ? dataUrlMatch[1] : "application/octet-stream";

  try {
    const buffer = Buffer.from(base64Payload, "base64");
    if (!buffer.length) return { error: "invalid" };
    return { buffer, contentType };
  } catch (error) {
    console.error("Failed to parse base64 image", error);
    return { error: "invalid" };
  }
}

function extractImagePayload({ file, imageString }) {
  if (file) {
    return { buffer: file.buffer, contentType: file.mimetype || "application/octet-stream" };
  }

  if (imageString === null) return { remove: true };

  const parsed = parseBase64Image(imageString);
  if (!parsed) return null;
  if (parsed.error || parsed.remove) return parsed;

  if (parsed.buffer.length > MAX_IMAGE_BYTES) {
    return { error: "too_large" };
  }

  return parsed;
}

module.exports = {
  MAX_IMAGE_BYTES,
  buildUserImagePath,
  extractImagePayload,
};
