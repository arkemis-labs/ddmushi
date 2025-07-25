import type {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';

export type RouterOptions = {
  ctx?: Record<string, unknown>;
};

export type QueryFn<TData = unknown, TParams = unknown> = (
  opts: RouterOptions,
  input?: TParams
) => Promise<TData>;

export type MutationFn<TData = unknown, TVariables = unknown> = (
  opts: RouterOptions,
  input: TVariables
) => Promise<TData>;

export interface QueryDefinition<TData = unknown, TParams = unknown> {
  queryKey: (params?: TParams) => QueryKey;
  queryFn: QueryFn<TData, TParams>;
}

export interface MutationDefinition<TData = unknown, TVariables = unknown> {
  mutationKey?: QueryKey;
  mutationFn: MutationFn<TData, TVariables>;
}

export interface BaseOperation {
  _type: 'operation';
}

export type Collection<T> = {
  [K in keyof T]: T[K] extends QueryOperation<infer Data, infer Params>
    ? { queryOptions: QueryOptionsBuilder<Data, Params> }
    : T[K] extends MutationOperation<infer Data, infer Variables>
      ? { mutationOptions: MutationOptionsBuilder<Data, Variables> }
      : T[K] extends Record<string, unknown>
        ? Collection<T[K]>
        : T[K];
};

export interface QueryOperation<TData = unknown, TParams = unknown>
  extends BaseOperation {
  _operationType: 'query';
  queryFn: QueryFn<TData, TParams>;
}

export interface MutationOperation<TData = unknown, TVariables = unknown>
  extends BaseOperation {
  _operationType: 'mutation';
  mutationFn: MutationFn<TData, TVariables>;
}

export type Operation = QueryOperation | MutationOperation;

export type QueryOptionsBuilder<TData = unknown, TParams = unknown> = (
  params?: TParams,
  options?: Partial<UseQueryOptions<TData, Error, TData, QueryKey>>
) => UseQueryOptions<TData, Error, TData, QueryKey>;

export type MutationOptionsBuilder<TData = unknown, TVariables = unknown> = (
  options?: Partial<UseMutationOptions<TData, Error, TVariables>>
) => UseMutationOptions<TData, Error, TVariables>;
