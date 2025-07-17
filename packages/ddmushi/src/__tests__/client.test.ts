import { describe, expect, it, vi } from 'vitest';
import { collection, operation, router } from '../core';

describe('client', () => {
  describe('operation builders', () => {
    describe('operation.query', () => {
      it('should create a query operation with correct properties', () => {
        const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
        const queryOp = operation.query(queryFn);

        expect(queryOp).toEqual({
          _type: 'operation',
          _operationType: 'query',
          queryFn,
        });
      });

      it('should create typed query operation', () => {
        const queryFn = (input?: { id: number }) =>
          Promise.resolve({ name: 'John', id: input?.id || 1 });
        const queryOp = operation.query<
          { name: string; id: number },
          { id: number }
        >(queryFn);

        expect(queryOp._type).toBe('operation');
        expect(queryOp._operationType).toBe('query');
        expect(typeof queryOp.queryFn).toBe('function');
      });
    });

    describe('operation.mutation', () => {
      it('should create a mutation operation with correct properties', () => {
        const mutationFn = vi.fn().mockResolvedValue({ success: true });
        const mutationOp = operation.mutation(mutationFn);

        expect(mutationOp).toEqual({
          _type: 'operation',
          _operationType: 'mutation',
          mutationFn,
        });
      });

      it('should create typed mutation operation', () => {
        const mutationFn = (input: { name: string }) =>
          Promise.resolve({ id: 1, ...input });
        const mutationOp = operation.mutation<
          { id: number; name: string },
          { name: string }
        >(mutationFn);

        expect(mutationOp._type).toBe('operation');
        expect(mutationOp._operationType).toBe('mutation');
        expect(typeof mutationOp.mutationFn).toBe('function');
      });
    });
  });

  describe('collection', () => {
    it('should return the collection as-is', () => {
      const testCollection = {
        getUser: operation.query(() =>
          Promise.resolve({ id: 1, name: 'John' })
        ),
        createUser: operation.mutation((input: { name: string }) =>
          Promise.resolve({ id: 1, ...input })
        ),
      };

      const result = collection(testCollection);
      expect(result).toBe(testCollection);
    });

    it('should work with nested collections', () => {
      const testCollection = {
        users: {
          getUser: operation.query(() =>
            Promise.resolve({ id: 1, name: 'John' })
          ),
          createUser: operation.mutation((input: { name: string }) =>
            Promise.resolve({ id: 1, ...input })
          ),
        },
        posts: {
          getPost: operation.query(() =>
            Promise.resolve({ id: 1, title: 'Test' })
          ),
        },
      };

      const result = collection(testCollection);
      expect(result).toBe(testCollection);
    });
  });

  describe('router', () => {
    it('should create a proxy that handles query operations', () => {
      const queryFn = vi.fn().mockResolvedValue({ id: 1, name: 'John' });
      const testCollection = {
        getUser: operation.query(queryFn),
      };

      const api = router(testCollection);
      const userQuery = api.getUser;

      expect(userQuery).toHaveProperty('queryOptions');
      expect(typeof userQuery.queryOptions).toBe('function');
    });

    it('should create a proxy that handles mutation operations', () => {
      const mutationFn = vi.fn().mockResolvedValue({ id: 1, name: 'John' });
      const testCollection = {
        createUser: operation.mutation(mutationFn),
      };

      const api = router(testCollection);
      const userMutation = api.createUser;

      expect(userMutation).toHaveProperty('mutationOptions');
      expect(typeof userMutation.mutationOptions).toBe('function');
    });

    it('should handle nested collections', () => {
      const testCollection = {
        users: {
          getUser: operation.query(() =>
            Promise.resolve({ id: 1, name: 'John' })
          ),
          createUser: operation.mutation((input: { name: string }) =>
            Promise.resolve({ id: 1, ...input })
          ),
        },
        posts: {
          getPost: operation.query(() =>
            Promise.resolve({ id: 1, title: 'Test' })
          ),
        },
      };

      const api = router(testCollection);

      expect(api.users).toBeDefined();
      expect(api.users.getUser).toHaveProperty('queryOptions');
      expect(api.users.createUser).toHaveProperty('mutationOptions');
      expect(api.posts.getPost).toHaveProperty('queryOptions');
    });

    it('should generate correct query keys for nested paths', () => {
      const queryFn = vi.fn().mockResolvedValue({ id: 1, name: 'John' });
      const testCollection = {
        users: {
          profile: {
            getUser: operation.query(queryFn),
          },
        },
      };

      const api = router(testCollection);
      const queryOptions = api.users.profile.getUser.queryOptions();

      expect(queryOptions.queryKey).toEqual(['users', 'profile', 'getUser']);
    });

    it('should include input in query key when provided', () => {
      const queryFn = vi.fn().mockResolvedValue({ id: 1, name: 'John' });
      const testCollection = {
        getUser: operation.query(queryFn),
      };

      const api = router(testCollection);
      const queryOptions = api.getUser.queryOptions({ id: 123 });

      expect(queryOptions.queryKey).toEqual(['getUser', { id: 123 }]);
    });

    it('should handle non-string properties correctly', () => {
      const testCollection = {
        getUser: operation.query(() =>
          Promise.resolve({ id: 1, name: 'John' })
        ),
      };

      const api = router(testCollection);
      const symbolProp = Symbol('test');

      // Should not throw when accessing symbol properties
      expect(() => {
        (api as Record<symbol, unknown>)[symbolProp];
      }).not.toThrow();
    });

    it('should pass through regular values', () => {
      const testCollection = {
        someValue: 'test-value',
        someNumber: 42,
      };

      const api = router(testCollection);

      expect(api.someValue).toBe('test-value');
      expect(api.someNumber).toBe(42);
    });
  });
});
