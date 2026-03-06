import type { RequestConfigs, QueryParamEncodingOptions, DefaultQueryStringMap } from '../types';

export const defaultQueryStringMap: Readonly<DefaultQueryStringMap> = Object.freeze({
  intent: 'q',
  page: 'page',
  numResultsPerPage: 'resultsPerPod',
  domain: 'domain',
  filters: 'filters', // do special encoding/decoding
});

export function getUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.location.href;
}

export function setUrl(newUrlWithEncodedState: string) {
  if (typeof window === 'undefined') return;
  window.location.href = newUrlWithEncodedState;
}

export function extractFiltersFromUrl(urlParams: URLSearchParams) {
  const filters = {};
  const filterRegex = new RegExp(`^${defaultQueryStringMap.filters}\\[(.*)\\]`);

  urlParams?.forEach((value, key) => {
    const filterKey = key?.match(filterRegex)?.[1];
    if (filterKey) {
      if (filters[filterKey]) {
        filters[filterKey].push(value);
      } else {
        filters[filterKey] = [value];
      }
    }
  });

  return Object.keys(filters).length ? filters : undefined;
}

export function getFilterParamsFromState(
  urlParams: URLSearchParams,
  filters: RequestConfigs['filters'],
) {
  if (filters) {
    Object.entries(filters)?.forEach(([filterName, filterValues]) => {
      if (Array.isArray(filterValues)) {
        filterValues.forEach((filterValue) => {
          urlParams.append(`filters[${filterName}]`, String(filterValue));
        });
      } else {
        urlParams.append(`filters[${filterName}]`, String(filterValues));
      }
    });
  }
}

export function getStateFromUrl(url: string): RequestConfigs {
  const urlObject = new URL(url);
  const urlParams = urlObject.searchParams;

  const rawState = {} as Record<string, string> & { domain: string };
  Object.entries(defaultQueryStringMap).forEach(([key, val]) => {
    const storedVal = urlParams.get(val);
    if (storedVal != null) {
      rawState[key] = storedVal;
    }
  });

  const filters = extractFiltersFromUrl(urlParams);

  const { page: _page, numResultsPerPage, ...rest } = rawState;

  const state = { ...rest } as RequestConfigs;
  if (numResultsPerPage) state.numResultsPerPage = Number(numResultsPerPage);
  if (filters) state.filters = filters;

  return state;
}

export function getUrlFromState(
  state: RequestConfigs,
  options: QueryParamEncodingOptions = {},
): string {
  const { baseUrl: url, origin, pathname } = options;
  const baseUrl = url || `${origin}${pathname}`;

  const params = new URLSearchParams();
  Object.entries(state).forEach(([key, val]) => {
    if (defaultQueryStringMap[key] === undefined) {
      return;
    }

    let encodedVal: string = '';

    if (key === 'filters' && state.filters) {
      getFilterParamsFromState(params, state.filters);
    } else if (typeof val !== 'string') {
      encodedVal = JSON.stringify(val);
    } else {
      encodedVal = val;
    }

    if (encodedVal) {
      params.set(defaultQueryStringMap[key], encodedVal);
    }
  });

  return `${baseUrl}?${params.toString()}`;
}
