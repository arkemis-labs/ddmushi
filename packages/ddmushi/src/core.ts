import { createOperationBuilder } from './operation-builder';
import type {
  Collection,
  DDmushiInstance,
  DDmushiMeta,
  RuntimeOptions,
} from './types';
import { createCollectionBuilder } from './utils';

export class DDmushiBuilder<TInput extends Record<string, unknown>> {
  init<Ctx extends Record<string, unknown>>(
    opts: RuntimeOptions<Ctx>
  ): DDmushiInstance<Ctx, TInput> {
    const meta: DDmushiMeta<Ctx> = {
      ...opts,
      _config: {
        collections: new Map(),
      },
    };

    const collection = <T extends Record<string, unknown>>(
      operations: T
    ): Collection<T> => createCollectionBuilder(meta, operations);

    return {
      _meta: meta,
      collection,
      operation: createOperationBuilder<Ctx, TInput>(),
    };
  }
}

export const ddmushi = new DDmushiBuilder<Record<string, unknown>>();
