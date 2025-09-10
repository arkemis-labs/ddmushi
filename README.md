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

function createCollection = router.collection;
function operation = router.operation;

// Define your API operations
export const api = createCollection({
  users: createCollection({
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
          headers: { Authorization: `Bearer ${ctx.token}` },
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