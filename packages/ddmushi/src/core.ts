import type {
  Collection,
  DDmushiMeta,
  MutationOperation,
  QueryOperation,
  ResolverFn,
  RuntimeOptions,
} from './types';
import { createRecursiveProxy } from './utils';

function createOperationBuilder<Ctx extends Record<string, unknown>>() {
  return {
    query<TData = unknown, TParams = unknown>(
      handler: ResolverFn<Ctx, TData, TParams>
    ): QueryOperation<Ctx, TData, TParams> {
      return {
        _type: 'operation',
        _operationType: 'query',
        handler,
      };
    },
    mutation<TData, TVariables>(
      handler: ResolverFn<Ctx, TData, TVariables>
    ): MutationOperation<Ctx, TData, TVariables> {
      return {
        _type: 'operation',
        _operationType: 'mutation',
        handler,
      };
    },
  };
}

export class DDmushiBuilder {
  create<Ctx extends Record<string, unknown>>(opts: RuntimeOptions<Ctx>) {
    const meta: DDmushiMeta<Ctx> = {
      ...opts,
      _config: {
        collections: new Map(),
      },
    };

    return {
      _meta: meta,
      collection: <T extends Record<string, unknown>>(
        operations: T
      ): Collection<T> => {
        return createRecursiveProxy(meta, operations) as Collection<T>;
      },
      operation: createOperationBuilder<Ctx>(),
    };
  }
}

export const ddmushi = new DDmushiBuilder();
