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
import { createRouter } from 'ddmushi';

// Create a router with shared context
const router = createRouter({
  ctx: {
    apiUrl: 'https://api.example.com',
    token: 'your-auth-token'
  }
});

// Define your API operations
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
    
    create: router.operation.mutation<User, CreateUserInput>(
      async ({ ctx }, input) => {
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
  
  // ... component logic
}
```

## Features

- 🔒 **Type-safe** - Full TypeScript support with automatic type inference
- 🔧 **React Query Integration** - Seamless integration with TanStack React Query
- 📦 **Organized APIs** - Nest operations in collections for better organization
- 🚀 **DX Focused** - tRPC-like developer experience for REST APIs
- 🪶 **Lightweight** - Minimal runtime overhead

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