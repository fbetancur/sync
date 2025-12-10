# @sync/types

Shared TypeScript types and interfaces for Sync Platform.

## Overview

This package provides all the TypeScript type definitions used across the Sync Platform monorepo, ensuring type consistency between applications and packages.

## Type Categories

- **Database Types** - Entity interfaces and database schemas
- **API Types** - Request/response interfaces for external APIs
- **Business Types** - Domain-specific business logic types
- **UI Types** - Component props and UI-related interfaces

## Installation

```bash
pnpm add @sync/types
```

## Usage

```typescript
// Import all types
import type { Cliente, Credito, Pago } from '@sync/types';

// Import specific categories
import type { DatabaseEntity } from '@sync/types/database';
import type { ApiResponse } from '@sync/types/api';
import type { CreditCalculation } from '@sync/types/business';
import type { ComponentProps } from '@sync/types/ui';
```

## Type Structure

### Base Entity
All entities extend from `BaseEntity`:

```typescript
interface BaseEntity {
  id: string;
  tenant_id: string;
  created_at: number;
  updated_at: number;
  synced: boolean;
  checksum: string;
}
```

### Syncable Entity
Entities that support CRDT synchronization extend `SyncableEntity`:

```typescript
interface SyncableEntity extends BaseEntity {
  version_vector: Record<string, number>;
  field_versions: Record<string, FieldVersion>;
}
```

## Development

```bash
# Build types
pnpm build

# Watch mode
pnpm dev

# Type checking
pnpm test
```