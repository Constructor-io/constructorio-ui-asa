import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import { useEffect, useMemo, useState } from 'react';
import { useCioAsaContext } from './useCioAsaContext';

export interface UseAsaResultsProps {
  intent: string;
}

export interface UseAsaResultsReturn {
  groups: AsaResultGroup[];
}

interface AsaResultGroup {
  group: any;
  searchResults: any[];
}

const useFetchSearchResults = (
  client: ConstructorIOClient,
  intent: string,
  domain: string,
): UseAsaResultsReturn => {
  const [groups, setGroups] = useState<AsaResultGroup[]>([]);

  useEffect(() => {
    setGroups([]);
  }, [client, intent, domain]);

  const readableStream = useMemo(
    () => client.assistant.getAssistantResultsStream(intent, { domain }),
    [client, domain, intent],
  );

  const reader = useMemo(() => readableStream.getReader(), [readableStream]);

  useEffect(() => {
    let killSwitch = false;
    async function fetchData() {
      try {
        while (!killSwitch) {
          // eslint-disable-next-line no-await-in-loop
          const res = await reader.read();
          if (res.done) {
            break;
          }
          if (res.value.type === 'group') {
            const newGroup = res.value;
            setGroups((oldGroups) => [...oldGroups, { group: newGroup, searchResults: [] }]);
          }
          if (res.value.type === 'search_result') {
            setGroups((oldGroups) => {
              if (oldGroups.length === 0) {
                return oldGroups;
              }
              const lastGroup = oldGroups[oldGroups.length - 1];
              const newSearchResults = res.value;
              const updatedLastGroup = {
                group: lastGroup.group,
                searchResults: [...lastGroup.searchResults, newSearchResults],
              };

              return [...oldGroups.slice(0, oldGroups.length - 1), updatedLastGroup];
            });
          }
        }
      } catch (e) {
        // fail gracefully
      } finally {
        reader.cancel();
      }
    }
    fetchData();

    return () => {
      killSwitch = true;
      reader.cancel();
    };
  }, [reader]);

  return { groups };
};

/* eslint-disable max-len */
/**
 * A React Hook to call to utilize Asa Search Results
 * @param {Object} [props] - The component props.
 * @param {object} [props.intent] - The search intent
 * @returns {status, data, pagination, refetch}
 */
/* eslint-enable max-len */
export default function useAsaResults(props: UseAsaResultsProps): UseAsaResultsReturn {
  const { intent } = props;
  const contextValue = useCioAsaContext();

  const { cioClient, staticRequestConfigs } = contextValue || {};
  const { domain } = staticRequestConfigs || {};

  if (!cioClient) {
    throw Error('Could not initialize CIO Client');
  }
  if (!domain) {
    throw Error('Missing domain');
  }

  return useFetchSearchResults(cioClient, intent, domain);
}
