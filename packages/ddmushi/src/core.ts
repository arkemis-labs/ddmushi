import type {
  Collection,
  MutationFn,
  MutationOperation,
  QueryOperation,
  RouterOptions,
} from './types';
import { createRecursiveProxy } from './utils';

class OperationBuilder<Ctx extends Record<string, unknown>> {
  query<TData = unknown, TParams = unknown>(
    queryFn: (opts: RouterOptions<Ctx>, input?: TParams) => Promise<TData>
  ): QueryOperation<Ctx, TData, TParams> {
    return {
      _type: 'operation',
      _operationType: 'query',
      queryFn,
    };
  }

  mutation<TData, TVariables>(
    mutationFn: MutationFn<Ctx, TData, TVariables>
  ): MutationOperation<Ctx, TData, TVariables> {
    return {
      _type: 'operation',
      _operationType: 'mutation',
      mutationFn,
    };
  }
}

class Router<Ctx extends Record<string, unknown>> {
  options: RouterOptions<Ctx>;
  operation: OperationBuilder<Ctx>;

  constructor(opts: RouterOptions<Ctx>) {
    if (!opts.collectionMetadata) {
      opts.collectionMetadata = new Map();
    }
    this.options = opts;
    this.operation = new OperationBuilder<Ctx>();
  }

  collection<T extends Record<string, unknown>>(operations: T): Collection<T> {
    return createRecursiveProxy(this.options, operations) as Collection<T>;
  }
}

export function createRouter<Ctx extends Record<string, unknown>>(
  options: RouterOptions<Ctx>
): Router<Ctx> {
  return new Router(options);
}
