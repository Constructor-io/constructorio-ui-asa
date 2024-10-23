import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import { useEffect, useMemo, useState } from 'react';
import { useCioAsaContext } from './useCioAsaContext';

export interface UseAsaResultsProps {
  intent: string;
}

export interface UseAsaResultsReturn {
  groups: AsaResultGroup[];
  status: Status;
}

interface AsaResultGroup {
  group: any;
  searchResults: any[];
}

export enum Status {
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

const useFetchAsaResults = (
  client: ConstructorIOClient,
  intent: string,
  domain: string,
): UseAsaResultsReturn => {
  const [groups, setGroups] = useState<AsaResultGroup[]>([]);
  const [status, setStatus] = useState<Status>(Status.LOADING);

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
            setStatus(Status.SUCCESS);
            break;
          }
          // if the value is a group, we will append a new empty group to the end of 'groups'
          if (res.value.type === 'group') {
            const newGroup = res.value;
            setGroups((oldGroups) => [...oldGroups, { group: newGroup, searchResults: [] }]);
          }
          // if the value is a search result, we will find the most recent group (which will be the last in the list)
          // and we will append this search result to the last group's list of results
          if (res.value.type === 'search_result') {
            setGroups((oldGroups) => {
              // this shouldn't happen but if the API returns a search result before any groups, we will ignore it
              if (oldGroups.length === 0) {
                return oldGroups;
              }
              const lastGroup = oldGroups[oldGroups.length - 1];
              const newSearchResults = res.value;
              // update the last group to include the new search result
              const updatedLastGroup = {
                group: lastGroup.group,
                searchResults: [...lastGroup.searchResults, newSearchResults],
              };

              // slice off the old last group and replace it with the updated last group
              return [...oldGroups.slice(0, oldGroups.length - 1), updatedLastGroup];
            });
          }
        }
      } catch (e) {
        setStatus(Status.ERROR);
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

  return { groups, status };
};

export default function useAsaResults(intent: string): UseAsaResultsReturn {
  const contextValue = useCioAsaContext();

  const { cioClient, staticRequestConfigs } = contextValue || {};
  const { domain } = staticRequestConfigs || {};

  if (!cioClient) {
    throw Error('CioClient required');
  }
  if (!domain) {
    throw Error('Missing domain');
  }
  if (!intent) {
    throw Error('Missing intent');
  }

  return useFetchAsaResults(cioClient, intent, domain);
}
