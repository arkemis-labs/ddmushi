import type {
  Collection,
  MutationDefinition,
  MutationOperation,
  QueryOperation,
} from './types';
import {
  createMutationOptions,
  createQueryOptionsFromOperation,
  isMutationOperation,
  isQueryOperation,
} from './utils';

export function router<T extends Record<string, unknown>>(
  apiCollection: T
): Collection<T> {
  function createProxy(
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
            queryOptions: createQueryOptionsFromOperation(value, currentPath),
          };
        }

        if (isMutationOperation(value)) {
          const mutationDefinition: MutationDefinition = {
            mutationFn: value.mutationFn,
          };
          return {
            mutationOptions: createMutationOptions(mutationDefinition),
          };
        }

        if (value && typeof value === 'object') {
          return createProxy(value as Record<string, unknown>, currentPath);
        }

        return value;
      },
    });
  }

  return createProxy(apiCollection) as Collection<T>;
}

export function collection<T extends Record<string, unknown>>(
  apiCollection: T
): T {
  return apiCollection;
}

export const operation = {
  query: <TData = unknown, TParams = unknown>(
    queryFn:
      | ((input?: TParams) => Promise<TData>)
      | ((input: TParams) => Promise<TData>)
  ): QueryOperation<TData, TParams> => {
    return {
      _type: 'operation',
      _operationType: 'query',
      queryFn: queryFn as (input?: TParams) => Promise<TData>,
    };
  },

  mutation: <TData = unknown, TVariables = unknown>(
    mutationFn: (input: TVariables) => Promise<TData>
  ): MutationOperation<TData, TVariables> => {
    return {
      _type: 'operation',
      _operationType: 'mutation',
      mutationFn,
    };
  },
};
