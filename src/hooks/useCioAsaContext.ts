import { createContext, useContext } from 'react';
import { AsaContextValue } from '../types';

export const AsaContext = createContext<AsaContextValue | null>(null);
AsaContext.displayName = 'AsaContext';

/**
 * React Hook to access state provided by CioAsa provider.
 * Note: Should only be used by components nested under a CioAsa provider
 */
export function useCioAsaContext() {
  return useContext(AsaContext as React.Context<AsaContextValue>);
}

export default useCioAsaContext;
