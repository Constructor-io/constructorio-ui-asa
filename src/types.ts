import React from 'react';
import type { ReactNode } from 'react';
import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';
import {
  ConstructorClientOptions,
  Nullable,
} from '@constructor-io/constructorio-client-javascript/lib/types';

export { Nullable, ConstructorIOClient };

export type CioClientOptions = Omit<ConstructorClientOptions, 'apiKey' | 'sendTrackingEvents'>;

export interface PrimaryColorStyles {
  '--primary-color-h': string;
  '--primary-color-s': string;
  '--primary-color-l': string;
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
