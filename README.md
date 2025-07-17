# ddmushi (Den Den Mushi)

A tRPC-like API organization library for TanStack React Query that provides a clean, type-safe way to organize and consume APIs in React applications.

## Features

- 🎯 **Type-safe**: Full TypeScript support with inference
- 🔗 **React Query Integration**: Built on top of TanStack React Query
- 📦 **Organized API Structure**: Group related endpoints into collections and routers
- 🔄 **Query & Mutation Support**: Handle both data fetching and mutations
- 🎨 **Proxy-based API**: Clean, intuitive API similar to tRPC
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

// Define API operations
const userApi = collection({
  getUser: operation.query(async (input: { id: number }) => {
    const response = await fetch(`/api/users/${input.id}`);
    return response.json();
  }),
  
  updateUser: operation.mutation(async (input: { id: number; name: string }) => {
    const response = await fetch(`/api/users/${input.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response.json();
  }),
});

const postApi = collection({
  getPosts: operation.query(async () => {
    const response = await fetch('/api/posts');
    return response.json();
  }),
  
  createPost: operation.mutation(async (input: { title: string; content: string }) => {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response.json();
  }),
});
```

### 2. Create a router

```typescript
import { router } from 'ddmushi';

export const api = router({
  users: userApi,
  posts: postApi,
});
```

### 3. Use in React components

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/network'
 
function UserProfile({ userId }: { userId: number }) {
  // Query user data
  const { data: user, isLoading } = useQuery(
    api.users.getUser.queryOptions({ id: userId })
  );

  // Mutation for updating user
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

## API Reference

### `operation`

The operation builder provides methods to create query and mutation operations:

#### `operation.query<TData, TParams>(queryFn)`

Creates a query operation for data fetching.

```typescript
const getUser = operation.query(async (input: { id: number }) => {
  // Fetch user data
  const response = await fetch(`/api/users/${input.id}`);
  return response.json();
});
```

#### `operation.mutation<TData, TVariables>(mutationFn)`

Creates a mutation operation for data modification.

```typescript
const createUser = operation.mutation(async (input: { name: string; email: string }) => {
  // Create user
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.json();
});
```

### `collection(apiCollection)`

Groups related operations into a collection:

```typescript
const userApi = collection({
  getUser: operation.query(getUserFn),
  updateUser: operation.mutation(updateUserFn),
  deleteUser: operation.mutation(deleteUserFn),
});
```

### `router(apiCollection)`

Creates a proxy-based router that transforms operations into React Query options:

```typescript
const api = router({
  users: userApi,
  posts: postApi,
});

// Access query options
const queryOptions = api.users.getUser.queryOptions({ id: 1 });

// Access mutation options
const mutationOptions = api.users.updateUser.mutationOptions();
```

## Advanced Usage

### Nested Collections

You can nest collections to create hierarchical API structures:

```typescript
const api = router({
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
});

// Usage
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

## Development

This project uses a monorepo structure with:

- **Core Package**: `packages/core` - Main library code
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