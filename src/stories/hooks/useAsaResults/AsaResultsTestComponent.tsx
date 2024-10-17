import React from 'react';
import useAsaResults from '../../../hooks/useAsaResults';
import CioAsaProvider from '../../../components/CioAsaProvider/CioAsaProvider';
import { DEMO_API_KEY } from '../../../constants';

function AsaResultsDisplay(props: { intent: string }) {
  const { intent } = props;
  const { groups } = useAsaResults(intent);

  return (
    <ul>
      {groups.map((g) => (
        <>
          <li key={g.group}>{JSON.stringify(g.group).slice(0, 200)}...</li>
          {g.searchResults.map((r) => (
            <li key={r}>{JSON.stringify(r).slice(0, 400)}...</li>
          ))}
        </>
      ))}
    </ul>
  );
}

export default function AsaResultsTestComponent(props: { intent: string }) {
  return (
    <CioAsaProvider apiKey={DEMO_API_KEY}>
      <AsaResultsDisplay {...props} />
    </CioAsaProvider>
  );
}
