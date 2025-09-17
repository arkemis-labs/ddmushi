import {
  type DefinedInitialDataInfiniteOptions,
  infiniteQueryOptions,
  type QueryFunction,
  type QueryKey,
  type UndefinedInitialDataInfiniteOptions,
  type UnusedSkipTokenInfiniteOptions,
} from '@tanstack/react-query';
import type { ResolverFn, RuntimeOptions } from './types';
import { buildQueryKey } from './utils';

type AnyInfiniteQueryOptions =
  | DefinedInitialDataInfiniteOptions<any, any, any, any, any>
  | UnusedSkipTokenInfiniteOptions<any, any, any, any, any>
  | UndefinedInitialDataInfiniteOptions<any, any, any, any, any>;

export function createInfiniteQueryOptions<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TParams = unknown,
>(
  opts: RuntimeOptions<Ctx>,
  query: ResolverFn<'query', Ctx, TData, TParams>,
  path: readonly string[]
) {
  return (input: TParams, options: AnyInfiniteQueryOptions) => {
    const queryKey = buildQueryKey(path, input, 'infinite');

    const queryFn: QueryFunction<unknown, QueryKey, unknown> = async (
      context
    ) => {
      return await query({ ...context, ...opts, input });
    };

    return infiniteQueryOptions({
      ...options,
      queryKey,
      queryFn,
    });
  };
}
