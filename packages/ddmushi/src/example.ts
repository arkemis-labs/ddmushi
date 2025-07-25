import { createRouter } from './core';

const router = createRouter({
  ctx: {
    test: 'test',
  },
});

export const paperwork = router.collection({
  list: router.operation.query<{ id: string }, string>(
    async ({ ctx: { test } }, input) => {
      return await Promise.resolve({ id: input ?? test });
    }
  ),
});

// Example usage - the return type { id: string } is automatically inferred:
// const opts = paperwork.list.queryOptions('test');
