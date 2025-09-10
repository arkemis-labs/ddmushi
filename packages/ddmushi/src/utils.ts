import type { QueryKey } from '@tanstack/react-query';
import { createInfiniteQueryOptions } from './infinite-query-options';
import { createMutationOptions } from './mutation-options';
import { createQueryOptions } from './query-options';
import type {
  MutationOperation,
  QueryKind,
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
      const operation = obj[prop];

      if (isQueryOperation(operation)) {
        const query = operation.queryFn;
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
            operation.mutationFn,
            currentPath
          ),
        };
      }

      if (isCollection(operation)) {
        const metadata = opts.collectionMetadata?.get(operation);
        const targetToProxy = metadata?.originalTarget ?? operation;

        return createRecursiveProxy(opts, targetToProxy, currentPath);
      }

      return operation;
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
