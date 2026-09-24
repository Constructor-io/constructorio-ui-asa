import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import { readClientOptions } from '../../src/utils/clientOptions';

describe('readClientOptions', () => {
  it('reads the api key and user id from a real client, before and after setClientOptions', () => {
    const client = new ConstructorIOClient({ apiKey: 'key_test', userId: 'user-1' });
    expect(readClientOptions(client)).toMatchObject({ apiKey: 'key_test', userId: 'user-1' });

    client.setClientOptions({ userId: 'user-2' } as never);
    expect(readClientOptions(client)?.userId).toBe('user-2');

    client.setClientOptions({ userId: undefined } as never);
    expect(readClientOptions(client)?.userId).toBeUndefined();
  });

  it('returns undefined for a client without options', () => {
    expect(readClientOptions(null)).toBeUndefined();
    expect(readClientOptions({ agent: {} } as never)).toBeUndefined();
  });
});
