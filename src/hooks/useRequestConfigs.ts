import { useCioAsaContext } from './useCioAsaContext';
import { RequestConfigs } from '../types';

interface UseRequestConfigsReturn {
  requestConfigs: RequestConfigs;
  setRequestConfigs: (configsToUpdate: Partial<RequestConfigs>) => void;
}

export default function useRequestConfigs(): UseRequestConfigsReturn {
  const context = useCioAsaContext();
  if (!context) {
    throw new Error('This Hook needs to be called within the C.io ASA Context Provider.');
  }

  const { urlHelpers, staticRequestConfigs } = context;
  const { getUrl, setUrl, getStateFromUrl, getUrlFromState } = urlHelpers;

  const url = getUrl();
  const urlRequestConfigs = url ? getStateFromUrl(url) : {};

  const requestConfigs: RequestConfigs = { ...staticRequestConfigs, ...urlRequestConfigs };

  const setRequestConfigs = (configsToUpdate: Partial<RequestConfigs>) => {
    const oldUrl = getUrl();
    if (!oldUrl) {
      throw new Error('getUrl returns undefined when attempting to call setRequestConfigs');
    }

    const urlObj = new URL(oldUrl);
    const oldRequestConfigs = getStateFromUrl(oldUrl);
    const newRequestConfigs = { ...oldRequestConfigs, ...configsToUpdate };
    const newUrl = getUrlFromState(newRequestConfigs, urlObj);

    setUrl(newUrl);
  };

  return { requestConfigs, setRequestConfigs };
}
