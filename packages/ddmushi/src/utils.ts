import type { QueryKey } from '@tanstack/react-query';
import { createInfiniteQueryOptions } from './infinite-query-options';
import { createMutationOptions } from './mutation-options';
import { createQueryOptions } from './query-options';
import type { Collection, DDmushiMeta, Operation, QueryKind } from './types';

export function createCollectionBuilder<
  TMeta extends DDmushiMeta<Record<string, unknown>>,
  T extends Record<string, unknown>,
>(meta: TMeta, target: T, path: string[] = []): Collection<T> {
  const { _config, ...opts } = meta;
  const proxy = new Proxy(target, {
    get(obj, prop) {
      if (typeof prop !== 'string') {
        return Reflect.get(obj, prop);
      }

      const currentPath = [...path, prop];
      const operation = obj[prop];

      if (isQueryOperation(operation)) {
        const query = operation.handler;
        return {
          queryOptions: createQueryOptions(opts, query, currentPath),
          infiniteQueryOptions: createInfiniteQueryOptions(
            opts,
            query,
            currentPath
          ),
        };
      }

      if (isMutationOperation(operation)) {
        return {
          mutationOptions: createMutationOptions(
            opts,
            operation.handler,
            currentPath
          ),
        };
      }

      if (isCollection(operation)) {
        const metadata = _config.collections.get(operation);
        const targetToProxy = metadata?.originalTarget ?? operation;

        return createCollectionBuilder(meta, targetToProxy, currentPath);
      }

      return operation;
    },
  });

  // track collections
  _config.collections.set(proxy as Record<string, unknown>, {
    originalTarget: target,
    isCollection: true,
  });

  return proxy as Collection<T>;
}

function isCollection(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isQueryOperation(
  definition: unknown
): definition is Operation<'query', Record<string, unknown>, unknown, unknown> {
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
): definition is Operation<
  'mutation',
  Record<string, unknown>,
  unknown,
  unknown
> {
  return Boolean(
    definition &&
      typeof definition === 'object' &&
      '_type' in definition &&
      definition._type === 'operation' &&
      '_operationType' in definition &&
      definition._operationType === 'mutation'
  );
}

export function buildQueryKey(
  path: readonly string[],
  input: unknown,
  kind?: QueryKind
): QueryKey {
  if (!(input || kind)) {
    return path.length ? path : [];
  }

  return [
    ...path,
    {
      ...(typeof input !== 'undefined' && { input }),
      kind,
    },
  ];
}

export function buildMutationKey(path: readonly string[]) {
  return buildQueryKey(path, undefined);
}
