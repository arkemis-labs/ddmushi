import type {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';
import type {
  MutationDefinition,
  MutationOperation,
  QueryDefinition,
  QueryOperation,
} from './types';

export function createQueryOptions<TData = unknown, TParams = unknown>(
  definition: QueryDefinition<TData, TParams>
) {
  return (
    params?: TParams,
    options?: Partial<UseQueryOptions<TData, Error, TData, QueryKey>>
  ): UseQueryOptions<TData, Error, TData, QueryKey> => {
    const queryKey =
      params !== undefined
        ? definition.queryKey(params)
        : definition.queryKey();

    return {
      queryKey,
      queryFn: () => definition.queryFn(params),
      ...options,
    };
  };
}

export function createMutationOptions<TData = unknown, TVariables = unknown>(
  definition: MutationDefinition<TData, TVariables>
) {
  return (
    options?: Partial<UseMutationOptions<TData, Error, TVariables>>
  ): UseMutationOptions<TData, Error, TVariables> => {
    return {
      mutationKey: definition.mutationKey,
      mutationFn: definition.mutationFn,
      ...options,
    };
  };
}

export function createQueryOptionsFromOperation<
  TData = unknown,
  TParams = unknown,
>(operation: QueryOperation<TData, TParams>, path: string[]) {
  return (
    input?: TParams,
    options?: Partial<UseQueryOptions<TData, Error, TData, QueryKey>>
  ): UseQueryOptions<TData, Error, TData, QueryKey> => {
    const queryKey = input !== undefined ? [...path, input] : path;

    return {
      queryKey,
      queryFn: () => operation.queryFn(input),
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
