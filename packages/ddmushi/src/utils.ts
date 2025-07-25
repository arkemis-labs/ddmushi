import type {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';
import type {
  MutationDefinition,
  MutationOperation,
  QueryOperation,
  RouterOptions,
} from './types';

export function createMutationOptions<TData = unknown, TVariables = unknown>(
  opts: RouterOptions,
  definition: MutationDefinition<TData, TVariables>
) {
  return (
    options?: Partial<UseMutationOptions<TData, Error, TVariables>>
  ): UseMutationOptions<TData, Error, TVariables> => {
    return {
      mutationKey: definition.mutationKey,
      mutationFn: (input: TVariables) => definition.mutationFn(opts, input),
      ...options,
    };
  };
}

export function createQueryOptions<TData = unknown, TParams = unknown>(
  opts: RouterOptions,
  operation: QueryOperation<TData, TParams>,
  path: string[]
) {
  return (
    input?: TParams,
    options?: Partial<UseQueryOptions<TData, Error, TData, QueryKey>>
  ): UseQueryOptions<TData, Error, TData, QueryKey> => {
    const queryKey = input !== undefined ? [...path, input] : path;

    return {
      queryKey,
      queryFn: () => operation.queryFn(opts, input),
      ...options,
    };
  };
}

export function buildQueryKey(path: string[], params?: unknown): QueryKey {
  return params !== undefined ? [...path, params] : path;
}

export function isQueryOperation(
  definition: unknown
): definition is QueryOperation {
  return Boolean(
    definition &&
      typeof definition === 'object' &&
      '_type' in definition &&
      definition._type === 'operation' &&
      '_operationType' in definition &&
      definition._operationType === 'query'
  );
}

export function isMutationOperation(
  definition: unknown
): definition is MutationOperation {
  return Boolean(
    definition &&
      typeof definition === 'object' &&
      '_type' in definition &&
      definition._type === 'operation' &&
      '_operationType' in definition &&
      definition._operationType === 'mutation'
  );
}
