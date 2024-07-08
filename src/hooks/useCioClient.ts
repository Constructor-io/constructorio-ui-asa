import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import { Nullable } from '@constructor-io/constructorio-client-javascript/lib/types';
import { useMemo } from 'react';
import version from '../version';
import type { UseCioClientProps } from '../types';

type UseCioClient = (props: UseCioClientProps) => Nullable<ConstructorIOClient> | never;

const useCioClient: UseCioClient = ({ apiKey, cioClient, cioClientOptions } = {}) => {
  if (!apiKey && !cioClient) {
    throw new Error('Api Key or Constructor Client required');
  }

  const memoizedCioClient = useMemo(() => {
    if (cioClient) return cioClient;
    if (apiKey && typeof window !== 'undefined') {
      return new ConstructorIOClient({
        apiKey,
        sendTrackingEvents: true,
        version: `cio-ui-asa-${version}`,
        ...cioClientOptions,
      });
    }

    return null;
  }, [apiKey, cioClient, cioClientOptions]);
  return memoizedCioClient!;
};

export default useCioClient;
