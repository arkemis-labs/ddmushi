import { describe, expect, it, vi } from 'vitest';
import { collection, operation, router } from '../core';

describe('integration tests', () => {
  describe('complete API workflow', () => {
    it('should work with a realistic API collection', async () => {
      // Mock API functions
      const fetchUser = vi.fn().mockImplementation((input?: { id: number }) => {
        return {
          id: input?.id || 1,
          name: 'John Doe',
          email: 'john@example.com',
        };
      });

      const createUser = vi
        .fn()
        .mockImplementation((input: { name: string; email: string }) => {
          return { id: Math.random(), ...input };
        });

      const updateUser = vi
        .fn()
        .mockImplementation(
          (input: { id: number; name?: string; email?: string }) => {
            return {
              id: input.id,
              name: input.name || 'John Doe',
              email: input.email || 'john@example.com',
            };
          }
        );

      const deleteUser = vi.fn().mockImplementation((input: { id: number }) => {
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
      const api = router(apiCollection);

      // Test query operation
      const getUserQueryOptions = api.users.get.queryOptions({
        id: 1,
      });
      expect(getUserQueryOptions.queryKey).toEqual(['users', 'get', { id: 1 }]);

      // @ts-expect-error - queryFn is a function
      const userData = await getUserQueryOptions.queryFn();
      expect(fetchUser).toHaveBeenCalledWith({ id: 1 });
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
      expect(createUser).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
      });
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
      expect(updateUser).toHaveBeenCalledWith({ id: 2, name: 'Updated Name' });
      expect(updatedSettings).toMatchObject({ id: 2, name: 'Updated Name' });
    });

    it('should handle collections with mixed operation types', () => {
      const apiCollection = collection({
        auth: {
          login: operation.mutation(
            async (input: { email: string; password: string }) => {
              return await Promise.resolve({
                token: 'jwt-token',
                user: { id: 1, email: input.email },
              });
            }
          ),
          logout: operation.mutation(async () => {
            return await Promise.resolve({ success: true });
          }),
          me: operation.query(async () => {
            return await Promise.resolve({ id: 1, email: 'user@example.com' });
          }),
        },
        posts: {
          list: operation.query(
            async (input?: { page?: number; limit?: number }) => {
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
          get: operation.query(async (input: { id: number }) => {
            return await Promise.resolve({
              id: input.id,
              title: 'Test Post',
              content: 'Content',
            });
          }),
          create: operation.mutation(
            async (input: { title: string; content: string }) => {
              return await Promise.resolve({ id: Math.random(), ...input });
            }
          ),
        },
      });

      const api = router(apiCollection);

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
        optional: operation.query(queryWithOptionalInput),
        required: operation.query(queryWithRequiredInput),
        mutation: operation.mutation(mutationWithInput),
      });

      const api = router(apiCollection);

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
        failing: operation.query(failingQuery),
      });

      const api = router(apiCollection);
      const queryOptions = api.failing.queryOptions();

      // @ts-expect-error - queryFn is a function
      await expect(queryOptions.queryFn()).rejects.toThrow('Query failed');
    });

    it('should handle async errors in mutation functions', async () => {
      const failingMutation = vi
        .fn()
        .mockRejectedValue(new Error('Mutation failed'));

      const apiCollection = collection({
        failing: operation.mutation(failingMutation),
      });

      const api = router(apiCollection);
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
      const api = router(emptyCollection);

      expect(api).toEqual({});
    });

    it('should handle deeply nested collections', () => {
      const deepCollection = collection({
        level1: {
          level2: {
            level3: {
              level4: {
                deepQuery: operation.query(async () => ({ deep: true })),
              },
            },
          },
        },
      });

      const api = router(deepCollection);
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
        'special-name': operation.query(async () => ({ data: 'special' })),
        name_with_underscores: operation.query(async () => ({
          data: 'underscore',
        })),
        'name.with.dots': operation.query(async () => ({ data: 'dots' })),
      });

      const api = router(specialCollection);

      const specialOptions = api['special-name'].queryOptions();
      expect(specialOptions.queryKey).toEqual(['special-name']);

      const dotsOptions = api['name.with.dots'].queryOptions();
      expect(dotsOptions.queryKey).toEqual(['name.with.dots']);
    });
  });
});
