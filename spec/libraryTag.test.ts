import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import type { ConstructorClientOptions } from '@constructor-io/constructorio-client-javascript/lib/types';
import { LIBRARY_TAG, withLibraryTag } from '../src/utils/libraryTag';
import { DEMO_API_KEY } from '../src/constants';

type QueueArgs = [url: string, method: string, body?: Record<string, unknown>];

describe('withLibraryTag', () => {
  const params = { intent: 'shoes', threadId: 't-1' };
  let client: InstanceType<typeof ConstructorIOClient>;
  let queue: jest.SpyInstance;

  // A host's own client, with its own tag and identity.
  beforeEach(() => {
    client = new ConstructorIOClient({
      apiKey: DEMO_API_KEY,
      version: 'ciojs-client-host',
      clientId: 'host-client-id',
      sessionId: 7,
      userId: 'host-user',
      segments: ['host-segment'],
      testCells: { asa: 'on' },
    });
    const { requests } = client.tracker as unknown as {
      requests: { queue: () => void; send: () => void };
    };
    queue = jest.spyOn(requests, 'queue').mockImplementation(() => {});
    jest.spyOn(requests, 'send').mockImplementation(() => {});
  });

  const lastEvent = () => {
    const [url, , body] = queue.mock.calls.at(-1) as QueueArgs;
    return { query: new URL(url).searchParams, body: body ?? {} };
  };

  it('sends events with the library tag in the URL and body', () => {
    withLibraryTag(client.tracker).trackAssistantSubmit(params);

    const { query, body } = lastEvent();
    expect(query.get('c')).toBe(LIBRARY_TAG);
    expect(body.c).toBe(LIBRARY_TAG);
  });

  it('tags the agent button click, which ASA calls by its agent name', () => {
    withLibraryTag(client.tracker).trackAgentButtonClick({ mode: 'chat', agentDomain: 'explorer' });

    expect(lastEvent().query.get('c')).toBe(LIBRARY_TAG);
  });

  it("keeps the rest of the host client's options", () => {
    withLibraryTag(client.tracker).trackAssistantSubmit(params);

    const { query, body } = lastEvent();
    expect(query.get('key')).toBe(DEMO_API_KEY);
    expect(query.get('i')).toBe('host-client-id');
    expect(query.get('s')).toBe('7');
    expect(query.get('ui')).toBe('host-user');
    expect(body).toMatchObject({ us: ['host-segment'], 'ef-asa': 'on', intent: 'shoes' });
  });

  it('reads options when an event is sent, so later changes apply', () => {
    const tracker = withLibraryTag(client.tracker);
    client.setClientOptions({ userId: 'logged-in' } as ConstructorClientOptions);

    tracker.trackAssistantSubmit(params);

    expect(lastEvent().query.get('ui')).toBe('logged-in');
  });

  it('follows an options object the host replaces', () => {
    const tracker = withLibraryTag(client.tracker);
    const { tracker: host } = client as unknown as {
      tracker: { options: Record<string, unknown> };
    };
    host.options = { ...host.options, userId: 'replaced' };

    tracker.trackAssistantSubmit(params);

    const { query } = lastEvent();
    expect(query.get('ui')).toBe('replaced');
    expect(query.get('c')).toBe(LIBRARY_TAG);
  });

  it('sends with the host tag, without throwing, when the host freezes its options later', () => {
    const tracker = withLibraryTag(client.tracker);
    Object.freeze((client.tracker as unknown as { options: object }).options);

    expect(() => tracker.trackAssistantSubmit(params)).not.toThrow();
    expect(lastEvent().query.get('c')).toBe('ciojs-client-host');
  });

  it("retries on the host's tracker when a call fails on the tagged one", () => {
    const sent: unknown[] = [];
    const host = {
      options: { version: 'ciojs-client-host' },
      // Stands in for a client whose methods only work on the real instance, such as private fields.
      track(this: typeof host) {
        if (this !== host) throw new TypeError('Cannot read private member');
        sent.push(this.options.version);
      },
    };

    expect(() => withLibraryTag(host).track()).not.toThrow();
    expect(sent).toEqual(['ciojs-client-host']);
  });

  it("leaves the host's own events with the host's tag", () => {
    withLibraryTag(client.tracker);

    client.tracker.trackAssistantSubmit(params);

    expect(lastEvent().query.get('c')).toBe('ciojs-client-host');
  });

  it('returns a tracker without options unchanged', () => {
    const tracker = { trackAssistantSubmit: jest.fn() };

    expect(withLibraryTag(tracker)).toBe(tracker);
  });

  it('returns a tracker that already has the library tag unchanged', () => {
    const own = new ConstructorIOClient({ apiKey: DEMO_API_KEY, version: LIBRARY_TAG });

    expect(withLibraryTag(own.tracker)).toBe(own.tracker);
  });
});
