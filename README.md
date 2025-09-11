# ddmushi (Den Den Mushi)

> A tRPC-like API organization library for TanStack React Query

**ddmushi** provides a type-safe way to organize your API operations with automatic React Query integration. Think tRPC's developer experience, but for existing REST APIs.

## Installation

```bash
npm install ddmushi @tanstack/react-query
# or
pnpm add ddmushi @tanstack/react-query
```

## Quick Start

```typescript
import { ddmushi } from 'ddmushi';
import { z } from 'zod';

// Create a router with shared context
const router = ddmushi.init({
  ctx: {
    apiUrl: 'https://api.example.com',
    token: 'your-auth-token'
  }
});

// Define your API operations with validation
export const api = router.collection({
  users: router.collection({
    list: router.operation.query<User[]>(
      async ({ ctx }) => {
        const response = await fetch(`${ctx.apiUrl}/users`, {
          headers: { Authorization: `Bearer ${ctx.token}` }
        });
        return response.json();
      }
    ),
    
    create: router.operation
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(18)
      }))
      .output(z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        createdAt: z.string()
      }))
      .mutation<User, CreateUserInput>(
        async ({ ctx, input }) => {
          const response = await fetch(`${ctx.apiUrl}/users`, {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${ctx.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(input)
          });
          return response.json();
        }
      )
  })
});

// Use with React Query
function UsersList() {
  const { data: users } = useQuery(api.users.list.queryOptions());
  const createUser = useMutation(api.users.create.mutationOptions());
  
  // For infinite queries (pagination, load more, etc.)
  const { data: infiniteUsers } = useInfiniteQuery(
    api.users.list.infiniteQueryOptions()
  );
  
  // ... component logic
}
```

## Features

- 🔒 **Type-safe** - Full TypeScript support with automatic type inference
- 🔧 **React Query Integration** - Seamless integration with TanStack React Query
- 📦 **Organized APIs** - Nest operations in collections for better organization
- 🚀 **DX Focused** - tRPC-like developer experience for REST APIs
- 🪶 **Lightweight** - Minimal runtime overhead
- ♾️ **Infinite Queries** - Built-in support for pagination and infinite scrolling
- 🔌 **Middleware Support** - Composable middleware for cross-cutting concerns
- ✅ **Built-in Validation** - Standard Schema integration for input/output validation with Zod, Yup, and more
- 🎯 **Chainable Operations** - Fluent API with `.input()`, `.output()`, and `.use()` methods
- 🛡️ **Runtime Safety** - Automatic input/output validation with detailed error messages

## Input/Output Validation

ddmushi supports automatic validation using any Standard Schema-compatible library (Zod, Yup, Valibot, etc.):

```typescript
import { ddmushi } from 'ddmushi';
import { z } from 'zod';

const router = ddmushi.init({
  ctx: { apiUrl: 'https://api.example.com' }
});

// Input validation
const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be at least 18')
});

// Output validation
const responseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: z.string()
});

const api = router.collection({
  users: router.collection({
    create: router.operation
      .input(userSchema)           // Validates request data
      .output(responseSchema)      // Validates response data
      .mutation(async ({ ctx, input }) => {
        // input is now type-safe and validated
        const response = await fetch(`${ctx.apiUrl}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        });
        return response.json(); // Will be validated against responseSchema
      })
  })
});
```

### Validation Features

- **Automatic Type Inference**: Input types are automatically inferred from your schemas
- **Runtime Validation**: Both input and output are validated at runtime
- **Detailed Error Messages**: Get precise validation errors with field-level details
- **Standard Schema Support**: Works with Zod, Yup, Valibot, and any Standard Schema-compatible library
- **Middleware Integration**: Validation is implemented as composable middleware

## Middleware

ddmushi supports composable middleware for cross-cutting concerns like authentication, logging, caching, and error handling:

```typescript
import { ddmushi } from 'ddmushi';
import { z } from 'zod';

const router = ddmushi.init({
  ctx: { token: 'your-token' }
});

// Create authentication middleware
const authMiddleware = async ({ opts, next }) => {
  if (!opts.ctx.token) {
    throw new Error('Authentication required');
  }
  
  // Add user info to context
  const userInfo = await getUserInfo(opts.ctx.token);
  return next({ 
    ...opts, 
    ctx: { ...opts.ctx, user: userInfo } 
  });
};

// Create logging middleware
const loggingMiddleware = async ({ opts, next }) => {
  const start = Date.now();
  console.log('Operation started');
  
  try {
    const result = await next(opts);
    console.log(`Operation completed in ${Date.now() - start}ms`);
    return result;
  } catch (error) {
    console.error(`Operation failed in ${Date.now() - start}ms:`, error);
    throw error;
  }
};

// Create custom validation middleware
const customValidationMiddleware = async ({ opts, next }) => {
  if (!opts.ctx.validationEnabled) {
    return next(opts);
  }
  
  // Add validation metadata to context
  return next({
    ...opts,
    ctx: { ...opts.ctx, validated: true }
  });
};

// Apply middleware to operations using the chainable API
const api = router.collection({
  users: router.collection({
    list: router.operation
      .use(authMiddleware)
      .use(loggingMiddleware)
      .query<User[]>(async ({ ctx }) => {
        // ctx now includes user info from middleware
        return fetchUsers(ctx.user.id);
      }),
      
    create: router.operation
      .use(authMiddleware)
      .use(customValidationMiddleware)
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email()
      }))
      .output(z.object({
        id: z.string(),
        name: z.string(),
        email: z.string()
      }))
      .mutation(async ({ ctx, input }) => {
        // Both middleware and validation applied
        return createUser(input, ctx.user);
      })
  })
});
```

### Middleware Features

- **Composable**: Chain multiple middleware with `.use()`
- **Order Matters**: Middleware executes in the order it's applied
- **Context Modification**: Middleware can modify the context for downstream operations
- **Error Handling**: Middleware can catch and transform errors
- **Built-in Validation**: Input/output validation is implemented as middleware

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the package
pnpm build
```

## License

MIT