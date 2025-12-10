# Implementation Plan

# PWA Offline-First para Gestión de Microcréditos

## Phase 1: Project Setup and Infrastructure

- [x] 1. Initialize project structure
  - Create Svelte + Vite + TypeScript project
  - Configure Tailwind CSS + DaisyUI
  - Setup ESLint + Prettier
  - Configure Vitest for testing
  - Setup Git repository
  - _Requirements: All_

- [x] 2. Configure Supabase backend
  - Create Supabase project
  - Setup database schema (tenants, users, clientes, creditos, cuotas, pagos, etc.)
  - Configure Row Level Security policies
  - Setup Supabase Auth
  - Configure Supabase Storage for images
  - Generate TypeScript types from schema
  - _Requirements: 1.1, 17.7_

- [x] 3. Setup Vercel deployment
  - Connect Git repository to Vercel
  - Configure environment variables
  - Setup preview deployments
  - Configure custom domain (if applicable)
  - _Requirements: All_

- [x] 4. Configure PWA with Vite Plugin
  - Install and configure vite-plugin-pwa
  - Create manifest.json with app metadata
  - Configure Workbox for caching strategies
  - Setup Service Worker
  - Test offline capability
  - _Requirements: 9.1, 9.2_

## Phase 2: Core Data Layer

- [x] 5. Implement IndexedDB with Dexie.js
  - Install Dexie.js and types
  - Define database schema matching requirements
  - Create all tables (tenants, clientes, creditos, cuotas, pagos, sync_queue, audit_log, etc.)
  - Configure indexes for optimal queries
  - Implement database initialization and migration logic
  - _Requirements: 2.1, 2.7_

- [x] 6. Implement multi-layer storage system
  - Create StorageManager class
  - Implement write to IndexedDB (Layer 1)
  - Implement write to LocalStorage (Layer 2)
  - Implement write to Cache API (Layer 3)
  - Implement atomic write across all layers
  - Implement read with fallback logic
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 7. Implement checksum and integrity verification
  - Create checksum utility using Web Crypto API (SHA-256)
  - Implement checksum calculation for critical records
  - Implement checksum verification on read
  - Implement periodic integrity checks
  - Create recovery procedures for corrupted data
  - _Requirements: 2.6, 7.6_

- [x]\* 7.1 Write property test for checksum integrity
  - **Property 4: Checksum Integrity**
  - **Validates: Requirements 2.6, 7.6**
  - Generate random pagos and creditos
  - Calculate checksums
  - Verify checksums match after storage and retrieval
  - Test corruption detection

## Phase 3: Business Logic Layer

- [x] 8. Implement credit calculations
  - Create CreditCalculator class
  - Implement interest calculation
  - Implement total amount calculation
  - Implement installment (cuota) value calculation
  - Implement payment schedule generation
  - Handle different frequencies (daily, weekly, biweekly, monthly)
  - Handle "exclude Sundays" logic
  - _Requirements: 12.2, 12.3, 12.4, 13.2, 13.5_

- [x]\* 8.1 Write unit tests for credit calculations
  - Test interest calculation with various rates
  - Test installment generation
  - Test Sunday exclusion logic
  - Test edge cases (leap years, month boundaries)
  - _Requirements: 12.2, 12.3, 12.4_

- [x] 9. Implement balance and arrears calculations
  - Create BalanceCalculator class
  - Implement saldo_pendiente calculation from pagos
  - Implement dias_atraso calculation
  - Implement cuotas_pagadas counter
  - Implement automatic recalculation on pago registration
  - _Requirements: 3.3, 3.4, 12.5, 12.6, 13.1, 13.4_

- [x]\* 9.1 Write property test for balance consistency
  - **Property 7: Saldo Calculation Consistency**
  - **Validates: Requirements 13.1**
  - Generate random creditos with random pagos
  - Calculate saldo_pendiente
  - Verify saldo equals (total_a_pagar - sum of pagos)

- [x] 10. Implement validation layer
  - Create Zod schemas for all entities
  - Implement UI-level validation (real-time)
  - Implement business logic validation (pre-save)
  - Implement post-save integrity checks
  - Implement periodic background validation
  - Implement pre-sync validation
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

## Phase 4: Sync and Conflict Resolution

- [x] 11. Implement CRDT conflict resolver
  - Create ConflictResolver class
  - Implement version vector comparison
  - Implement field-level merge algorithm
  - Implement deterministic tie-breaking
  - Handle append-only records (pagos)
  - Handle editable records (clientes, creditos)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7_

- [x]\* 11.1 Write property test for conflict resolution determinism
  - **Property 3: Conflict Resolution Determinism**
  - **Validates: Requirements 6.1, 6.2**
  - Generate pairs of conflicting records
  - Resolve conflicts in different orders
  - Verify same result regardless of order

- [x] 12. Implement sync queue manager
  - Create SyncQueue class
  - Implement add to queue with priority
  - Implement get pending operations ordered by priority and timestamp
  - Implement mark as synced
  - Implement retry logic with exponential backoff
  - Implement queue size monitoring
  - _Requirements: 5.2, 5.8_

- [x]\* 12.1 Write property test for sync queue ordering
  - **Property 2: Sync Queue Ordering**
  - **Validates: Requirements 5.2**
  - Add random operations with random priorities
  - Retrieve pending operations
  - Verify correct ordering (priority DESC, timestamp ASC)

- [x] 13. Implement differential sync (delta sync)
  - Create ChangeTracker to log all changes
  - Implement change log table operations
  - Implement delta compression (collapse multiple changes to same field)
  - Implement batch creation for upload
  - Implement delta application for download
  - _Requirements: 5.3, 5.6, 5.7_

- [x] 14. Implement sync manager
  - Create SyncManager class
  - Implement connection detection
  - Implement upload sync (device → Supabase)
  - Implement download sync (Supabase → device)
  - Implement bidirectional sync orchestration
  - Implement progress reporting
  - Integrate conflict resolver
  - Integrate sync queue
  - _Requirements: 5.1, 5.4, 5.5, 5.9_

- [x] 15. Implement Background Sync API integration
  - Register sync events with Service Worker
  - Implement sync handler in Service Worker
  - Handle sync success and failure
  - Show notifications on sync completion
  - Implement fallback for browsers without Background Sync
  - _Requirements: 5.9_

## Phase 5: Audit and Logging

- [x] 16. Implement audit log system
  - Create AuditLogger class
  - Implement event creation with all required fields
  - Implement hash chain calculation (blockchain-like)
  - Implement append-only enforcement
  - Implement event reconstruction
  - Implement fraud detection patterns
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x]\* 16.1 Write property test for audit log immutability
  - **Property 5: Audit Log Immutability**
  - **Validates: Requirements 8.3, 8.4**
  - Generate sequence of events
  - Calculate hash chain
  - Verify each hash matches SHA-256(event + previous_hash)
  - Attempt to modify event and verify detection

- [x] 17. Implement error logging and monitoring
  - Integrate Sentry SDK
  - Configure error capture
  - Configure performance monitoring
  - Implement custom error boundaries
  - Filter sensitive data from logs
  - Implement local error logging
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

## Phase 6: Authentication and Security

- [x] 18. Implement authentication flow
  - Create login page
  - Integrate Supabase Auth
  - Implement JWT token management
  - Implement automatic token refresh
  - Implement logout with cleanup
  - Implement auth guards for routes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 19. Implement field-level encryption
  - Create EncryptionService using Web Crypto API
  - Implement key derivation from user PIN (PBKDF2)
  - Implement AES-256-GCM encryption for sensitive fields
  - Implement transparent encryption/decryption
  - Implement key management (memory-only)
  - Implement key cleanup on logout
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

## Phase 7: Core Features - Clientes

- [x] 20. Implement clientes data operations
  - Create Cliente model and repository
  - Implement CRUD operations in IndexedDB
  - Implement duplicate detection by documento
  - Implement calculated fields (creditos_activos, saldo_total, dias_atraso_max)
  - Implement search by nombre, documento, telefono
  - Implement filtering by ruta and estado
  - _Requirements: 11.1, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 21. Create clientes UI components (NEEDS ENHANCEMENT)
  - Create ClientesList page with virtual scrolling ✅
  - Create ClienteForm component for create/edit ✅
  - Create ClienteDetail page ✅
  - Implement search with debouncing ✅
  - Implement filters (ruta, estado) ✅
  - Integrate GPS capture for direccion ✅
  - Implement form validation with Zod ✅
  - ⚠️ PENDING: Enhance ClienteCard with advanced features (see task 33.2)
  - _Requirements: 11.1, 11.2, 11.3, 11.5_

- [x] 22. Implement auto-save for cliente form
  - Integrate FormAutoSave component
  - Implement auto-save every 3 seconds
  - Implement recovery on form reopen
  - Show save status indicator
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

## Phase 8: Core Features - Créditos

- [-] 23. Implement creditos data operations
  - Create Credito model and repository
  - Implement CRUD operations in IndexedDB
  - Integrate credit calculations
  - Implement cuotas generation
  - Implement balance updates on pago
  - Implement arrears calculation
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 24. Create creditos UI components
  - Create CreditosList page
  - Create CreditoForm component
  - Create CreditoDetail page with payment history
  - Implement cliente autocomplete
  - Implement producto selector
  - Show calculated values in real-time
  - Show cuotas preview
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

## Phase 9: Core Features - Pagos (CRITICAL)

- [ ] 25. Implement pagos data operations
  - Create Pago model and repository
  - Implement pago registration with UUID generation
  - Implement multi-layer storage write
  - Implement checksum calculation
  - Implement duplicate detection
  - Implement balance update logic
  - Implement cuotas update logic
  - Add to sync queue with priority 1
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9_

- [ ]\* 25.1 Write property test for pago atomicity
  - **Property 1: Pago Registration Atomicity**
  - **Validates: Requirements 3.5**
  - Simulate pago registration
  - Verify all 3 layers written or none
  - Test failure scenarios

- [ ] 25.2 Implement intelligent payment distribution service
  - Create PaymentDistributionService in @sync/core
  - Implement proportional distribution algorithm across multiple credits
  - Implement validation for payment amounts
  - Integrate with existing pago registration logic
  - _Requirements: 3.3, 3.4, 13.1_

- [ ] 25.3 Implement ReportesService for dashboard statistics
  - Create ReportesService in @sync/core
  - Implement getEstadisticasRuta() method
  - Implement getClientesConCreditos() method
  - Calculate real-time statistics (recaudo esperado, cuotas esperadas, etc.)
  - Integrate with existing database operations
  - _Requirements: 11.4, 13.4_

- [ ] 26. Create advanced pago registration UI (CobroModal)
  - Create CobroModal component using @sync/ui Modal
  - Implement intelligent payment distribution interface
  - Show real-time distribution calculation across credits
  - Allow selection/deselection of credits to pay
  - Integrate GPS capture and camera for comprobante
  - Show confirmation with updated balances for all credits
  - Implement validation and error handling
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 15.1, 15.2, 15.3, 16.1, 16.2_

- [ ] 27. Optimize pago registration performance
  - Ensure < 500ms completion time
  - Implement parallel writes to storage layers
  - Optimize IndexedDB transaction
  - Implement progress indicators
  - _Requirements: 3.8, 18.2_

## Phase 10: GPS and Multimedia

- [ ] 28. Implement GPS capture service
  - Create GPSService class
  - Request geolocation permissions
  - Capture current location
  - Handle permission denied
  - Handle location unavailable
  - Implement location validation
  - Detect impossible locations (too fast movement)
  - _Requirements: 15.1, 15.2, 15.4, 15.5, 15.6_

- [ ] 29. Create GPS capture UI component
  - Create GPSCapture component
  - Show map with current location
  - Show accuracy indicator
  - Allow manual location adjustment
  - Handle errors gracefully
  - _Requirements: 15.3_

- [ ] 30. Implement camera and image handling
  - Create CameraService class
  - Implement camera capture
  - Implement gallery selection
  - Implement image compression
  - Store images as Blobs in IndexedDB
  - Upload to Supabase Storage on sync
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

## Phase 11: Offline Capabilities

- [ ] 31. Implement Service Worker caching
  - Configure cache-first for static assets
  - Configure network-first for API calls
  - Implement runtime caching
  - Implement cache versioning
  - Implement cache cleanup
  - _Requirements: 9.1_

- [ ] 32. Implement data pre-loading
  - Pre-load ruta data on login
  - Pre-load clientes of assigned ruta
  - Pre-load active creditos
  - Pre-load recent pagos
  - Pre-load reference data (productos, rutas)
  - _Requirements: 9.2, 9.3, 10.1_

- [ ] 33. Implement intelligent pre-fetching
  - Implement GPS-based pre-loading (5km radius)
  - Implement usage pattern analysis
  - Implement predictive pre-loading
  - Implement nightly full sync on WiFi
  - Implement storage management
  - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [ ]\* 33.1 Write integration test for offline functionality
  - **Property 6: Offline Functionality Completeness**
  - **Validates: Requirements 9.4, 9.7**
  - Simulate offline mode
  - Test pago registration
  - Test cliente creation
  - Test credito update
  - Verify all operations complete successfully

## Phase 11.5: Advanced UI Components (Based on credisync-ui-enhancement.md)

- [ ] 33.1 Enhance SyncStatusIndicator component
  - Upgrade existing SyncStatusIndicator to advanced version
  - Add real-time sync status from @sync/core
  - Add manual sync trigger button
  - Add last sync timestamp display
  - Add connection status indicator with visual states
  - Integrate with crediSyncApp from app-config.ts
  - _Requirements: 14.3, 14.4, 5.1_

- [ ] 33.2 Create enhanced ClienteCard component
  - Upgrade existing ClienteCard with advanced features
  - Add visual states (AL_DIA, MORA, PROXIMO) with color coding
  - Add calculated fields display (creditos_activos, saldo_total, dias_atraso_max)
  - Add action buttons (Cobrar, Ver detalles)
  - Implement responsive design for mobile-first
  - Use @sync/types for proper typing
  - _Requirements: 11.4, 14.1, 14.2_

- [ ] 33.3 Create RutaView dashboard page
  - Create new route page at /ruta with comprehensive dashboard
  - Implement statistics cards (recaudo esperado, cuotas esperadas, clientes en mora)
  - Add client list with priority ordering (MORA first, then by saldo_total)
  - Integrate SearchInput component with debounce (300ms)
  - Add pull-to-refresh functionality
  - Integrate with @sync/core for data operations
  - _Requirements: 10.1, 11.3, 14.3, 18.4_

- [ ] 33.4 Integrate CobroModal with RutaView
  - Add CobroModal integration to ClienteCard actions
  - Implement modal state management
  - Add success callback to refresh data after payment
  - Ensure proper error handling and user feedback
  - Test complete workflow from client selection to payment confirmation
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

## Phase 12: UI/UX and Components

- [ ] 34. Create missing @sync/ui components
  - Create Modal component with proper TypeScript interfaces
  - Create Button component with variants (primary, secondary, outline, ghost)
  - Create Input component with validation and formatting support
  - Create SearchInput component with debounce functionality
  - Create StatCard component for dashboard statistics
  - Create LoadingSpinner component
  - Create EmptyState component
  - Export all components from @sync/ui index
  - _Requirements: 14.3, 14.4, 14.5, 14.6_

- [ ] 34.1 Enhance existing UI components
  - Update SyncIndicator component (already exists)
  - Update ConnectionStatus component (already exists)
  - Update FormAutoSave component (already exists)
  - Update ValidationMessage component (already exists)
  - Update ConfirmDialog component (already exists)
  - Update Toast notifications (already exists)
  - _Requirements: 14.3, 14.4, 14.5, 14.6_

- [ ] 35. Implement responsive layouts
  - Create mobile-first layouts
  - Implement touch-friendly controls (44x44px minimum)
  - Test on various screen sizes (320px+)
  - Implement navigation menu
  - Implement bottom navigation for mobile
  - _Requirements: 14.1, 14.2_

- [ ] 36. Implement dashboard
  - Create Dashboard page
  - Show today's summary (pagos, monto cobrado)
  - Show pending operations count
  - Show sync status
  - Show quick actions
  - Show recent activity
  - _Requirements: 14.3, 14.4_

## Phase 13: Recovery and Error Handling

- [ ] 37. Implement automatic recovery system
  - Implement IndexedDB corruption detection
  - Implement recovery from LocalStorage
  - Implement recovery from Cache API
  - Implement forced sync from Supabase
  - Implement integrity verification on startup
  - Log all recovery attempts
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 38. Implement user-facing error handling
  - Create error boundary components
  - Implement user-friendly error messages
  - Implement suggested actions for errors
  - Implement error reporting to user
  - Maintain functionality during partial errors
  - _Requirements: 19.6, 19.7_

## Phase 14: Testing

- [ ]\* 39. Write unit tests for business logic
  - Test credit calculations
  - Test balance calculations
  - Test validation logic
  - Test CRDT algorithms
  - Test checksum calculations
  - Achieve > 80% code coverage
  - _Requirements: All_

- [ ]\* 40. Write integration tests
  - Test IndexedDB operations
  - Test multi-layer storage
  - Test sync workflows
  - Test recovery procedures
  - Test authentication flow
  - _Requirements: All_

- [ ]\* 41. Write E2E tests with Playwright
  - Test complete user workflows
  - Test offline scenarios
  - Test sync scenarios
  - Test error recovery
  - Test on multiple browsers
  - _Requirements: All_

## Phase 15: Performance Optimization

- [ ] 42. Implement performance optimizations
  - Implement virtual scrolling for long lists
  - Implement code splitting for routes
  - Implement lazy loading of components
  - Optimize IndexedDB queries with proper indexes
  - Implement debouncing for search inputs
  - Implement memoization for expensive calculations
  - Compress sync payloads with gzip
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

- [ ] 43. Measure and verify performance targets
  - Measure initial load time (target < 2s)
  - Measure route navigation time (target < 300ms)
  - Measure form interaction time (target < 100ms)
  - Measure pago registration time (target < 500ms)
  - Measure sync time for 100 pagos (target < 30s)
  - Optimize bottlenecks
  - _Requirements: 18.1, 18.2, 18.3_

## Phase 16: Documentation and Deployment

- [ ] 44. Write user documentation
  - Create user manual
  - Create video tutorials
  - Document offline workflow
  - Document sync process
  - Document error recovery
  - Create FAQ

- [ ] 45. Write developer documentation
  - Document architecture
  - Document data models
  - Document API interfaces
  - Document deployment process
  - Document testing strategy
  - Create contribution guide

- [ ] 46. Final testing and QA
  - Perform full regression testing
  - Test on real devices (Android, iOS)
  - Test in poor network conditions
  - Test with large datasets
  - Perform security audit
  - Fix all critical bugs

- [ ] 47. Production deployment
  - Deploy to Vercel production
  - Configure production Supabase
  - Setup monitoring and alerts
  - Setup backup procedures
  - Create rollback plan
  - Perform smoke tests in production

- [ ] 48. Post-launch monitoring
  - Monitor error rates in Sentry
  - Monitor performance metrics
  - Monitor sync success rates
  - Monitor user adoption
  - Collect user feedback
  - Plan iterations based on feedback

---

## 📋 ESTADO ACTUAL (Diciembre 10, 2024)

### ✅ COMPLETADO (Fases 1-7)
- **Infraestructura completa**: @sync/core, @sync/types, @sync/ui funcionando
- **Sistema de sincronización**: CRDT, conflict resolution, audit logging
- **Autenticación y seguridad**: JWT, encryption, RLS
- **Gestión básica de clientes**: CRUD, search, validation

### 🚧 EN PROGRESO (Fase 8)
- **Tarea 23**: Gestión de créditos (marcada como in_progress)

### 🎯 PRÓXIMAS PRIORIDADES (Basado en credisync-ui-enhancement.md)
1. **Tarea 25**: Implementar sistema de pagos (CRÍTICO)
2. **Tarea 25.2**: Servicio de distribución inteligente de pagos
3. **Tarea 25.3**: Servicio de reportes para dashboard
4. **Tarea 26**: CobroModal avanzado
5. **Tareas 33.1-33.4**: Componentes UI avanzados

### 📱 FUNCIONALIDADES FALTANTES IDENTIFICADAS
- ❌ **CobroModal**: Modal inteligente con distribución de pagos
- ❌ **ClienteCard mejorado**: Estados visuales y acciones
- ❌ **RutaView**: Dashboard con estadísticas del día
- ❌ **SyncStatusIndicator avanzado**: Indicador completo de estado
- ❌ **Distribución proporcional**: Lógica de pagos múltiples

**Nota**: Estas funcionalidades están especificadas en `specs/credisync-ui-enhancement.md` y ahora están integradas en este plan de tareas.
