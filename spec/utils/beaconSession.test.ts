import { beaconIdOptions } from '../../src/utils/beaconSession';

const NOW = 1_800_000_000_000;
const MINUTE = 60 * 1000;
const session = (data: unknown) => `ConstructorioID_session=${JSON.stringify(data)}`;

describe('beaconIdOptions', () => {
  it('returns nothing when the beacon has set no session cookie', () => {
    expect(beaconIdOptions('', NOW)).toBeUndefined();
    expect(beaconIdOptions('ConstructorioID_session_id=4; other=1', NOW)).toBeUndefined();
  });

  it('keeps the session number while the session is under 30 minutes old', () => {
    expect(beaconIdOptions(session({ sessionId: 4, lastTime: NOW - 29 * MINUTE }), NOW)).toEqual({
      session_id: 4,
    });
  });

  it('moves to the next session number once the session is over 30 minutes old', () => {
    expect(beaconIdOptions(session({ sessionId: 4, lastTime: NOW - 31 * MINUTE }), NOW)).toEqual({
      session_id: 5,
    });
  });

  it('starts a new session when lastTime is missing, as constructorio-id does', () => {
    expect(beaconIdOptions(session({ sessionId: 4 }), NOW)).toEqual({ session_id: 5 });
  });

  it('reads a URI-encoded cookie', () => {
    const encoded = `ConstructorioID_session=${encodeURIComponent(
      JSON.stringify({ sessionId: 7, lastTime: NOW }),
    )}`;

    expect(beaconIdOptions(encoded, NOW)).toEqual({ session_id: 7 });
  });

  it("passes the beacon's client id along so constructorio-id writes no cookie of its own", () => {
    const cookies = `foo=bar; ConstructorioID_client_id=abc-123; ${session({
      sessionId: 2,
      lastTime: NOW,
    })}`;

    expect(beaconIdOptions(cookies, NOW)).toEqual({ session_id: 2, client_id: 'abc-123' });
  });

  it('takes the first of two same-named cookies, as the beacon does', () => {
    const cookies = `${session({ sessionId: 3, lastTime: NOW })}; ${session({
      sessionId: 9,
      lastTime: NOW,
    })}`;

    expect(beaconIdOptions(cookies, NOW)).toEqual({ session_id: 3 });
  });

  it.each([
    ['not JSON', 'ConstructorioID_session={oops'],
    ['a bare number', 'ConstructorioID_session=4'],
    ['null', 'ConstructorioID_session=null'],
    ['empty', 'ConstructorioID_session='],
    ['bad encoding', 'ConstructorioID_session=%E0%A4%A'],
  ])('returns nothing for a malformed cookie (%s)', (_label, cookies) => {
    expect(beaconIdOptions(cookies, NOW)).toBeUndefined();
  });

  it('reads document.cookie by default', () => {
    document.cookie = session({ sessionId: 6, lastTime: Date.now() });

    expect(beaconIdOptions()).toEqual({ session_id: 6 });

    document.cookie = 'ConstructorioID_session=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
  });
});
