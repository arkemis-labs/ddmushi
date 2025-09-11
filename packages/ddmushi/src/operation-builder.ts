import type { AnyParser } from './parser';
import type { Middleware, Operation, OperationType, ResolverFn } from './types';

type OperationBuilderMeta<Ctx extends Record<string, unknown>> = {
  inputs: AnyParser[];
  output?: AnyParser;
  middlewares: Middleware<Ctx>[];
};

export type OperationBuilder<Ctx extends Record<string, unknown>> = {
  _meta: OperationBuilderMeta<Ctx>;
  use(middleware: Middleware<Ctx>): OperationBuilder<Ctx>;
  query<TData = unknown, TParams = unknown>(
    handler: ResolverFn<Ctx, TData, TParams>
  ): Operation<'query', Ctx, TData, TParams>;
  mutation<TData, TVariables>(
    handler: ResolverFn<Ctx, TData, TVariables>
  ): Operation<'mutation', Ctx, TData, TVariables>;
};

function execute<
  TType extends OperationType,
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TParams = unknown,
>(
  type: TType,
  handler: ResolverFn<Ctx, TData, TParams>,
  meta: OperationBuilderMeta<Ctx>
): Operation<TType, Ctx, TData, TParams> {
  const composedHandler: ResolverFn<Ctx, TData, TParams> = async ({
    input,
    opts,
  }) => {
    // Create a composed function that allows middleware to wrap execution
    const executeWithCtx = async (ctx: Ctx): Promise<TData> => {
      return await handler({ input, opts: { ...opts, ctx } });
    };

    const composed = meta.middlewares.reduceRight<(ctx: Ctx) => Promise<TData>>(
      (next, middleware) => async (ctx) => {
        return (await middleware({
          ctx,
          next: async (newCtx) => {
            return await next(newCtx);
          },
        })) as Promise<TData>;
      },
      executeWithCtx
    );

    return await composed(opts.ctx);
  };

  return {
    _type: 'operation',
    _operationType: type,
    handler: composedHandler,
  };
}

export function createOperationBuilder<Ctx extends Record<string, unknown>>(
  defaultMeta?: Partial<OperationBuilderMeta<Ctx>>
) {
  const _meta: OperationBuilderMeta<Ctx> = {
    inputs: [],
    output: undefined,
    middlewares: [],
    ...defaultMeta,
  };

  return {
    _meta,
    use(middleware: Middleware<Ctx>): OperationBuilder<Ctx> {
      return createOperationBuilder({
        ..._meta,
        middlewares: [..._meta.middlewares, middleware],
      });
    },
    query<TData = unknown, TParams = unknown>(
      handler: ResolverFn<Ctx, TData, TParams>
    ): Operation<'query', Ctx, TData, TParams> {
      return execute('query', handler, _meta);
    },
    mutation<TData, TVariables>(
      handler: ResolverFn<Ctx, TData, TVariables>
    ): Operation<'mutation', Ctx, TData, TVariables> {
      return execute('mutation', handler, _meta);
    },
  };
}
