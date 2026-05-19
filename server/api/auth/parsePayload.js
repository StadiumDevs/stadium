/**
 * Parsing of the `x-siws-auth` request header.
 *
 * The header is `base64(JSON.stringify({ chain?, message, signature, address }))`.
 * `chain` is optional — absent means `'substrate'`, so clients signing in with
 * the original SIWS flow keep working unchanged.
 */

export class AuthPayloadError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AuthPayloadError';
    this.status = status;
  }
}

/**
 * Decode and validate the `x-siws-auth` header value.
 *
 * @param {string} authHeader - raw base64 header value
 * @returns {{ chain: string, message: string, signature: string, address: string }}
 * @throws {AuthPayloadError} on malformed base64/JSON or missing fields
 */
export function parsePayload(authHeader) {
  let decoded;
  try {
    decoded = atob(authHeader);
  } catch {
    throw new AuthPayloadError('Invalid Base64 in auth header', 400);
  }

  let payload;
  try {
    payload = JSON.parse(decoded);
  } catch {
    throw new AuthPayloadError('Malformed SIWS payload in header', 400);
  }

  const { chain, message, signature, address } = payload || {};
  if (!message || !signature || !address) {
    throw new AuthPayloadError('Incomplete SIWS payload', 400);
  }

  return { chain: chain || 'substrate', message, signature, address };
}
