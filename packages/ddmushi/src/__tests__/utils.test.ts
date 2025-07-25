import { describe, expect, it, vi } from 'vitest';
import type {
  MutationDefinition,
  MutationOperation,
  QueryOperation,
  RouterOptions,
} from '../types';
import {
  buildQueryKey,
  createMutationOptions,
  createQueryOptions,
  isMutationOperation,
  isQueryOperation,
} from '../utils';

describe('utils', () => {
  describe('createMutationOptions', () => {
    it('should create mutation options with mutationKey', () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });
      const mutationKey = ['createUser'];
      const opts: RouterOptions = {};

      const definition: MutationDefinition<
        { success: boolean },
        { name: string }
      > = {
        mutationKey,
        mutationFn,
      };

      const optionsBuilder = createMutationOptions(opts, definition);
      const options = optionsBuilder();

      expect(options.mutationKey).toEqual(['createUser']);
      expect(typeof options.mutationFn).toBe('function');
    });

    it('should create mutation options without mutationKey', () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });
      const opts: RouterOptions = {};

      const definition: MutationDefinition<
        { success: boolean },
        { name: string }
      > = {
        mutationFn,
      };

      const optionsBuilder = createMutationOptions(opts, definition);
      const options = optionsBuilder();

      expect(options.mutationKey).toBeUndefined();
      expect(typeof options.mutationFn).toBe('function');
    });

    it('should merge additional options', () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });
      const opts: RouterOptions = {};

      const definition: MutationDefinition<
        { success: boolean },
        { name: string }
      > = {
        mutationFn,
      };

      const optionsBuilder = createMutationOptions(opts, definition);
      const onError = vi.fn();
      const options = optionsBuilder({ onError });

      expect(options.onError).toBe(onError);
    });

    it('should pass opts to mutationFn', async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });
      const opts: RouterOptions = { ctx: { user: { id: 123 } } };

      const definition: MutationDefinition<
        { success: boolean },
        { name: string }
      > = {
        mutationFn,
      };

      const optionsBuilder = createMutationOptions(opts, definition);
      const options = optionsBuilder();

      const input = { name: 'John' };
      if (options.mutationFn) {
        await options.mutationFn(input);
      }

      expect(mutationFn).toHaveBeenCalledWith(opts, input);
    });

    it('should pass ctx through opts to mutationFn', async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });
      const ctx = { user: { id: 123, role: 'admin' }, tenant: 'acme' };
      const opts: RouterOptions = { ctx };

      const definition: MutationDefinition<
        { success: boolean },
        { name: string }
      > = {
        mutationFn,
      };

      const optionsBuilder = createMutationOptions(opts, definition);
      const options = optionsBuilder();

      const input = { name: 'John' };
      if (options.mutationFn) {
        await options.mutationFn(input);
      }

      expect(mutationFn).toHaveBeenCalledWith({ ctx }, input);
    });
  });

  describe('createQueryOptions', () => {
    it('should create query options with input', () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const opts: RouterOptions = {};

      const operation: QueryOperation<{ data: string }, { id: number }> = {
        _type: 'operation',
        _operationType: 'query',
        queryFn,
      };

      const path = ['users', 'getUser'];
      const optionsBuilder = createQueryOptions(opts, operation, path);
      const options = optionsBuilder({ id: 1 });

      expect(options.queryKey).toEqual(['users', 'getUser', { id: 1 }]);
      expect(typeof options.queryFn).toBe('function');
    });

    it('should create query options without input', () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const opts: RouterOptions = {};

      const operation: QueryOperation<{ data: string }> = {
        _type: 'operation',
        _operationType: 'query',
        queryFn,
      };

      const path = ['users', 'list'];
      const optionsBuilder = createQueryOptions(opts, operation, path);
      const options = optionsBuilder();

      expect(options.queryKey).toEqual(['users', 'list']);
      expect(typeof options.queryFn).toBe('function');
    });

    it('should call operation queryFn with correct input', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const opts: RouterOptions = {};

      const operation: QueryOperation<{ data: string }, { id: number }> = {
        _type: 'operation',
        _operationType: 'query',
        queryFn,
      };

      const path = ['users', 'getUser'];
      const optionsBuilder = createQueryOptions(opts, operation, path);
      const options = optionsBuilder({ id: 1 });

      await (options.queryFn as () => Promise<{ data: string }>)();

      expect(queryFn).toHaveBeenCalledWith(opts, { id: 1 });
    });

    it('should merge additional options', () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const opts: RouterOptions = {};

      const operation: QueryOperation<{ data: string }> = {
        _type: 'operation',
        _operationType: 'query',
        queryFn,
      };

      const path = ['users', 'list'];
      const optionsBuilder = createQueryOptions(opts, operation, path);
      const options = optionsBuilder(undefined, { enabled: false });

      expect(options.enabled).toBe(false);
    });

    it('should pass opts to queryFn', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const opts: RouterOptions = { ctx: { user: { id: 123 } } };

      const operation: QueryOperation<{ data: string }, { id: number }> = {
        _type: 'operation',
        _operationType: 'query',
        queryFn,
      };

      const path = ['users', 'getUser'];
      const optionsBuilder = createQueryOptions(opts, operation, path);
      const options = optionsBuilder({ id: 1 });

      await (options.queryFn as () => Promise<{ data: string }>)();

      expect(queryFn).toHaveBeenCalledWith(opts, { id: 1 });
    });

    it('should pass ctx through opts to queryFn', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const ctx = { user: { id: 123, role: 'admin' }, tenant: 'acme' };
      const opts: RouterOptions = { ctx };

      const operation: QueryOperation<{ data: string }, { id: number }> = {
        _type: 'operation',
        _operationType: 'query',
        queryFn,
      };

      const path = ['users', 'getUser'];
      const optionsBuilder = createQueryOptions(opts, operation, path);
      const options = optionsBuilder({ id: 1 });

      await (options.queryFn as () => Promise<{ data: string }>)();

      expect(queryFn).toHaveBeenCalledWith({ ctx }, { id: 1 });
    });

    it('should work with undefined input and pass opts', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const ctx = { user: { id: 123 } };
      const opts: RouterOptions = { ctx };

      const operation: QueryOperation<{ data: string }> = {
        _type: 'operation',
        _operationType: 'query',
        queryFn,
      };

      const path = ['users', 'list'];
      const optionsBuilder = createQueryOptions(opts, operation, path);
      const options = optionsBuilder();

      await (options.queryFn as () => Promise<{ data: string }>)();

      expect(queryFn).toHaveBeenCalledWith({ ctx }, undefined);
    });
  });

  describe('buildQueryKey', () => {
    it('should build query key with params', () => {
      const path = ['users', 'getUser'];
      const params = { id: 1 };

      const queryKey = buildQueryKey(path, params);

      expect(queryKey).toEqual(['users', 'getUser', { id: 1 }]);
    });

    it('should build query key without params', () => {
      const path = ['users', 'list'];

      const queryKey = buildQueryKey(path);

      expect(queryKey).toEqual(['users', 'list']);
    });

    it('should handle undefined params', () => {
      const path = ['users', 'list'];

      const queryKey = buildQueryKey(path, undefined);

      expect(queryKey).toEqual(['users', 'list']);
    });

    it('should handle empty path', () => {
      const path: string[] = [];
      const params = { id: 1 };

      const queryKey = buildQueryKey(path, params);

      expect(queryKey).toEqual([{ id: 1 }]);
    });
  });

  describe('isQueryOperation', () => {
    it('should return true for valid query operation', () => {
      const queryOperation: QueryOperation = {
        _type: 'operation',
        _operationType: 'query',
        queryFn: vi.fn(),
      };

      expect(isQueryOperation(queryOperation)).toBe(true);
    });

    it('should return false for mutation operation', () => {
      const mutationOperation: MutationOperation = {
        _type: 'operation',
        _operationType: 'mutation',
        mutationFn: vi.fn(),
      };

      expect(isQueryOperation(mutationOperation)).toBe(false);
    });

    it('should return false for non-operation objects', () => {
      const notOperation = {
        queryFn: vi.fn(),
      };

      expect(isQueryOperation(notOperation)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isQueryOperation(null)).toBe(false);
      expect(isQueryOperation(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isQueryOperation('string')).toBe(false);
      expect(isQueryOperation(123)).toBe(false);
      expect(isQueryOperation(true)).toBe(false);
    });

    it('should return false for objects with missing properties', () => {
      expect(isQueryOperation({ _type: 'operation' })).toBe(false);
      expect(isQueryOperation({ _operationType: 'query' })).toBe(false);
      expect(
        isQueryOperation({ _type: 'operation', _operationType: 'invalid' })
      ).toBe(false);
    });
  });

  describe('isMutationOperation', () => {
    it('should return true for valid mutation operation', () => {
      const mutationOperation: MutationOperation = {
        _type: 'operation',
        _operationType: 'mutation',
        mutationFn: vi.fn(),
      };

      expect(isMutationOperation(mutationOperation)).toBe(true);
    });

    it('should return false for query operation', () => {
      const queryOperation: QueryOperation = {
        _type: 'operation',
        _operationType: 'query',
        queryFn: vi.fn(),
      };

      expect(isMutationOperation(queryOperation)).toBe(false);
    });

    it('should return false for non-operation objects', () => {
      const notOperation = {
        mutationFn: vi.fn(),
      };

      expect(isMutationOperation(notOperation)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isMutationOperation(null)).toBe(false);
      expect(isMutationOperation(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isMutationOperation('string')).toBe(false);
      expect(isMutationOperation(123)).toBe(false);
      expect(isMutationOperation(true)).toBe(false);
    });

    it('should return false for objects with missing properties', () => {
      expect(isMutationOperation({ _type: 'operation' })).toBe(false);
      expect(isMutationOperation({ _operationType: 'mutation' })).toBe(false);
      expect(
        isMutationOperation({ _type: 'operation', _operationType: 'invalid' })
      ).toBe(false);
    });
  });
});
