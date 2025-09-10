import { describe, expect, it } from 'vitest';
import { createRouter } from '../core';

describe('React Query integration', () => {
  describe('Query options generation', () => {
    it('should generate proper query options for basic queries', () => {
      const router = createRouter({
        ctx: {
          apiUrl: 'https://api.example.com',
          token: 'test-token',
        },
      });

      const userApi = router.collection('userApi', {
        getUser: router.operation.query<{ id: string; name: string }, string>(
          ({ ctx: _ }, userId) => {
            return Promise.resolve({
              id: userId || 'default',
              name: 'John Doe',
            });
          }
        ),
      });

      // Test query options generation
      const queryOptions = userApi.getUser.queryOptions('user-123');

      expect(queryOptions.queryKey).toEqual([
        'userApi',
        'getUser',
        { input: 'user-123', kind: 'query' },
      ]);
      expect(queryOptions.queryFn).toBeTypeOf('function');
    });

    it('should generate query options with additional React Query options', () => {
      const router = createRouter({
        ctx: { baseUrl: 'https://api.test.com' },
      });

      const api = router.collection('api', {
        getProfile: router.operation.query<{ profile: string }>(() =>
          Promise.resolve({ profile: 'test-profile' })
        ),
      });

      // Test with additional options
      const queryOptions = api.getProfile.queryOptions(undefined, {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 3,
      });

      expect(queryOptions.queryKey).toEqual([
        'api',
        'getProfile',
        { kind: 'query' },
      ]);
      expect(queryOptions.staleTime).toBe(5 * 60 * 1000);
      expect(queryOptions.gcTime).toBe(10 * 60 * 1000);
      expect(queryOptions.retry).toBe(3);
    });

    it('should handle nested collection query options', () => {
      const router = createRouter({
        ctx: { env: 'test' },
      });

      const api = router.collection('api', {
        users: router.collection('users', {
          posts: router.collection('posts', {
            list: router.operation.query<
              Array<{ id: string; title: string }>,
              { userId: string }
            >(() => {
              return Promise.resolve([
                { id: '1', title: 'Post 1' },
                { id: '2', title: 'Post 2' },
              ]);
            }),
          }),
        }),
      });

      const queryOptions = api.users.posts.list.queryOptions({
        userId: 'user-123',
      });

      expect(queryOptions.queryKey).toEqual([
        'api',
        'users',
        'posts',
        'list',
        { input: { userId: 'user-123' }, kind: 'query' },
      ]);
    });
  });

  describe('Infinite query options generation', () => {
    it('should generate proper infinite query options for queries', () => {
      const router = createRouter({
        ctx: { env: 'test' },
      });

      const api = router.collection('api', {
        listItems: router.operation.query<
          Array<{ id: string }>,
          { input?: number }
        >(() => Promise.resolve([{ id: '1' }])),
      });

      const options = api.listItems.infiniteQueryOptions({ input: 1 });

      expect(options.queryKey).toEqual([
        'api',
        'listItems',
        { input: { input: 1 }, kind: 'infinite' },
      ]);
    });
  });

  describe('Mutation options generation', () => {
    it('should generate proper mutation options', () => {
      const router = createRouter({
        ctx: { apiKey: 'test-key' },
      });

      const userApi = router.collection('userApi', {
        createUser: router.operation.mutation<
          { id: string; success: boolean },
          { name: string; email: string }
        >(() => {
          return Promise.resolve({ id: 'new-user-id', success: true });
        }),
      });

      const mutationOptions = userApi.createUser.mutationOptions();

      expect(mutationOptions.mutationFn).toBeTypeOf('function');
      expect(mutationOptions.mutationKey).toEqual(['userApi', 'createUser']);
    });

    it('should support mutation options with additional React Query options', () => {
      const router = createRouter({
        ctx: { database: 'test-db' },
      });

      const postApi = router.collection('postApi', {
        updatePost: router.operation.mutation<
          { updated: boolean },
          { id: string; title: string }
        >(() => {
          return Promise.resolve({ updated: true });
        }),
      });

      const mutationOptions = postApi.updatePost.mutationOptions({
        retry: 2,
        onSuccess: () => {
          // Mock success handler
        },
      });

      expect(mutationOptions.retry).toBe(2);
      expect(mutationOptions.onSuccess).toBeTypeOf('function');
    });
  });

  describe('Query execution', () => {
    it('should execute queries with proper context and parameters', async () => {
      const router = createRouter({
        ctx: {
          userId: 'current-user',
          permissions: ['read', 'write'],
        },
      });

      const dataApi = router.collection('dataApi', {
        getData: router.operation.query<
          { items: string[]; user: string },
          { category: string }
        >(({ ctx }, params) => {
          return Promise.resolve({
            items: [`item-${params?.category || 'default'}`],
            user: ctx.userId,
          });
        }),
      });

      const queryOptions = dataApi.getData.queryOptions({ category: 'books' });

      const result = await (
        queryOptions.queryFn as () => Promise<{ items: string[]; user: string }>
      )();

      expect(result).toEqual({
        items: ['item-books'],
        user: 'current-user',
      });
    });

    it('should handle queries without parameters', async () => {
      const router = createRouter({
        ctx: { version: '2.0.0' },
      });

      const appApi = router.collection('appApi', {
        getVersion: router.operation.query<{
          version: string;
          timestamp: number;
        }>(({ ctx }) =>
          Promise.resolve({
            version: ctx.version,
            timestamp: Date.now(),
          })
        ),
      });

      const queryOptions = appApi.getVersion.queryOptions();

      // @ts-expect-error
      // biome-ignore lint/style/noNonNullAssertion: test
      const result = await queryOptions.queryFn!();

      expect(result.version).toBe('2.0.0');
      expect(result.timestamp).toBeTypeOf('number');
    });
  });

  describe('Type safety', () => {
    it('should maintain proper TypeScript types through the chain', () => {
      const router = createRouter({
        ctx: {
          database: 'test-db',
          user: { id: 'user-123', role: 'admin' as const },
        },
      });

      const typedApi = router.collection('typedApi', {
        getUser: router.operation.query<
          { id: string; name: string; role: 'admin' | 'user' },
          { userId: string }
        >(({ ctx }, params) => {
          // TypeScript should infer the correct types here
          const userId: string = params?.userId || ctx.user.id;
          const userRole: 'admin' | 'user' = ctx.user.role;

          return Promise.resolve({
            id: userId,
            name: 'Test User',
            role: userRole,
          });
        }),
      });

      // The query options should maintain the correct types
      const queryOptions = typedApi.getUser.queryOptions({
        userId: 'test-123',
      });

      // This should be typed correctly
      expect(queryOptions).toBeDefined();
      expect(queryOptions.queryKey).toEqual([
        'typedApi',
        'getUser',
        { input: { userId: 'test-123' }, kind: 'query' },
      ]);
    });
  });
});
