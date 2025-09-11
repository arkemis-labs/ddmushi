import {
  type DefinedInitialDataOptions,
  type QueryFunction,
  type QueryKey,
  queryOptions,
  type UndefinedInitialDataOptions,
  type UnusedSkipTokenOptions,
} from '@tanstack/react-query';
import type { ResolverFn, RuntimeOptions } from './types';
import { buildQueryKey } from './utils';

type AnyQueryOptions =
  | DefinedInitialDataOptions<any, any, any, any>
  | UndefinedInitialDataOptions<any, any, any, any>
  | UnusedSkipTokenOptions<any, any, any, any>;

export function createQueryOptions<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TParams = unknown,
>(
  opts: RuntimeOptions<Ctx>,
  query: ResolverFn<Ctx, TData, TParams>,
  path: readonly string[]
) {
  return (input: TParams, options: AnyQueryOptions) => {
    const queryKey = buildQueryKey(path, input, 'query');
    const queryFn: QueryFunction<unknown, QueryKey> = async () => {
      return await query({ ...opts, input });
    };

    return queryOptions({
      ...options,
      queryKey,
      queryFn,
    });
  };
}
