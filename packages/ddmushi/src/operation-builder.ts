import { createInputMiddleware, createOutputMiddleware } from './middlewares';
import type { AnyParser } from './parser';
import type {
  InferParserInput,
  Middleware,
  MiddlewareOpts,
  Operation,
  OperationBuilder,
  OperationBuilderMeta,
  OperationType,
  ResolverFn,
} from './types';

function execute<
  TType extends OperationType,
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TParams = unknown,
>(
  type: TType,
  handler: ResolverFn<Ctx, TData, TParams>,
  meta: OperationBuilderMeta<Ctx, any>
): Operation<TType, Ctx, TData, TParams> {
  const composedHandler: ResolverFn<Ctx, TData, TParams> = async ({
    input,
    ...handlerOpts
  }) => {
    // Create a composed function that allows middleware to wrap execution
    const executeWithOpts = async (
      opts: MiddlewareOpts<Ctx, TParams>
    ): Promise<TData> => {
      return await handler({
        ...handlerOpts,
        input: opts.input,
        ctx: opts.ctx,
      });
    };

    const composed = meta.middlewares.reduceRight<
      (opts: MiddlewareOpts<Ctx, TParams>) => Promise<TData>
    >(
      (next, middleware) => async (opts) => {
        return (await middleware({
          opts,
          next: async (newOpts) => await next(newOpts),
        })) as TData;
      },
      executeWithOpts
    );

    return await composed({ input, ctx: handlerOpts.ctx });
  };

  return {
    _type: 'operation',
    _operationType: type,
    handler: composedHandler,
  };
}

export function createOperationBuilder<
  Ctx extends Record<string, unknown>,
  TInput = unknown,
>(
  defaultMeta?: Partial<OperationBuilderMeta<Ctx, TInput>>
): OperationBuilder<Ctx, TInput> {
  const _meta: OperationBuilderMeta<Ctx, TInput> = {
    output: undefined,
    ...defaultMeta,
    inputs: defaultMeta?.inputs ?? [],
    middlewares: defaultMeta?.middlewares ?? [],
  };

  return {
    _meta,
    input<TParser extends AnyParser>(
      parser: TParser
    ): OperationBuilder<Ctx, InferParserInput<TParser>> {
      return createOperationBuilder<Ctx, InferParserInput<TParser>>({
        inputs: [..._meta.inputs, parser],
        middlewares: [..._meta.middlewares, createInputMiddleware(parser)],
        output: _meta.output,
      });
    },
    output(parser: AnyParser): OperationBuilder<Ctx, TInput> {
      return createOperationBuilder<Ctx, TInput>({
        ..._meta,
        output: parser,
        middlewares: [..._meta.middlewares, createOutputMiddleware(parser)],
      });
    },
    use(middleware: Middleware<Ctx, any>): OperationBuilder<Ctx, TInput> {
      return createOperationBuilder<Ctx, TInput>({
        ..._meta,
        middlewares: [..._meta.middlewares, middleware],
      });
    },
    query<TData = unknown, TParams = TInput>(
      handler: ResolverFn<Ctx, TData, TParams>
    ): Operation<'query', Ctx, TData, TParams> {
      return execute('query', handler, _meta);
    },
    mutation<TData = unknown, TVariables = TInput>(
      handler: ResolverFn<Ctx, TData, TVariables>
    ): Operation<'mutation', Ctx, TData, TVariables> {
      return execute('mutation', handler, _meta);
    },
  };
}
