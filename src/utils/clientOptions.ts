import type ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import type { ConstructorClientOptions } from '@constructor-io/constructorio-client-javascript/lib/types';

export type ClientIdentity = Pick<ConstructorClientOptions, 'apiKey' | 'userId'>;

/** `options` is private in the client's typings; read it here only, so a client bump fails a test, not storage keys. */
export function readClientOptions(
  client: ConstructorIOClient | null | undefined,
): ClientIdentity | undefined {
  const { options } = (client ?? {}) as { options?: unknown };
  if (!options || typeof options !== 'object') return undefined;
  return options as ClientIdentity;
}
