import { describe, expect, it, vi } from 'vitest';
import { collection, operation, router } from '../core';

describe('integration tests', () => {
  describe('router context propagation', () => {
    it('should pass router context to query operations', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

      const apiCollection = collection({
        getUser: operation.query(queryFn),
      });

      // Create router with context
      const routerContext = {
        user: { id: 123, role: 'admin' },
        tenant: 'acme-corp',
        requestId: 'req-456',
      };
      const api = router({ ctx: routerContext }, apiCollection);

      // Execute query
      const queryOptions = api.getUser.queryOptions({ id: 1 });
      // @ts-expect-error - queryFn is a function
      await queryOptions.queryFn();

      // Verify context was passed to query function
      expect(queryFn).toHaveBeenCalledWith({ ctx: routerContext }, { id: 1 });
    });

    it('should pass router context to mutation operations', async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });

      const apiCollection = collection({
        createUser: operation.mutation(mutationFn),
      });

      // Create router with context
      const routerContext = {
        user: { id: 123, role: 'admin' },
        tenant: 'acme-corp',
        permissions: ['create:user'],
      };
      const api = router({ ctx: routerContext }, apiCollection);

      // Execute mutation
      const mutationOptions = api.createUser.mutationOptions();
      if (mutationOptions.mutationFn) {
        await mutationOptions.mutationFn({ name: 'John' });
      }

      // Verify context was passed to mutation function
      expect(mutationFn).toHaveBeenCalledWith(
        { ctx: routerContext },
        { name: 'John' }
      );
    });

    it('should pass router context to nested operations', async () => {
      const profileQueryFn = vi.fn().mockResolvedValue({ profile: 'data' });
      const settingsMutationFn = vi.fn().mockResolvedValue({ updated: true });

      const apiCollection = collection({
        users: {
          profile: {
            get: operation.query(profileQueryFn),
            settings: {
              update: operation.mutation(settingsMutationFn),
            },
          },
        },
      });

      // Create router with context
      const routerContext = {
        user: { id: 789, role: 'user' },
        session: { id: 'sess-123', expires: '2024-12-31' },
      };
      const api = router({ ctx: routerContext }, apiCollection);

      // Test nested query
      const profileOptions = api.users.profile.get.queryOptions({
        userId: 789,
      });
      // @ts-expect-error - queryFn is a function
      await profileOptions.queryFn();

      expect(profileQueryFn).toHaveBeenCalledWith(
        { ctx: routerContext },
        { userId: 789 }
      );

      // Test deeply nested mutation
      const settingsOptions =
        api.users.profile.settings.update.mutationOptions();
      if (settingsOptions.mutationFn) {
        await settingsOptions.mutationFn({ theme: 'dark' });
      }

      expect(settingsMutationFn).toHaveBeenCalledWith(
        { ctx: routerContext },
        { theme: 'dark' }
      );
    });

    it('should work with empty context', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

      const apiCollection = collection({
        getData: operation.query(queryFn),
      });

      // Create router with empty context
      const api = router({ ctx: {} }, apiCollection);

      const queryOptions = api.getData.queryOptions();
      // @ts-expect-error - queryFn is a function
      await queryOptions.queryFn();

      expect(queryFn).toHaveBeenCalledWith({ ctx: {} }, undefined);
    });

    it('should work without explicit context (default empty)', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

      const apiCollection = collection({
        getData: operation.query(queryFn),
      });

      // Create router without explicit context (should default to empty RouterOptions)
      const api = router({}, apiCollection);

      const queryOptions = api.getData.queryOptions();
      // @ts-expect-error - queryFn is a function
      await queryOptions.queryFn();

      expect(queryFn).toHaveBeenCalledWith({}, undefined);
    });

    it('should handle complex context with multiple data types', async () => {
      const operationFn = vi.fn().mockResolvedValue({ result: 'success' });

      const apiCollection = collection({
        complexOperation: operation.query(operationFn),
      });

      // Create router with complex context containing various data types
      const complexContext = {
        user: {
          id: 123,
          role: 'admin',
          permissions: ['read', 'write', 'delete'],
          metadata: { lastLogin: new Date('2024-01-01'), loginCount: 42 },
        },
        tenant: 'acme-corp',
        features: {
          enableNewUI: true,
          maxFileSize: 10_485_760,
          allowedDomains: ['acme.com', 'acme.org'],
        },
        request: {
          id: 'req-789',
          timestamp: 1_704_067_200_000,
          userAgent: 'Mozilla/5.0...',
        },
      };

      const api = router({ ctx: complexContext }, apiCollection);

      const queryOptions = api.complexOperation.queryOptions({ param: 'test' });
      // @ts-expect-error - queryFn is a function
      await queryOptions.queryFn();

      expect(operationFn).toHaveBeenCalledWith(
        { ctx: complexContext },
        { param: 'test' }
      );
    });

    it('should maintain context isolation between different router instances', async () => {
      const queryFn1 = vi.fn().mockResolvedValue({ data: 'router1' });
      const queryFn2 = vi.fn().mockResolvedValue({ data: 'router2' });

      const collection1 = collection({
        getData: operation.query(queryFn1),
      });

      const collection2 = collection({
        getData: operation.query(queryFn2),
      });

      // Create two routers with different contexts
      const context1 = { user: { id: 1, name: 'User1' } };
      const context2 = { user: { id: 2, name: 'User2' } };

      const api1 = router({ ctx: context1 }, collection1);
      const api2 = router({ ctx: context2 }, collection2);

      // Execute operations on both routers
      const options1 = api1.getData.queryOptions();
      const options2 = api2.getData.queryOptions();

      // @ts-expect-error - queryFn is a function
      await options1.queryFn();
      // @ts-expect-error - queryFn is a function
      await options2.queryFn();

      // Verify each router used its own context
      expect(queryFn1).toHaveBeenCalledWith({ ctx: context1 }, undefined);
      expect(queryFn2).toHaveBeenCalledWith({ ctx: context2 }, undefined);
    });
  });

  describe('complete API workflow', () => {
    it('should work with a realistic API collection', async () => {
      // Mock API functions
      const fetchUser = vi
        .fn()
        .mockImplementation((_opts, input?: { id: number }) => {
          return {
            id: input?.id || 1,
            name: 'John Doe',
            email: 'john@example.com',
          };
        });

      const createUser = vi
        .fn()
        .mockImplementation((_opts, input: { name: string; email: string }) => {
          return { id: Math.random(), ...input };
        });

      const updateUser = vi
        .fn()
        .mockImplementation(
          (_opts, input: { id: number; name?: string; email?: string }) => {
            return {
              id: input.id,
              name: input.name || 'John Doe',
              email: input.email || 'john@example.com',
            };
          }
        );

      const deleteUser = vi
        .fn()
        .mockImplementation((_opts, input: { id: number }) => {
          return { success: true, id: input.id };
        });

      // Define API collection [[memory:3593396]]
      const apiCollection = collection({
        users: {
          get: operation.query(fetchUser),
          create: operation.mutation(createUser),
          update: operation.mutation(updateUser),
          delete: operation.mutation(deleteUser),
          profile: {
            get: operation.query(fetchUser),
            settings: {
              update: operation.mutation(updateUser),
            },
          },
        },
      });

      // Create router
      const api = router({}, apiCollection);

      // Test query operation
      const getUserQueryOptions = api.users.get.queryOptions({
        id: 1,
      });
      expect(getUserQueryOptions.queryKey).toEqual(['users', 'get', { id: 1 }]);

      // @ts-expect-error - queryFn is a function
      const userData = await getUserQueryOptions.queryFn();
      expect(fetchUser).toHaveBeenCalledWith({}, { id: 1 });
      expect(userData).toEqual({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      });

      // Test mutation operation
      const createUserMutationOptions = api.users.create.mutationOptions();
      expect(typeof createUserMutationOptions.mutationFn).toBe('function');

      // @ts-expect-error - mutationFn is a function
      const newUser = await createUserMutationOptions.mutationFn({
        name: 'Jane Doe',
        email: 'jane@example.com',
      });
      expect(createUser).toHaveBeenCalledWith(
        {},
        {
          name: 'Jane Doe',
          email: 'jane@example.com',
        }
      );
      expect(newUser).toMatchObject({
        name: 'Jane Doe',
        email: 'jane@example.com',
      });

      // Test nested operations
      const profileQueryOptions = api.users.profile.get.queryOptions({
        id: 2,
      });
      expect(profileQueryOptions.queryKey).toEqual([
        'users',
        'profile',
        'get',
        { id: 2 },
      ]);

      const settingsUpdateOptions =
        api.users.profile.settings.update.mutationOptions();
      // @ts-expect-error - mutationFn is a function
      const updatedSettings = await settingsUpdateOptions.mutationFn({
        id: 2,
        name: 'Updated Name',
      });
      expect(updateUser).toHaveBeenCalledWith(
        {},
        { id: 2, name: 'Updated Name' }
      );
      expect(updatedSettings).toMatchObject({ id: 2, name: 'Updated Name' });
    });

    it('should handle collections with mixed operation types', () => {
      const apiCollection = collection({
        auth: {
          login: operation.mutation(
            async (_opts, input: { email: string; password: string }) => {
              return await Promise.resolve({
                token: 'jwt-token',
                user: { id: 1, email: input.email },
              });
            }
          ),
          logout: operation.mutation(async (_opts) => {
            return await Promise.resolve({ success: true });
          }),
          me: operation.query(async (_opts) => {
            return await Promise.resolve({ id: 1, email: 'user@example.com' });
          }),
        },
        posts: {
          list: operation.query(
            async (_opts, input?: { page?: number; limit?: number }) => {
              return await Promise.resolve({
                posts: [],
                pagination: {
                  page: input?.page || 1,
                  limit: input?.limit || 10,
                  total: 0,
                },
              });
            }
          ),
          get: operation.query(async (_opts, input?: { id: number }) => {
            return await Promise.resolve({
              id: input?.id || 1,
              title: 'Test Post',
              content: 'Content',
            });
          }),
          create: operation.mutation(
            async (_opts, input: { title: string; content: string }) => {
              return await Promise.resolve({ id: Math.random(), ...input });
            }
          ),
        },
      });

      const api = router({}, apiCollection);

      // Test auth operations
      expect(api.auth.login).toHaveProperty('mutationOptions');
      expect(api.auth.logout).toHaveProperty('mutationOptions');
      expect(api.auth.me).toHaveProperty('queryOptions');

      // Test posts operations
      expect(api.posts.list).toHaveProperty('queryOptions');
      expect(api.posts.get).toHaveProperty('queryOptions');
      expect(api.posts.create).toHaveProperty('mutationOptions');

      // Test query key generation
      const postsListOptions = api.posts.list.queryOptions({
        page: 2,
        limit: 20,
      });
      expect(postsListOptions.queryKey).toEqual([
        'posts',
        'list',
        { page: 2, limit: 20 },
      ]);

      const postGetOptions = api.posts.get.queryOptions({ id: 123 });
      expect(postGetOptions.queryKey).toEqual(['posts', 'get', { id: 123 }]);

      const authMeOptions = api.auth.me.queryOptions();
      expect(authMeOptions.queryKey).toEqual(['auth', 'me']);
    });

    it('should preserve function behavior with different input types', async () => {
      const queryWithOptionalInput = vi
        .fn()
        .mockResolvedValue({ data: 'no input' });
      const queryWithRequiredInput = vi
        .fn()
        .mockResolvedValue({ data: 'with input' });
      const mutationWithInput = vi.fn().mockResolvedValue({ success: true });

      const apiCollection = collection({
        optional: operation.query((_opts, input) =>
          queryWithOptionalInput(input)
        ),
        required: operation.query((_opts, input) =>
          queryWithRequiredInput(input)
        ),
        mutation: operation.mutation((_opts, input) =>
          mutationWithInput(input)
        ),
      });

      const api = router({}, apiCollection);

      // Test query without input
      const optionalOptions = api.optional.queryOptions();
      // @ts-expect-error - queryFn is a function
      await optionalOptions.queryFn();
      expect(queryWithOptionalInput).toHaveBeenCalledWith(undefined);

      // Test query with input
      const requiredOptions = api.required.queryOptions({
        filter: 'test',
      });
      // @ts-expect-error - queryFn is a function
      await requiredOptions.queryFn();
      expect(queryWithRequiredInput).toHaveBeenCalledWith({ filter: 'test' });

      // Test mutation
      const mutationOptions = api.mutation.mutationOptions();
      // @ts-expect-error - mutationFn is a function
      await mutationOptions.mutationFn({ action: 'create' });
      expect(mutationWithInput).toHaveBeenCalledWith({ action: 'create' });
    });
  });

  describe('error handling', () => {
    it('should handle async errors in query functions', async () => {
      const failingQuery = vi.fn().mockRejectedValue(new Error('Query failed'));

      const apiCollection = collection({
        failing: operation.query((_opts, input) => failingQuery(input)),
      });

      const api = router({}, apiCollection);
      const queryOptions = api.failing.queryOptions();

      // @ts-expect-error - queryFn is a function
      await expect(queryOptions.queryFn()).rejects.toThrow('Query failed');
    });

    it('should handle async errors in mutation functions', async () => {
      const failingMutation = vi
        .fn()
        .mockRejectedValue(new Error('Mutation failed'));

      const apiCollection = collection({
        failing: operation.mutation((_opts, input) => failingMutation(input)),
      });

      const api = router({}, apiCollection);
      const mutationOptions = api.failing.mutationOptions();

      await expect(
        // @ts-expect-error - mutationFn is a function
        mutationOptions.mutationFn({ data: 'test' })
      ).rejects.toThrow('Mutation failed');
    });
  });

  describe('edge cases', () => {
    it('should handle empty collections', () => {
      const emptyCollection = collection({});
      const api = router({}, emptyCollection);

      expect(api).toEqual({});
    });

    it('should handle deeply nested collections', () => {
      const deepCollection = collection({
        level1: {
          level2: {
            level3: {
              level4: {
                deepQuery: operation.query(async (_opts) => ({ deep: true })),
              },
            },
          },
        },
      });

      const api = router({}, deepCollection);
      const deepQueryOptions =
        api.level1.level2.level3.level4.deepQuery.queryOptions();

      expect(deepQueryOptions.queryKey).toEqual([
        'level1',
        'level2',
        'level3',
        'level4',
        'deepQuery',
      ]);
    });

    it('should handle special characters in property names', () => {
      const specialCollection = collection({
        'special-name': operation.query(async (_opts) => ({ data: 'special' })),
        name_with_underscores: operation.query(async (_opts) => ({
          data: 'underscore',
        })),
        'name.with.dots': operation.query(async (_opts) => ({ data: 'dots' })),
      });

      const api = router({}, specialCollection);

      const specialOptions = api['special-name'].queryOptions();
      expect(specialOptions.queryKey).toEqual(['special-name']);

      const dotsOptions = api['name.with.dots'].queryOptions();
      expect(dotsOptions.queryKey).toEqual(['name.with.dots']);
    });
  });
});
