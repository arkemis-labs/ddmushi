import { describe, expect, it } from 'vitest';
import { ddmushi } from '../core';

describe('ddmushi core functionality', () => {
  describe('Router creation', () => {
    it('should create a router with context', () => {
      const router = ddmushi.init({
        ctx: {
          userId: 'test-user-123',
          apiKey: 'test-api-key',
        },
      });

      expect(router).toBeDefined();
      expect(router._meta.ctx.userId).toBe('test-user-123');
      expect(router._meta.ctx.apiKey).toBe('test-api-key');
      expect(router.operation).toBeDefined();
    });
  });

  describe('Operation creation', () => {
    it('should create query operations', () => {
      const router = ddmushi.init({
        ctx: { test: 'value' },
      });

      const queryOp = router.operation.query<string, { id: string }>(
        ({ input, opts: { ctx } }) => {
          return Promise.resolve(input?.id || ctx.test);
        }
      );

      expect(queryOp._type).toBe('operation');
      expect(queryOp._operationType).toBe('query');
      expect(queryOp.handler).toBeTypeOf('function');
    });

    it('should create mutation operations', () => {
      const router = ddmushi.init({
        ctx: { test: 'value' },
      });

      const mutationOp = router.operation.mutation<
        { success: boolean },
        { name: string }
      >(() => {
        return Promise.resolve({ success: true });
      });

      expect(mutationOp._type).toBe('operation');
      expect(mutationOp._operationType).toBe('mutation');
      expect(mutationOp.handler).toBeTypeOf('function');
    });
  });

  describe('Collection creation', () => {
    it('should create a collection with operations', () => {
      const router = ddmushi.init({
        ctx: {
          database: 'test-db',
          userId: 'user-123',
        },
      });

      const userCollection = router.collection({
        getUser: router.operation.query<{ id: string; name: string }, string>(
          ({ input, opts: { ctx } }) => {
            return Promise.resolve({
              id: input || ctx.userId,
              name: 'Test User',
            });
          }
        ),
        updateUser: router.operation.mutation<
          { success: boolean },
          { id: string; name: string }
        >(() => {
          return Promise.resolve({ success: true });
        }),
      });

      expect(userCollection).toBeDefined();
      expect(userCollection.getUser).toBeDefined();
      expect(userCollection.updateUser).toBeDefined();
    });

    it('should support nested collections', () => {
      const router = ddmushi.init({
        ctx: { apiUrl: 'https://api.test.com' },
      });

      const api = router.collection({
        users: router.collection({
          list: router.operation.query<Array<{ id: string }>, void>(() => {
            return Promise.resolve([{ id: '1' }, { id: '2' }]);
          }),
        }),
        posts: router.collection({
          create: router.operation.mutation<
            { id: string },
            { title: string; content: string }
          >(() => {
            return Promise.resolve({ id: 'post-123' });
          }),
        }),
      });

      expect(api.users).toBeDefined();
      expect(api.posts).toBeDefined();
      expect(api.users.list).toBeDefined();
      expect(api.posts.create).toBeDefined();
    });
  });

  describe('Context inference', () => {
    it('should properly infer and pass context to operations', async () => {
      const mockCtx = {
        database: 'test-db',
        currentUser: { id: 'user-123', role: 'admin' },
        config: { timeout: 5000 },
      };

      const router = ddmushi.init({ ctx: mockCtx });

      // Create a query operation that uses the context
      const testQuery = router.operation.query<
        { data: string; user: string },
        { filter: string }
      >(async ({ input, opts: { ctx } }) => {
        // Context should be properly typed and available
        expect(ctx.database).toBe('test-db');
        expect(ctx.currentUser.id).toBe('user-123');
        expect(ctx.config.timeout).toBe(5000);

        return await Promise.resolve({
          data: `Filtered by: ${input?.filter || 'none'}`,
          user: ctx.currentUser.id,
        });
      });

      // Test the query function directly
      const result = await testQuery.handler({
        opts: { ctx: mockCtx },
        input: { filter: 'active' },
      });

      expect(result).toEqual({
        data: 'Filtered by: active',
        user: 'user-123',
      });
    });

    it('should handle different context types', async () => {
      // Test with minimal context
      const simpleRouter = ddmushi.init({
        ctx: { version: '1.0.0' },
      });

      const simpleQuery = simpleRouter.operation.query<
        { version: string },
        void
      >(async ({ opts: { ctx } }) => ({ version: ctx.version }));

      const result = await simpleQuery.handler({
        opts: { ctx: { version: '1.0.0' } },
      });
      expect(result.version).toBe('1.0.0');
    });
  });
});
