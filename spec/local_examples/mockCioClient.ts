import type ConstructorIOClient from '@constructor-io/constructorio-client-javascript';

export interface StreamEvent {
  type: string;
  data?: any;
}

/**
 * Builds a ReadableStream that yields the provided events one-by-one, matching
 * the shape consumed by useAsaResults (`reader.read()` resolves `{ done, value }`
 * where `value` is `{ type, data }`).
 */
export function createEventStream(events: StreamEvent[]): ReadableStream<StreamEvent> {
  let index = 0;
  return new ReadableStream<StreamEvent>({
    pull(controller) {
      if (index < events.length) {
        controller.enqueue(events[index]);
        index += 1;
      } else {
        controller.close();
      }
    },
  });
}

/**
 * Builds a stream that throws when read — used to exercise the catch/handleStreamError path.
 */
export function createErroringStream(): ReadableStream<StreamEvent> {
  // A minimal stream-like object whose reader rejects on read. Using a real
  // errored ReadableStream would surface an unhandled rejection during cancel().
  return {
    getReader() {
      return {
        read: () => Promise.reject(new Error('stream boom')),
        cancel: () => Promise.resolve(),
        releaseLock: () => {},
      };
    },
  } as unknown as ReadableStream<StreamEvent>;
}

/**
 * Builds a stream whose read() never resolves, so the consumer stays mid-flight
 * until it cancels. The returned `cancel` mock lets tests assert cancellation.
 */
export function createPendingStream(): {
  stream: ReadableStream<StreamEvent>;
  cancel: jest.Mock;
} {
  const cancel = jest.fn(() => Promise.resolve());
  const stream = {
    getReader() {
      return {
        read: () => new Promise<never>(() => {}),
        cancel,
        releaseLock: () => {},
      };
    },
  } as unknown as ReadableStream<StreamEvent>;

  return { stream, cancel };
}

export interface MockCioClientOptions {
  /** Events the agent stream should yield for every sendMessage call. */
  events?: StreamEvent[];
  /** When true, the stream throws on read. */
  error?: boolean;
  /** When set, the agent stream returns this stream instead of one built from `events`. */
  stream?: ReadableStream<StreamEvent>;
}

/**
 * Returns a minimal object satisfying the parts of ConstructorIOClient that
 * useAsaResults touches: `agent.getAgentResultsStream`. The returned jest mock
 * is exposed as `getAgentResultsStream` for assertions.
 */
export function createMockCioClient({
  events = [],
  error = false,
  stream,
}: MockCioClientOptions = {}) {
  const getAgentResultsStream = jest.fn(
    () => stream ?? (error ? createErroringStream() : createEventStream(events)),
  );

  const client = {
    agent: { getAgentResultsStream },
  } as unknown as ConstructorIOClient;

  return { client, getAgentResultsStream };
}
