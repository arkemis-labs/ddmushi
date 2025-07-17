import { describe, expect, it, vi } from 'vitest';
import type {
  MutationDefinition,
  MutationOperation,
  QueryDefinition,
  QueryOperation,
} from '../types';
import {
  buildQueryKey,
  createMutationOptions,
  createQueryOptions,
  createQueryOptionsFromOperation,
  isMutationOperation,
  isQueryOperation,
} from '../utils';

describe('utils', () => {
  describe('createQueryOptions', () => {
    it('should create query options with params', () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const queryKey = vi.fn().mockReturnValue(['users', { id: 1 }]);

      const definition: QueryDefinition<{ data: string }, { id: number }> = {
        queryKey,
        queryFn,
      };

      const optionsBuilder = createQueryOptions(definition);
      const options = optionsBuilder({ id: 1 });

      expect(queryKey).toHaveBeenCalledWith({ id: 1 });
      expect(options.queryKey).toEqual(['users', { id: 1 }]);
      expect(typeof options.queryFn).toBe('function');
    });

    it('should create query options without params', () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const queryKey = vi.fn().mockReturnValue(['users']);

      const definition: QueryDefinition<{ data: string }> = {
        queryKey,
        queryFn,
      };

      const optionsBuilder = createQueryOptions(definition);
      const options = optionsBuilder();

      expect(queryKey).toHaveBeenCalledWith();
      expect(options.queryKey).toEqual(['users']);
      expect(typeof options.queryFn).toBe('function');
    });

    it('should merge additional options', () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const queryKey = vi.fn().mockReturnValue(['users']);

      const definition: QueryDefinition<{ data: string }> = {
        queryKey,
        queryFn,
      };

      const optionsBuilder = createQueryOptions(definition);
      const options = optionsBuilder(undefined, {
        enabled: false,
        staleTime: 5000,
      });

      expect(options.enabled).toBe(false);
      expect(options.staleTime).toBe(5000);
    });

    it('should call queryFn with correct params in returned queryFn', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const queryKey = vi.fn().mockReturnValue(['users', { id: 1 }]);

      const definition: QueryDefinition<{ data: string }, { id: number }> = {
        queryKey,
        queryFn,
      };

      const optionsBuilder = createQueryOptions(definition);
      const options = optionsBuilder({ id: 1 });

      await (options.queryFn as () => Promise<{ data: string }>)();

      expect(queryFn).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('createMutationOptions', () => {
    it('should create mutation options with mutationKey', () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });
      const mutationKey = ['createUser'];

      const definition: MutationDefinition<
        { success: boolean },
        { name: string }
      > = {
        mutationKey,
        mutationFn,
      };

      const optionsBuilder = createMutationOptions(definition);
      const options = optionsBuilder();

      expect(options.mutationKey).toEqual(['createUser']);
      expect(options.mutationFn).toBe(mutationFn);
    });

    it('should create mutation options without mutationKey', () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });

      const definition: MutationDefinition<
        { success: boolean },
        { name: string }
      > = {
        mutationFn,
      };

      const optionsBuilder = createMutationOptions(definition);
      const options = optionsBuilder();

      expect(options.mutationKey).toBeUndefined();
      expect(options.mutationFn).toBe(mutationFn);
    });

    it('should merge additional options', () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });

      const definition: MutationDefinition<
        { success: boolean },
        { name: string }
      > = {
        mutationFn,
      };

      const optionsBuilder = createMutationOptions(definition);
      const onError = vi.fn();
      const options = optionsBuilder({ onError });

      expect(options.onError).toBe(onError);
    });
  });

  describe('createQueryOptionsFromOperation', () => {
    it('should create query options with input', () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

      const operation: QueryOperation<{ data: string }, { id: number }> = {
        _type: 'operation',
        _operationType: 'query',
        queryFn,
      };

      const path = ['users', 'getUser'];
      const optionsBuilder = createQueryOptionsFromOperation(operation, path);
      const options = optionsBuilder({ id: 1 });

      expect(options.queryKey).toEqual(['users', 'getUser', { id: 1 }]);
      expect(typeof options.queryFn).toBe('function');
    });

    it('should create query options without input', () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

      const operation: QueryOperation<{ data: string }> = {
        _type: 'operation',
        _operationType: 'query',
        queryFn,
      };

      const path = ['users', 'list'];
      const optionsBuilder = createQueryOptionsFromOperation(operation, path);
      const options = optionsBuilder();

      expect(options.queryKey).toEqual(['users', 'list']);
      expect(typeof options.queryFn).toBe('function');
    });

    it('should call operation queryFn with correct input', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

      const operation: QueryOperation<{ data: string }, { id: number }> = {
        _type: 'operation',
        _operationType: 'query',
        queryFn,
      };

      const path = ['users', 'getUser'];
      const optionsBuilder = createQueryOptionsFromOperation(operation, path);
      const options = optionsBuilder({ id: 1 });

      await (options.queryFn as () => Promise<{ data: string }>)();

      expect(queryFn).toHaveBeenCalledWith({ id: 1 });
    });

    it('should merge additional options', () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

      const operation: QueryOperation<{ data: string }> = {
        _type: 'operation',
        _operationType: 'query',
        queryFn,
      };

      const path = ['users', 'list'];
      const optionsBuilder = createQueryOptionsFromOperation(operation, path);
      const options = optionsBuilder(undefined, { enabled: false });

      expect(options.enabled).toBe(false);
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
