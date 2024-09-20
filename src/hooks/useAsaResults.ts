import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import { useMemo } from 'react';
import { useCioAsaContext } from './useCioAsaContext';

export interface UseAsaResultsProps {
  intent: string;
}

export interface UseAsaResultsReturn {
  nextGroup: () => Promise<{ group: any; done: boolean }>;
}

const fetchSearchResults = (
  client: ConstructorIOClient,
  intent: string,
  domain: string,
): UseAsaResultsReturn => {
  const readableStream = client.assistant.getAssistantResultsStream(intent, { domain });

  const reader = readableStream.getReader();

  let nextGroup: any;

  return {
    nextGroup: async () => {
      let group: any = nextGroup;

      // The logic for nextGroup is essentially:
      // 1) Keep reading until a group is found
      // 2) Store all search results into the group
      // 3) Once we find the next group we can return the current group (and store the next one)
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const res = await reader.read();
        if (res.done) {
          return {
            group,
            done: true,
          };
        }
        if (res.value.type === 'group') {
          if (!group) {
            // If this is the first group we just store it and continue
            group = { group: res.value, searchResults: [] };
          } else {
            // If we already have an active group, we store the next group until the hook is called again
            nextGroup = { group: res.value, searchResults: [] };
            break;
          }
        }
        if (res.value.type === 'search_result' && group) {
          group.searchResults = [...group.searchResults, res.value];
        }
      }

      return {
        group,
        done: false,
      };
    },
  };
};

/* eslint-disable max-len */
/**
 * A React Hook to call to utilize Constructor.io Search
 * @param {Object} [props] - The component props.
 * @param {object} [props.initialSearchResponse] Initial value for search results
 * (Would be useful when passing initial state for the first render from the server
 *  to the client via something like getServerSideProps)
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

  const results = useMemo(
    () => fetchSearchResults(cioClient, intent, domain),
    [cioClient, intent, domain],
  );

  return results;
}
