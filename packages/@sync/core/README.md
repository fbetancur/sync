# @sync/core

Core offline-first infrastructure for Sync Platform.

## Overview

This package provides the foundational infrastructure for building offline-first applications in the
Sync Platform monorepo. It includes:

- **Database Layer**: IndexedDB abstraction with Dexie
- **Sync System**: Conflict resolution and data synchronization
- **Storage Management**: Multi-layer storage with fallbacks
- **Audit System**: Comprehensive audit logging
- **Security**: Field-level encryption and data protection
- **Validation**: Zod-based schema validation

## Installation

```bash
pnpm add @sync/core
```

## Usage

```typescript
import { createSyncApp } from '@sync/core';

const app = createSyncApp({
  appName: 'my-app',
  supabaseUrl: 'your-supabase-url',
  supabaseKey: 'your-supabase-key',
  encryptionEnabled: true,
  auditEnabled: true
});

await app.start();
```

## API Reference

### Core Functions

- `createSyncApp(config)` - Creates a new sync application instance
- `SyncApp.start()` - Initializes the application
- `SyncApp.stop()` - Cleanly shuts down the application

### Services

- `db` - Database operations
- `sync` - Synchronization management
- `storage` - Multi-layer storage
- `audit` - Audit logging
- `security` - Encryption services

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Watch mode
pnpm dev
```
