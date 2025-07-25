# ddmushi (Den Den Mushi)

A tRPC-like API organization library for TanStack React Query that provides a clean, type-safe way to organize and consume APIs in React applications.

## Features

- 🎯 **Type-safe**: Full TypeScript support with inference
- 🔗 **React Query Integration**: Built on top of TanStack React Query
- 📦 **Organized API Structure**: Group related endpoints into collections and routers
- 🔄 **Query & Mutation Support**: Handle both data fetching and mutations
- 🎨 **Proxy-based API**: Clean, intuitive API similar to tRPC
- 🧠 **Context Propagation**: Share context (auth, tenant info, etc.) across operations
- 🚀 **Zero Configuration**: Works out of the box with minimal setup

## Installation

```bash
npm install ddmushi @tanstack/react-query
# or
yarn add ddmushi @tanstack/react-query
# or
pnpm add ddmushi @tanstack/react-query
```

## Quick Start

### 1. Define your API operations

```typescript
import { collection, operation } from 'ddmushi';

// Define API operations that receive context
const userApi = collection({
  getUser: operation.query(async (opts, input: { id: number }) => {
    // Access context from opts.ctx
    const { user } = opts.ctx || {};
    const response = await fetch(`/api/users/${input.id}`, {
      headers: {
        'Authorization': `Bearer ${user?.token}`,
      },
    });
    return response.json();
  }),
  
  updateUser: operation.mutation(async (opts, input: { id: number; name: string }) => {
    const { user, tenant } = opts.ctx || {};
    const response = await fetch(`/api/users/${input.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token}`,
        'X-Tenant-ID': tenant,
      },
      body: JSON.stringify(input),
    });
    return response.json();
  }),
});

const postApi = collection({
  getPosts: operation.query(async (opts) => {
    const { user } = opts.ctx || {};
    const response = await fetch(`/api/posts?userId=${user?.id}`);
    return response.json();
  }),
  
  createPost: operation.mutation(async (opts, input: { title: string; content: string }) => {
    const { user } = opts.ctx || {};
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token}`,
      },
      body: JSON.stringify({ ...input, authorId: user?.id }),
    });
    return response.json();
  }),
});
```

### 2. Create a router with context

```typescript
import { router } from 'ddmushi';

// Create router with shared context
export const api = router(
  {
    ctx: {
      user: { id: 123, token: 'jwt-token', role: 'admin' },
      tenant: 'acme-corp',
      permissions: ['read', 'write'],
    }
  },
  {
    users: userApi,
    posts: postApi,
  }
);
```

### 3. Use in React components

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/network'
 
function UserProfile({ userId }: { userId: number }) {
  // Query user data (context automatically passed)
  const { data: user, isLoading } = useQuery(
    api.users.getUser.queryOptions({ id: userId })
  );

  // Mutation for updating user (context automatically passed)
  const updateUserMutation = useMutation(
    api.users.updateUser.mutationOptions()
  );

  const handleUpdateUser = () => {
    updateUserMutation.mutate({
      id: userId,
      name: 'New Name',
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user?.name}</h1>
      <button onClick={handleUpdateUser}>
        Update User
      </button>
    </div>
  );
}
```

## Context Propagation

One of ddmushi's key features is automatic context propagation, allowing you to share data like authentication tokens, user information, tenant IDs, and more across all your API operations.

### Basic Context Usage

```typescript
import { router, collection, operation } from 'ddmushi';

// Define operations that use context
const authApi = collection({
  me: operation.query(async (opts) => {
    const { user } = opts.ctx || {};
    const response = await fetch('/api/me', {
      headers: { 'Authorization': `Bearer ${user?.token}` },
    });
    return response.json();
  }),
  
  updateProfile: operation.mutation(async (opts, input: { name: string }) => {
    const { user, tenant } = opts.ctx || {};
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token}`,
        'X-Tenant-ID': tenant,
      },
      body: JSON.stringify(input),
    });
    return response.json();
  }),
});

// Create router with context
const api = router(
  {
    ctx: {
      user: { id: 1, token: 'abc123', role: 'admin' },
      tenant: 'company-1',
      permissions: ['read', 'write', 'admin'],
    }
  },
  { auth: authApi }
);
```

### Dynamic Context

For applications where context changes (e.g., different users), you can create routers dynamically:

```typescript
function createApiClient(userSession: UserSession) {
  return router(
    {
      ctx: {
        user: userSession.user,
        tenant: userSession.tenant,
        permissions: userSession.permissions,
      }
    },
    {
      users: userApi,
      posts: postApi,
      // ... other collections
    }
  );
}

// Usage in a React app
function App() {
  const { session } = useAuth();
  const api = useMemo(() => createApiClient(session), [session]);
  
  // Use api with current user context
  const { data: profile } = useQuery(api.auth.me.queryOptions());
  
  return <div>{/* Your app */}</div>;
}
```

### Context Types

You can define strong types for your context:

```typescript
interface AppContext {
  user: {
    id: number;
    token: string;
    role: 'admin' | 'user' | 'guest';
  };
  tenant: string;
  permissions: string[];
  features: Record<string, boolean>;
}

// Use typed context in operations
const typedApi = collection({
  getUsers: operation.query(async (opts: { ctx?: AppContext }) => {
    const { user, tenant } = opts.ctx || {};
    // TypeScript will provide full type safety here
    if (user?.role !== 'admin') {
      throw new Error('Insufficient permissions');
    }
    // ... fetch users for tenant
  }),
});
```

## API Reference

### `operation`

The operation builder provides methods to create query and mutation operations. All operation functions receive router options as their first parameter.

#### `operation.query<TData, TParams>(queryFn)`

Creates a query operation for data fetching.

```typescript
const getUser = operation.query(async (opts, input: { id: number }) => {
  // opts contains the router context and other options
  const { user } = opts.ctx || {};
  
  const response = await fetch(`/api/users/${input.id}`, {
    headers: { 'Authorization': `Bearer ${user?.token}` },
  });
  return response.json();
});
```

**Parameters:**
- `opts`: RouterOptions containing context and other router-level configuration
- `input`: Optional input parameters for the query

#### `operation.mutation<TData, TVariables>(mutationFn)`

Creates a mutation operation for data modification.

```typescript
const createUser = operation.mutation(async (opts, input: { name: string; email: string }) => {
  const { user, tenant } = opts.ctx || {};
  
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user?.token}`,
      'X-Tenant-ID': tenant,
    },
    body: JSON.stringify(input),
  });
  return response.json();
});
```

**Parameters:**
- `opts`: RouterOptions containing context and other router-level configuration
- `input`: Input parameters for the mutation

### `collection(apiCollection)`

Groups related operations into a collection:

```typescript
const userApi = collection({
  getUser: operation.query(getUserFn),
  updateUser: operation.mutation(updateUserFn),
  deleteUser: operation.mutation(deleteUserFn),
});
```

### `router(routerOptions, apiCollection)`

Creates a proxy-based router that transforms operations into React Query options and provides context propagation.

```typescript
const api = router(
  {
    ctx: {
      user: { id: 1, token: 'abc123' },
      tenant: 'acme-corp',
    }
  },
  {
    users: userApi,
    posts: postApi,
  }
);

// Access query options
const queryOptions = api.users.getUser.queryOptions({ id: 1 });

// Access mutation options
const mutationOptions = api.users.updateUser.mutationOptions();
```

**Parameters:**
- `routerOptions`: Configuration object containing context and other router settings
- `apiCollection`: Object containing your API collections

## Advanced Usage

### Nested Collections

You can nest collections to create hierarchical API structures:

```typescript
const api = router(
  { ctx: { user: currentUser } },
  {
    users: collection({
      profile: collection({
        get: operation.query(getProfileFn),
        update: operation.mutation(updateProfileFn),
      }),
      settings: collection({
        get: operation.query(getSettingsFn),
        update: operation.mutation(updateSettingsFn),
      }),
    }),
  }
);

// Usage - context is automatically passed to nested operations
const profileQuery = useQuery(api.users.profile.get.queryOptions());
```

### Custom Query Options

Pass additional React Query options:

```typescript
const { data } = useQuery(
  api.users.getUser.queryOptions(
    { id: 1 },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  )
);
```

### Mutation Options

Customize mutation behavior:

```typescript
const mutation = useMutation(
  api.users.updateUser.mutationOptions({
    onSuccess: (data) => {
      console.log('User updated:', data);
    },
    onError: (error) => {
      console.error('Update failed:', error);
    },
  })
);
```

### Context Isolation

Different router instances maintain their own context:

```typescript
const adminApi = router(
  { ctx: { user: adminUser, role: 'admin' } },
  apiCollections
);

const userApi = router(
  { ctx: { user: regularUser, role: 'user' } },
  apiCollections
);

// Each router uses its own context
const adminData = useQuery(adminApi.users.getAll.queryOptions());
const userData = useQuery(userApi.users.getProfile.queryOptions());
```

## Development

This project uses a monorepo structure with:

- **Core Package**: `packages/ddmushi` - Main library code
- **TypeScript Config**: `packages/typescript-config` - Shared TypeScript configurations

### Scripts

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Development mode
pnpm dev

# Type checking
pnpm check-types
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and ensure they pass
6. Submit a pull request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [tRPC](https://trpc.io/) for its elegant API design
- Built on top of [TanStack React Query](https://tanstack.com/query) for robust data fetching
- Uses [Vitest](https://vitest.dev/) for testing
- Powered by [TypeScript](https://www.typescriptlang.org/) for type safety 