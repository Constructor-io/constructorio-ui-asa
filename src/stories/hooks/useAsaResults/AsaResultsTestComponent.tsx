import React, { useCallback, useEffect, useState } from 'react';
import useAsaResults from '../../../hooks/useAsaResults';
import CioAsaProvider from '../../../components/CioAsaProvider/CioAsaProvider';
import { DEMO_API_KEY } from '../../../constants';

function AsaResultsDisplay(props: { intent: string }) {
  const { intent } = props;
  const { nextGroup } = useAsaResults({ intent });
  const [values, setValues] = useState<string[]>([]);

  const readNextValue = useCallback(() => {
    nextGroup().then((res) => {
      if (res.group) {
        setValues((vs) => [...vs, JSON.stringify(res.group)]);
      }
      if (!res.done) {
        readNextValue();
      }
    });
  }, [nextGroup]);

  useEffect(() => {
    setValues([]);
    readNextValue();
  }, [readNextValue, nextGroup]);

  return (
    <ul>
      {values.map((v) => (
        <li key={v}>{v}</li>
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
