/**
 * Test Setup para CrediSync
 * 
 * Configuración global para tests de Vitest
 */

import { vi } from 'vitest';
import 'fake-indexeddb/auto';

// Mock global para window.matchMedia (requerido por algunos componentes)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock para IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock para ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock para fetch si no está disponible
if (!global.fetch) {
  global.fetch = vi.fn();
}

// Configuración para fake-indexeddb
global.structuredClone = structuredClone || ((obj: any) => JSON.parse(JSON.stringify(obj)));