import type {
  Collection,
  MutationDefinition,
  MutationOperation,
  QueryOperation,
  RouterOptions,
} from './types';
import {
  createMutationOptions,
  createQueryOptions,
  isMutationOperation,
  isQueryOperation,
} from './utils';

export function router<T extends Record<string, unknown>>(
  options: RouterOptions,
  apiCollection: T
): Collection<T> {
  function createProxy(
    opts: RouterOptions,
    target: Record<string, unknown>,
    path: string[] = []
  ): Record<string, unknown> {
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
          const mutationDefinition: MutationDefinition = {
            mutationFn: value.mutationFn,
          };
          return {
            mutationOptions: createMutationOptions(opts, mutationDefinition),
          };
        }

        if (value && typeof value === 'object') {
          return createProxy(
            opts,
            value as Record<string, unknown>,
            currentPath
          );
        }

        return value;
      },
    });
  }

  return createProxy(options, apiCollection) as Collection<T>;
}

export function collection<T extends Record<string, unknown>>(
  apiCollection: T
): T {
  return apiCollection;
}

export const operation = {
  query: <TData = unknown, TParams = unknown>(
    queryFn: (opts: RouterOptions, input?: TParams) => Promise<TData>
  ): QueryOperation<TData, TParams> => {
    return {
      _type: 'operation',
      _operationType: 'query',
      queryFn,
    };
  },

  mutation: <TData = unknown, TVariables = unknown>(
    mutationFn: (opts: RouterOptions, input: TVariables) => Promise<TData>
  ): MutationOperation<TData, TVariables> => {
    return {
      _type: 'operation',
      _operationType: 'mutation',
      mutationFn,
    };
  },
};
