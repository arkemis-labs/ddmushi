import type {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';

export type RouterOptions<Ctx extends Record<string, unknown>> = {
  ctx: Ctx;
  collectionMetadata?: Map<
    Record<string, unknown>,
    { originalTarget: Record<string, unknown>; isCollection: boolean }
  >;
};

export type QueryFn<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TParams = unknown,
> = (opts: RouterOptions<Ctx>, input?: TParams) => Promise<TData>;

export type MutationFn<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TVariables = unknown,
> = (opts: RouterOptions<Ctx>, input: TVariables) => Promise<TData>;

export interface QueryDefinition<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TParams = unknown,
> {
  queryKey: (params?: TParams) => QueryKey;
  queryFn: QueryFn<Ctx, TData, TParams>;
}

export interface MutationDefinition<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TVariables = unknown,
> {
  mutationKey?: QueryKey;
  mutationFn: MutationFn<Ctx, TData, TVariables>;
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
    ? { queryOptions: QueryOptionsBuilder<Data, Params> }
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
  queryFn: QueryFn<Ctx, TData, TParams>;
}

export interface MutationOperation<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TVariables = unknown,
> extends BaseOperation {
  _operationType: 'mutation';
  mutationFn: MutationFn<Ctx, TData, TVariables>;
}

export type QueryOptionsBuilder<TData = unknown, TParams = unknown> = (
  params?: TParams,
  options?: Partial<UseQueryOptions<TData, Error, TData, QueryKey>>
) => UseQueryOptions<TData, Error, TData, QueryKey>;

export type MutationOptionsBuilder<TData = unknown, TVariables = unknown> = (
  options?: Partial<UseMutationOptions<TData, Error, TVariables>>
) => UseMutationOptions<TData, Error, TVariables>;
