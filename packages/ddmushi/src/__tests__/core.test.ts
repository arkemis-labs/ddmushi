import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ddmushi } from '../core';
import type { Middleware } from '../types';

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
          list: router.operation.query<Array<{ id: string }>>(() => {
            return Promise.resolve([{ id: '1' }, { id: '2' }]);
          }),
        }),
        posts: router.collection({
          create: router.operation.mutation<{ id: string }>(() => {
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
      const testQuery = router.operation.query<{
        data: string;
        user: string;
      }>(async ({ input, opts: { ctx } }) => {
        // Context should be properly typed and available
        expect(ctx.database).toBe('test-db');
        expect(ctx.currentUser.id).toBe('user-123');
        expect(ctx.config.timeout).toBe(5000);

        return await Promise.resolve({
          data: `Filtered by: ${(input as any)?.filter || 'none'}`,
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

      const simpleQuery = simpleRouter.operation.query<{ version: string }>(
        async ({ opts: { ctx } }) => ({ version: ctx.version })
      );

      const result = await simpleQuery.handler({
        opts: { ctx: { version: '1.0.0' } },
      });
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('Middleware functionality', () => {
    it('should apply authentication middleware to operations', async () => {
      const router = ddmushi.init({
        ctx: {
          user: null as { id: string; role: string } | null,
          isAuthenticated: false,
        },
      });

      // Create operation with middleware
      const protectedQuery = router.operation
        .use(async ({ opts, next }) => {
          if (!opts.ctx.isAuthenticated) {
            throw new Error('Unauthorized: User must be authenticated');
          }
          return await next(opts);
        })
        .query<{ message: string }, void>(async ({ opts: { ctx } }) => {
          return await Promise.resolve({ message: `Hello ${ctx.user?.id}` });
        });

      await expect(
        protectedQuery.handler({
          opts: { ctx: { user: null, isAuthenticated: false } },
        })
      ).rejects.toThrow('Unauthorized: User must be authenticated');

      const authenticatedCtx = {
        user: { id: 'user-123', role: 'admin' },
        isAuthenticated: true,
      };

      const result = await protectedQuery.handler({
        opts: { ctx: authenticatedCtx },
      });

      expect(result.message).toBe('Hello user-123');
    });

    it('should apply logging middleware to track operation execution', async () => {
      const logs: Array<{
        operation: string;
        timestamp: Date;
        duration?: number;
      }> = [];

      const router = ddmushi.init({
        ctx: { requestId: 'req-123' },
      });

      const loggedQuery = router.operation
        .use(async ({ opts, next }) => {
          const startTime = Date.now();
          logs.push({ operation: 'start', timestamp: new Date() });

          const result = await next(opts);

          const duration = Date.now() - startTime;
          logs.push({ operation: 'end', timestamp: new Date(), duration });

          return result;
        })
        .query<{ data: string }, void>(async ({ opts: { ctx } }) => {
          // Simulate some work
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { data: `Request ${ctx.requestId} processed` };
        });

      await loggedQuery.handler({
        opts: { ctx: { requestId: 'req-123' } },
      });

      expect(logs).toHaveLength(2);
      expect(logs?.[0]?.operation).toBe('start');
      expect(logs?.[1]?.operation).toBe('end');
    });

    it('should apply validation middleware for input/output validation', async () => {
      const router = ddmushi.init({
        ctx: { validationEnabled: true },
      });

      // Create validation middleware
      const validationMiddleware: Middleware<any> = async ({ opts, next }) => {
        if (!opts.ctx.validationEnabled) {
          return await next(opts);
        }

        // Add validation context
        return await next({
          ...opts,
          ctx: {
            ...opts.ctx,
            validated: true,
          },
        });
      };

      const validatedMutation = router.operation
        .use(validationMiddleware)
        .mutation<
          { success: boolean; validated: boolean },
          { email: string; password: string }
        >(async ({ input, opts: { ctx } }) => {
          if (!input?.email?.includes('@')) {
            throw new Error('Invalid email format');
          }
          if (!input?.password || input.password.length < 6) {
            throw new Error('Password must be at least 6 characters');
          }

          return await {
            success: true,
            validated: (ctx as any).validated,
          };
        });

      // Test with invalid input
      await expect(
        validatedMutation.handler({
          opts: { ctx: { validationEnabled: true } },
          input: { email: 'invalid-email', password: '123' },
        })
      ).rejects.toThrow('Invalid email format');

      // Test with valid input
      const result = await validatedMutation.handler({
        opts: { ctx: { validationEnabled: true } },
        input: { email: 'test@example.com', password: 'password123' },
      });

      expect(result.success).toBe(true);
      expect(result.validated).toBe(true);
    });

    it('should handle error transformation middleware', async () => {
      const router = ddmushi.init({
        ctx: { environment: 'production' },
      });

      // Create error handling middleware
      const errorHandlingMiddleware: Middleware<any> = async ({
        opts,
        next,
      }) => {
        try {
          return await next(opts);
        } catch (error) {
          if (
            opts.ctx.environment === 'production' &&
            error instanceof Error &&
            error.message.includes('Database')
          ) {
            // Transform sensitive errors in production
            throw new Error('Internal server error');
          }
          throw error;
        }
      };

      const errorProneQuery = router.operation
        .use(errorHandlingMiddleware)
        .query<{ data: string }, { shouldFail: boolean }>(async ({ input }) => {
          if (input?.shouldFail) {
            throw new Error('Database connection failed');
          }
          return await { data: 'success' };
        });

      // Test error transformation in production
      await expect(
        errorProneQuery.handler({
          opts: { ctx: { environment: 'production' } },
          input: { shouldFail: true },
        })
      ).rejects.toThrow('Internal server error');

      // Test normal operation
      const result = await errorProneQuery.handler({
        opts: { ctx: { environment: 'production' } },
        input: { shouldFail: false },
      });

      expect(result.data).toBe('success');
    });

    it('should compose multiple middlewares in correct order', async () => {
      const executionOrder: string[] = [];

      const router = ddmushi.init({
        ctx: { test: 'value' },
      });

      // First middleware
      const middleware1: Middleware<any> = async ({ opts, next }) => {
        executionOrder.push('middleware1-before');
        const result = await next({
          ...opts,
          ctx: { ...opts.ctx, step1: true },
        });
        executionOrder.push('middleware1-after');
        return result;
      };

      // Second middleware
      const middleware2: Middleware<any> = async ({ opts, next }) => {
        executionOrder.push('middleware2-before');
        const result = await next({
          ...opts,
          ctx: { ...opts.ctx, step2: true },
        });
        executionOrder.push('middleware2-after');
        return result;
      };

      // Third middleware
      const middleware3: Middleware<any> = async ({ opts, next }) => {
        executionOrder.push('middleware3-before');
        const result = await next({
          ...opts,
          ctx: { ...opts.ctx, step3: true },
        });
        executionOrder.push('middleware3-after');
        return result;
      };

      const composedQuery = router.operation
        .use(middleware1)
        .use(middleware2)
        .use(middleware3)
        .query<{ steps: boolean[] }, void>(async ({ opts: { ctx } }) => {
          executionOrder.push('handler-executed');
          return await {
            steps: [(ctx as any).step1, (ctx as any).step2, (ctx as any).step3],
          };
        });

      const result = await composedQuery.handler({
        opts: { ctx: { test: 'value' } },
      });

      // Verify execution order (onion-like pattern)
      expect(executionOrder).toEqual([
        'middleware1-before',
        'middleware2-before',
        'middleware3-before',
        'handler-executed',
        'middleware3-after',
        'middleware2-after',
        'middleware1-after',
      ]);

      expect(result.steps).toEqual([true, true, true]);
    });

    it('should support context transformation across middlewares', async () => {
      const router = ddmushi.init({
        ctx: {
          rawUser: { id: '123', name: 'John', role: 'user' },
          permissions: [] as string[],
        },
      });

      // User enrichment middleware
      const userEnrichmentMiddleware: Middleware<any> = async ({
        opts,
        next,
      }) => {
        const enrichedUser = {
          ...opts.ctx.rawUser,
          isAdmin: opts.ctx.rawUser.role === 'admin',
          displayName: `${opts.ctx.rawUser.name} (${opts.ctx.rawUser.role})`,
        };

        return await next({
          ...opts,
          ctx: {
            ...opts.ctx,
            user: enrichedUser,
          },
        });
      };

      // Permission loading middleware
      const permissionMiddleware: Middleware<any> = async ({ opts, next }) => {
        const permissions =
          opts.ctx.user?.role === 'admin'
            ? ['read', 'write', 'delete']
            : ['read'];

        return await next({
          ...opts,
          ctx: {
            ...opts.ctx,
            permissions,
          },
        });
      };

      const enrichedQuery = router.operation
        .use(userEnrichmentMiddleware)
        .use(permissionMiddleware)
        .query<
          {
            user: any;
            permissions: string[];
            canDelete: boolean;
          },
          void
        >(async ({ opts: { ctx } }) => {
          return await {
            user: (ctx as any).user,
            permissions: (ctx as any).permissions,
            canDelete: (ctx as any).permissions.includes('delete'),
          };
        });

      const result = await enrichedQuery.handler({
        opts: {
          ctx: {
            rawUser: { id: '123', name: 'John', role: 'user' },
            permissions: [],
          },
        },
      });

      expect(result.user.displayName).toBe('John (user)');
      expect(result.user.isAdmin).toBe(false);
      expect(result.permissions).toEqual(['read']);
      expect(result.canDelete).toBe(false);
    });

    it('should handle middleware errors gracefully', async () => {
      const router = ddmushi.init({
        ctx: { shouldFail: true },
      });

      const failingMiddleware: Middleware<any> = async ({ opts, next }) => {
        if (opts.ctx.shouldFail) {
          throw new Error('Middleware failure');
        }
        return await next(opts);
      };

      const queryWithFailingMiddleware = router.operation
        .use(failingMiddleware)
        .query<{ data: string }, void>(async () => {
          return await { data: 'This should not execute' };
        });

      await expect(
        queryWithFailingMiddleware.handler({
          opts: { ctx: { shouldFail: true } },
        })
      ).rejects.toThrow('Middleware failure');

      // Test that it works when middleware doesn't fail
      const result = await queryWithFailingMiddleware.handler({
        opts: { ctx: { shouldFail: false } },
      });

      expect(result.data).toBe('This should not execute');
    });
  });

  describe('Input/Output validation', () => {
    it('should validate input with Zod schema', async () => {
      const router = ddmushi.init({
        ctx: {},
      });

      const inputSchema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const query = router.operation
        .input(inputSchema)
        .query<{ message: string }>(({ input }) => {
          return Promise.resolve({
            message: `Hello ${input.email}, you are ${input.age} years old`,
          });
        });

      // Test with valid input
      const result = await query.handler({
        opts: { ctx: {} },
        input: { email: 'test@example.com', age: 25 },
      });
      expect(result).toEqual({
        message: 'Hello test@example.com, you are 25 years old',
      });

      // Test with invalid input (should throw validation error)
      await expect(
        query.handler({
          opts: { ctx: {} },
          input: { email: 'invalid-email', age: 16 },
        })
      ).rejects.toThrow();
    });

    it('should validate output with Zod schema', async () => {
      const router = ddmushi.init({
        ctx: {},
      });

      const outputSchema = z.object({
        data: z.string(),
        timestamp: z.number(),
      });

      const query = router.operation
        .output(outputSchema)
        .query<{ data: string; timestamp: number }>(() => {
          return Promise.resolve({
            data: 'test data',
            timestamp: Date.now(),
          });
        });

      const result = await query.handler({ opts: { ctx: {} } });
      expect(result).toHaveProperty('data', 'test data');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('number');
    });

    it('should work with both input and output validation', async () => {
      const router = ddmushi.init({
        ctx: {},
      });

      const inputSchema = z.object({
        name: z.string().min(1),
      });

      const outputSchema = z.object({
        greeting: z.string(),
        length: z.number(),
      });

      const mutation = router.operation
        .input(inputSchema)
        .output(outputSchema)
        .mutation<{ greeting: string; length: number }>(({ input }) => {
          return Promise.resolve({
            greeting: `Hello, ${input.name}!`,
            length: input.name.length,
          });
        });

      const result = await mutation.handler({
        opts: { ctx: {} },
        input: { name: 'Alice' },
      });

      expect(result).toEqual({
        greeting: 'Hello, Alice!',
        length: 5,
      });
    });

    it('should handle validation errors properly', async () => {
      const router = ddmushi.init({
        ctx: {},
      });

      const inputSchema = z.object({
        count: z.number().positive(),
        email: z.string().email(),
      });

      const query = router.operation.input(inputSchema).query(({ input }) => {
        return Promise.resolve({ success: true, count: input.count });
      });

      // Test with invalid count
      await expect(
        query.handler({
          opts: { ctx: {} },
          input: { count: -5, email: 'test@example.com' },
        })
      ).rejects.toThrow();

      // Test with invalid email
      await expect(
        query.handler({
          opts: { ctx: {} },
          input: { count: 10, email: 'not-an-email' },
        })
      ).rejects.toThrow();
    });
  });
});
