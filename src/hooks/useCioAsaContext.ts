import { createContext, useContext } from 'react';
import { AsaContextValue, Nullable } from '../types';

export const AsaContext = createContext<AsaContextValue | null>(null);
AsaContext.displayName = 'AsaContext';

/**
 * React Hook to access the state provided by the CioAsa provider.
 *
 * Returns `null` when called from a component that is not nested under a
 * `CioAsaProvider`, so guard the result before reading from it:
 *
 * ```tsx
 * const context = useCioAsaContext();
 * const tracking = useAsaTracking({
 *   tracker: context?.cioClient?.tracker ?? undefined,
 *   section: context?.section,
 * });
 * ```
 */
export function useCioAsaContext(): Nullable<AsaContextValue> {
  return useContext(AsaContext);
}

export default useCioAsaContext;
