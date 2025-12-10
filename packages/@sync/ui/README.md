# @sync/ui

Shared UI components for Sync Platform applications.

## Overview

This package provides reusable Svelte components, stores, and actions that are common across all Sync Platform applications.

## Components

- **SyncIndicator** - Shows synchronization status
- **ConnectionStatus** - Displays online/offline status
- **FormAutoSave** - Automatic form saving functionality
- **LoadingSpinner** - Consistent loading indicators
- **PinEntry** - Secure PIN input component

## Stores

- **syncStore** - Global synchronization state
- **authStore** - Authentication state management

## Actions

- **autoSave** - Automatic saving for form inputs
- **gpsCapture** - GPS location capture

## Installation

```bash
pnpm add @sync/ui
```

## Usage

```svelte
<script>
  import { SyncIndicator, ConnectionStatus } from '@sync/ui';
  import { syncStore } from '@sync/ui/stores/sync';
</script>

<SyncIndicator />
<ConnectionStatus />
```

## Development

```bash
# Build the package
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test
```