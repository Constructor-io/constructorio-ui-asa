import React, { useEffect } from 'react';
import useAsaResults from '../../../hooks/useAsaResults';
import CioAsaProvider from '../../../components/CioAsaProvider/CioAsaProvider';
import { DEMO_API_KEY } from '../../../constants';

interface AsaResultsDisplayProps {
  defaultPrompt: string;
}

function AsaResultsDisplay({ defaultPrompt }: AsaResultsDisplayProps) {
  const result = useAsaResults();

  useEffect(() => {
    if (defaultPrompt) {
      result.sendMessage(defaultPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultPrompt]);

  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}

export default function AsaResultsTemplateComponent({ defaultPrompt }: AsaResultsDisplayProps) {
  return (
    <CioAsaProvider apiKey={DEMO_API_KEY}>
      <AsaResultsDisplay defaultPrompt={defaultPrompt} />
    </CioAsaProvider>
  );
}
