import type {
  MutationFunction,
  UseMutationOptions,
} from '@tanstack/react-query';
import type { ResolverFn, RuntimeOptions } from './types';
import { buildMutationKey } from './utils';

type AnyMutationOptions = UseMutationOptions<any, any, any>;

export function createMutationOptions<
  Ctx extends Record<string, unknown>,
  TData = unknown,
  TVariables = unknown,
>(
  opts: RuntimeOptions<Ctx>,
  mutate: ResolverFn<Ctx, TData, TVariables>,
  path: readonly string[]
) {
  return (options: AnyMutationOptions): AnyMutationOptions => {
    const mutationKey = buildMutationKey(path);

    const mutationFn: MutationFunction<TData, TVariables> = async (input) =>
      await mutate({ ...opts, input });

    return {
      ...options,
      mutationKey,
      mutationFn,
    };
  };
}
