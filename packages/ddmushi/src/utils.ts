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

export function createRecursiveProxy<
  Ctx extends Record<string, unknown>,
  T extends Record<string, unknown>,
>(opts: RouterOptions<Ctx>, target: T, path: string[] = []): T {
  return new Proxy(target, {
    get(obj, prop) {
      if (typeof prop !== 'string') {
        return Reflect.get(obj, prop);
      }

      const currentPath = [...path, prop];
      const value = obj[prop];

      if (isQueryOperation(value)) {
        return {
          queryOptions: createQueryOptions(opts, value, currentPath),
        };
      }

      if (isMutationOperation(value)) {
        const mutationDefinition: MutationDefinition<Ctx> = {
          mutationFn: value.mutationFn,
        };
        return {
          mutationOptions: createMutationOptions(opts, mutationDefinition),
        };
      }

      if (value && typeof value === 'object') {
        return createRecursiveProxy(
          opts,
          value as Record<string, unknown>,
          currentPath
        );
      }

      return value;
    },
  });
}

export function createMutationOptions<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TVariables = unknown,
>(
  opts: RouterOptions<Ctx>,
  definition: MutationDefinition<Ctx, TData, TVariables>
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

export function createQueryOptions<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TParams = unknown,
>(
  opts: RouterOptions<Ctx>,
  operation: QueryOperation<Ctx, TData, TParams>,
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

export function isQueryOperation(
  definition: unknown
): definition is QueryOperation<Record<string, unknown>, unknown, unknown> {
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
): definition is MutationOperation<Record<string, unknown>, unknown, unknown> {
  return Boolean(
    definition &&
      typeof definition === 'object' &&
      '_type' in definition &&
      definition._type === 'operation' &&
      '_operationType' in definition &&
      definition._operationType === 'mutation'
  );
}

export function buildQueryKey(path: string[], params?: unknown): QueryKey {
  return params !== undefined ? [...path, params] : path;
}
