import { createOperationBuilder } from './operation-builder';
import type { Collection, DDmushiMeta, RuntimeOptions } from './types';
import { createRecursiveProxy } from './utils';

export class DDmushiBuilder {
  init<Ctx extends Record<string, unknown>>(opts: RuntimeOptions<Ctx>) {
    const meta: DDmushiMeta<Ctx> = {
      ...opts,
      _config: {
        collections: new Map(),
      },
    };

    return {
      _meta: meta,
      collection: <T extends Record<string, unknown>>(
        operations: T
      ): Collection<T> => {
        return createRecursiveProxy(meta, operations) as Collection<T>;
      },
      operation: createOperationBuilder<Ctx>(),
    };
  }
}

export const ddmushi = new DDmushiBuilder();
