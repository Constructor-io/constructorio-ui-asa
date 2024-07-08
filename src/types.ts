import React from 'react';
import type { ReactNode } from 'react';
import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import {
  ConstructorClientOptions,
  Nullable,
} from '@constructor-io/constructorio-client-javascript/lib/types';
import { IAssistantParameters } from '@constructor-io/constructorio-client-javascript/lib/types/assistant';

export { Nullable, ConstructorIOClient };

export type CioClientOptions = Omit<ConstructorClientOptions, 'apiKey' | 'sendTrackingEvents'>;

export interface PrimaryColorStyles {
  '--primary-color-h': string;
  '--primary-color-s': string;
  '--primary-color-l': string;
}

export interface AsaContextValue {
  cioClient: Nullable<ConstructorIOClient>;
  cioClientOptions: CioClientOptions;
  setCioClientOptions: React.Dispatch<CioClientOptions>;
  staticRequestConfigs: RequestConfigs;
  itemFieldGetters: ItemFieldGetters;
  formatters: Formatters;
  callbacks: Callbacks;
  urlHelpers: UrlHelpers;
}

export interface RequestConfigs extends IAssistantParameters {}

export interface ItemFieldGetters {}
export interface Formatters {}
export interface Callbacks {}
export interface UrlHelpers {}

// eslint-disable-next-line prettier/prettier
export interface CioAsaProviderProps
  extends Omit<Partial<AsaContextValue>, 'setCioClientOptions'>,
    UseCioClientProps {}

export interface UseCioClientProps {
  apiKey?: string;
  cioClient?: Nullable<ConstructorIOClient>;
  cioClientOptions?: CioClientOptions;
}

export type DefaultQueryStringMap = {
  intent: 'q';
  resultsPerPod: 'resultsPerPod'; // The API parameter is `num_results_per_pod`. We transform this when setting requestConfigs
  filters: 'filters';
};

export interface QueryParamEncodingOptions {
  baseUrl?: string;
  origin?: string;
  pathname?: string;
}

// Type Extenders
export type PropsWithChildren<P> = P & { children?: ReactNode };

/**
 * Composes a type for a Component that accepts
 * - Props P,
 * - A children function, that takes RenderProps as its argument
 */
export type IncludeRenderProps<ComponentProps, ChildrenFunctionProps> = ComponentProps & {
  children?: ((props: ChildrenFunctionProps) => ReactNode) | React.ReactNode;
};
