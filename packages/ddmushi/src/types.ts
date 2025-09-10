import type {
  QueryKey,
  UseInfiniteQueryOptions,
  UseMutationOptions,
  UseQueryOptions,
  UseSuspenseInfiniteQueryOptions,
  UseSuspenseQueryOptions,
} from '@tanstack/react-query';

export type RuntimeOptions<Ctx extends Record<string, unknown>> = {
  ctx: Ctx;
};

export type DDmushiMeta<Ctx extends Record<string, unknown>> = {
  _config: {
    collections: Map<
      Record<string, unknown>,
      { originalTarget: Record<string, unknown>; isCollection: boolean }
    >;
  };
} & RuntimeOptions<Ctx>;

export type ResolverFn<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TInput = unknown,
> = (resolver: { opts: RuntimeOptions<Ctx>; input?: TInput }) => Promise<TData>;

export interface QueryDefinition<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TParams = unknown,
> {
  queryKey: (params?: TParams) => QueryKey;
  queryFn: ResolverFn<Ctx, TData, TParams>;
}

export interface MutationDefinition<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TVariables = unknown,
> {
  mutationKey?: QueryKey;
  mutationFn: ResolverFn<Ctx, TData, TVariables>;
}

export interface BaseOperation {
  _type: 'operation';
}

export type Collection<T> = {
  [K in keyof T]: T[K] extends QueryOperation<
    infer _Ctx,
    infer Data,
    infer Params
  >
    ? {
        queryOptions: QueryOptionsBuilder<Data, Params>;
        infiniteQueryOptions: InfiniteQueryOptionsBuilder<Data, Params>;
      }
    : T[K] extends MutationOperation<infer _Ctx, infer Data, infer Variables>
      ? { mutationOptions: MutationOptionsBuilder<Data, Variables> }
      : T[K] extends Record<string, unknown>
        ? Collection<T[K]>
        : T[K];
};

export interface QueryOperation<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TParams = unknown,
> extends BaseOperation {
  _operationType: 'query';
  handler: ResolverFn<Ctx, TData, TParams>;
}

export interface MutationOperation<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TVariables = unknown,
> extends BaseOperation {
  _operationType: 'mutation';
  handler: ResolverFn<Ctx, TData, TVariables>;
}

export type QueryOptionsBuilder<TData = unknown, TParams = unknown> = (
  params?: TParams,
  options?: Partial<
    UseQueryOptions<TData, Error, TData, QueryKey> &
      UseSuspenseQueryOptions<TData, Error, TData, QueryKey>
  >
) => UseQueryOptions<TData, Error, TData, QueryKey> &
  UseSuspenseQueryOptions<TData, Error, TData, QueryKey>;

export type InfiniteQueryOptionsBuilder<TData = unknown, TParams = unknown> = <
  TPageParam = unknown,
>(
  params?: TParams,
  options?: Partial<
    UseInfiniteQueryOptions<TData, Error, TData, QueryKey, TPageParam> &
      UseSuspenseInfiniteQueryOptions<TData, Error, TData, QueryKey, TPageParam>
  >
) => UseInfiniteQueryOptions<TData, Error, TData, QueryKey, TPageParam> &
  UseSuspenseInfiniteQueryOptions<TData, Error, TData, QueryKey, TPageParam>;

export type MutationOptionsBuilder<TData = unknown, TVariables = unknown> = (
  options?: Partial<UseMutationOptions<TData, Error, TVariables>>
) => UseMutationOptions<TData, Error, TVariables>;

export type QueryKind = 'query' | 'infinite';
