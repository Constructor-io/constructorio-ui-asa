import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import { Nullable } from '@constructor-io/constructorio-client-javascript/lib/types';
import { useEffect, useMemo } from 'react';
import version from '../version';
import type { UseCioClientProps } from '../types';

type UseCioClient = (props: UseCioClientProps) => Nullable<ConstructorIOClient> | never;

const useCioClient: UseCioClient = ({ apiKey, cioClient, cioClientOptions, testCells } = {}) => {
  if (!apiKey && !cioClient) {
    throw new Error('Api Key or Constructor Client required');
  }

  const serializedOptions = useMemo(
    () =>
      JSON.stringify({ cioClientOptions: cioClientOptions ?? null, testCells: testCells ?? null }),
    [cioClientOptions, testCells],
  );

  const memoizedCioClient = useMemo(() => {
    if (cioClient) return cioClient;
    if (apiKey && typeof window !== 'undefined') {
      return new ConstructorIOClient({
        apiKey,
        sendTrackingEvents: true,
        // testCells, userId and segments fall back to their window.cnstrc globals when not passed.
        useWindowParameters: true,
        version: `cio-ui-asa-${version}`,
        ...(testCells && { testCells }),
        ...cioClientOptions,
      });
    }

    return null;
    // options are compared by serializedOptions so inline objects do not rebuild the client
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, cioClient, serializedOptions]);

  // A caller's client owns its own options, so say so rather than dropping these silently.
  useEffect(() => {
    if (!cioClient || !testCells || Object.keys(testCells).length === 0) return;

    // eslint-disable-next-line no-console
    console.warn(
      '[CioAsa] testCells is ignored when you supply your own cioClient. Set testCells on that client instead.',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cioClient, serializedOptions]);

  return memoizedCioClient!;
};

export default useCioClient;
