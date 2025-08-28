import type {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
  UseSuspenseQueryOptions,
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
  const proxy = new Proxy(target, {
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

      if (isCollection(value)) {
        const metadata = opts.collectionMetadata?.get(value);
        const targetToProxy = metadata?.originalTarget ?? value;

        return createRecursiveProxy(opts, targetToProxy, currentPath);
      }

      return value;
    },
  });

  // Store metadata if collectionMetadata is available
  if (opts.collectionMetadata) {
    opts.collectionMetadata.set(proxy, {
      originalTarget: target,
      isCollection: true,
    });
  }

  return proxy;
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
    options?: Partial<
      UseQueryOptions<TData, Error, TData, QueryKey> &
        UseSuspenseQueryOptions<TData, Error, TData, QueryKey>
    >
  ): UseQueryOptions<TData, Error, TData, QueryKey> &
    UseSuspenseQueryOptions<TData, Error, TData, QueryKey> => {
    const queryKey = input !== undefined ? [...path, input] : path;

    return {
      queryKey,
      queryFn: () => operation.queryFn(opts, input),
      ...options,
    } as UseQueryOptions<TData, Error, TData, QueryKey> &
      UseSuspenseQueryOptions<TData, Error, TData, QueryKey>;
  };
}

function isCollection(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isQueryOperation(
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

function isMutationOperation(
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
