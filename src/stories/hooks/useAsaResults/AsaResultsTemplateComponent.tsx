import React from 'react';
import useAsaResults from '../../../hooks/useAsaResults';
import CioAsaProvider from '../../../components/CioAsaProvider/CioAsaProvider';
import { DEMO_API_KEY } from '../../../constants';

function AsaResultsDisplay(props: { intent: string }) {
  const { intent } = props;
  const { groups, status } = useAsaResults(intent);

  return (
    <div>
      Status: {status}
      <ul>
        {groups.map((g) => (
          <div>
            <li key={g.group.display_name}>
              Group: <b>{g.group.display_name}</b>
            </li>
            <ul>
              {g.searchResults.map((searchResult) => (
                <li key={searchResult.result_id}>
                  <b>{searchResult.response.search_request.display_name}</b>:{' '}
                  {searchResult.response.results.length} Results
                </li>
              ))}
            </ul>
          </div>
        ))}
      </ul>
    </div>
  );
}

export default function AsaResultsTemplateComponent(props: { intent: string }) {
  return (
    <CioAsaProvider apiKey={DEMO_API_KEY}>
      <AsaResultsDisplay {...props} />
    </CioAsaProvider>
  );
}
