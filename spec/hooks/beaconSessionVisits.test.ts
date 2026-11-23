/**
 * @jest-environment-options {"url": "https://www.example.com/"}
 */
import { renderHook } from '@testing-library/react';
import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
// The id library the JS client depends on; the site beacon builds the same thing.
// Only this test needs it, so it stays a dependency of the JS client.
// eslint-disable-next-line import/no-extraneous-dependencies
import ConstructorioID from '@constructor-io/constructorio-id';
import useCioClient from '../../src/hooks/useCioClient';

type ClientWithOptions = { options: { sessionId?: number } };

const EXPIRED = 'expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';

// Product pages load the agent; the other pages only load the beacon.
const VISITS = ['pdp', 'home', 'pdp', 'search', 'home', 'pdp', 'pdp', 'cart', 'pdp'] as const;

// The shopper is away 31 minutes between visits, so every visit starts a new session.
const AWAY = 31 * 60 * 1000;

describe.each([
  ['with a cookie domain', '.example.com'],
  ['without a cookie domain', undefined],
])('the agent and the site beacon across visits, %s', (_label, cookieDomain) => {
  const originalFetch = globalThis.fetch;
  const beacon = () =>
    new ConstructorioID({ session_id_storage_location: 'cookie', cookie_domain: cookieDomain });

  let now: number;

  beforeEach(() => {
    globalThis.fetch = jest.fn();
    now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    document.cookie.split('; ').forEach((c) => {
      const name = c.split('=')[0];
      document.cookie = `${name}=; ${EXPIRED}`;
      document.cookie = `${name}=; ${EXPIRED}; domain=.example.com`;
    });
    localStorage.clear();
  });

  it('carries the same session number as the beacon on every visit', () => {
    const pairs: [number, number][] = [];

    VISITS.forEach((page, i) => {
      if (i > 0) now += AWAY;
      // Alternate which loads first: the agent can mount before or after the beacon runs.
      const agentFirst = i % 2 === 1;
      let agentSession: number | undefined;
      const mountAgent = () => {
        const { result } = renderHook(() => useCioClient({ apiKey: 'key' }));
        agentSession = (result.current as unknown as ClientWithOptions).options.sessionId;
      };

      if (page === 'pdp' && agentFirst) mountAgent();
      const beaconSession = beacon().session_id;
      if (page === 'pdp' && !agentFirst) mountAgent();

      if (agentSession !== undefined) pairs.push([beaconSession, agentSession]);
    });

    expect(pairs.length).toBe(5);
    pairs.forEach(([beaconSession, agentSession]) => expect(agentSession).toBe(beaconSession));
    expect(pairs[pairs.length - 1][0]).toBe(VISITS.length);
  });

  it('drifted apart before this fix, with a default client', () => {
    const pairs: [number, number][] = [];

    VISITS.forEach((page, i) => {
      if (i > 0) now += AWAY;
      const beaconSession = beacon().session_id;
      if (page !== 'pdp') return;
      const client = new ConstructorIOClient({ apiKey: 'key', sendTrackingEvents: true });
      pairs.push([beaconSession, (client as unknown as ClientWithOptions).options.sessionId!]);
    });

    expect(pairs.some(([beaconSession, oldSession]) => beaconSession !== oldSession)).toBe(true);
  });
});
