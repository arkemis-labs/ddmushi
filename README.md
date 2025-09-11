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

// Create a router with shared context
const router = ddmushi.init({
  ctx: {
    apiUrl: 'https://api.example.com',
    token: 'your-auth-token'
  }
});

const { collection, operation } = router;

// Define your API operations
export const api = collection({
  users: collection({
    list: operation.query<User[]>(
      async ({ opts: { ctx } }) => {
        const response = await fetch(`${ctx.apiUrl}/users`, {
          headers: { Authorization: `Bearer ${ctx.token}` }
        });
        return response.json();
      }
    ),
    
    create: operation.mutation<User, CreateUserInput>(
      async ({ opts: { ctx }, input }) => {
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
- ✅ **Built-in Validation** - Standard Schema integration for input/output validation
- 🎯 **Flexible Operations** - Chainable operation builders with enhanced customization

## Middleware

ddmushi supports composable middleware for cross-cutting concerns like authentication, logging, caching, and error handling:

```typescript
import { ddmushi } from 'ddmushi';

// Create authentication middleware
const authMiddleware = async ({ ctx, next }) => {
  if (!ctx.token) {
    throw new Error('Authentication required');
  }
  
  // Add user info to context
  const userInfo = await getUserInfo(ctx.token);
  return next({ ...ctx, user: userInfo });
};

// Create logging middleware
const loggingMiddleware = async ({ ctx, next }) => {
  const start = Date.now();
  console.log('Operation started');
  
  try {
    const result = await next(ctx);
    console.log(`Operation completed in ${Date.now() - start}ms`);
    return result;
  } catch (error) {
    console.error(`Operation failed in ${Date.now() - start}ms:`, error);
    throw error;
  }
};

const router = ddmushi.init({
  ctx: { token: 'your-token' }
});

// Apply middleware to operations
const api = router.collection({
  users: router.collection({
    list: router.operation
      .use(authMiddleware)
      .use(loggingMiddleware)
      .query<User[]>(async ({ opts: { ctx } }) => {
        // ctx now includes user info from middleware
        return fetchUsers(ctx.user.id);
      })
  })
});
```

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