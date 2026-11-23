import type { IdOptions } from '@constructor-io/constructorio-client-javascript/lib/types';

const SESSION_COOKIE = 'ConstructorioID_session';
const CLIENT_ID_COOKIE = 'ConstructorioID_client_id';
const THIRTY_MINUTES = 30 * 60 * 1000;

// constructorio-id accepts these, but the client's `IdOptions` type does not list them.
export type BeaconIdOptions = IdOptions & { session_id: number; client_id?: string };

// Reads a cookie the way constructorio-id's `get_cookie` does: decode, then take the first match.
function readCookie(cookies: string, name: string): string | undefined {
  const prefix = `${name}=`;
  const decode = (bit: string) => {
    try {
      return decodeURIComponent(bit).trimStart();
    } catch {
      return ''; // a malformed bit is skipped, as constructorio-id does
    }
  };
  return cookies
    .split(';')
    .map(decode)
    .find((bit) => bit.startsWith(prefix))
    ?.slice(prefix.length);
}

/**
 * `idOptions` that give a new client the session number the site's beacon uses, read from the
 * beacon's `ConstructorioID_session` cookie with constructorio-id's 30-minute rule. Passing
 * `session_id` (and `client_id`) means constructorio-id reads and writes no session storage of its
 * own, so the beacon's cookie stays the only copy. `undefined` when there is no usable cookie.
 */
export function beaconIdOptions(
  cookies: string = typeof document === 'undefined' ? '' : document.cookie,
  now: number = Date.now(),
): BeaconIdOptions | undefined {
  const raw = readCookie(cookies, SESSION_COOKIE);
  if (!raw) return undefined;

  let data: { sessionId?: unknown; lastTime?: unknown };
  try {
    data = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!data || typeof data !== 'object') return undefined;

  const stored = parseInt(String(data.sessionId), 10) || 1;
  const isFresh = Number(data.lastTime) > now - THIRTY_MINUTES;
  const clientId = readCookie(cookies, CLIENT_ID_COOKIE);

  return {
    session_id: isFresh ? stored : stored + 1,
    ...(clientId && { client_id: clientId }),
  };
}
