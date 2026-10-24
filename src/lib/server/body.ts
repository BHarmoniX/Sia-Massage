// Size-capped request body reading. Never call request.text() / request.formData() on
// untrusted input: they read everything the sender sends. These stop at `maxBytes`, even
// when the sender lies about or omits Content-Length.

export class BodyTooLargeError extends Error {
  constructor() {
    super('Request body too large');
  }
}

export class UnsupportedContentTypeError extends Error {
  constructor() {
    super('Unsupported content type');
  }
}

export async function readTextLimited(request: Request, maxBytes: number): Promise<string> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw new BodyTooLargeError();
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  // `fatal` rejects malformed UTF-8 instead of silently substituting characters.
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/**
 * Reads a URL-encoded form or JSON object into plain string fields. File uploads
 * (multipart) are refused here; they need their own scanned upload handling.
 */
export async function readFieldsLimited(
  request: Request,
  maxBytes: number,
): Promise<Record<string, string>> {
  const type = (request.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
  const text = await readTextLimited(request, maxBytes);

  if (type === 'application/x-www-form-urlencoded') {
    const fields: Record<string, string> = {};
    for (const [key, value] of new URLSearchParams(text)) {
      // First value wins; repeated keys are a common trick to confuse validators.
      if (!(key in fields)) fields[key] = value;
    }
    return fields;
  }

  if (type === 'application/json') {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new UnsupportedContentTypeError();
    }
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') fields[key] = value;
    }
    return fields;
  }

  throw new UnsupportedContentTypeError();
}
