/**
 * Stores centralizados para CrediSync
 * 
 * Estos stores integran con @sync/core y siguen la arquitectura del monorepo.
 * NO reimplementan funcionalidad, sino que exponen los servicios de @sync/core
 * como stores reactivos de Svelte.
 */

import { writable, derived } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';
import { crediSyncApp, getAppStatus } from '../app-config';
import { supabase } from '../supabase';

// ============================================================================
// AUTH STORES (integrados con Supabase + @sync/core)
// ============================================================================

export const user = writable<User | null>(null);
export const session = writable<Session | null>(null);
export const authLoading = writable(true);

// Derived stores para auth
export const isAuthenticated = derived(user, ($user) => !!$user);
export const userRole = derived(user, ($user) => $user?.user_metadata?.role || 'cobrador');
export const tenantId = derived(user, ($user) => $user?.user_metadata?.tenant_id);

// ============================================================================
// APP STATUS STORES (usando @sync/core)
// ============================================================================

export const appStatus = writable({
  isStarted: false,
  isOnline: false,
  isSyncing: false,
  queueSize: 0,
  lastSync: null as number | null,
  encryptionReady: false,
  dbStats: null as any
});

// Derived stores para UI
export const isOnline = derived(appStatus, ($status) => $status.isOnline);
export const isSyncing = derived(appStatus, ($status) => $status.isSyncing);
export const hasUnsyncedData = derived(appStatus, ($status) => $status.queueSize > 0);
export const canSync = derived(
  [isOnline, isSyncing], 
  ([$isOnline, $isSyncing]) => $isOnline && !$isSyncing
);

// ============================================================================
// UI STORES
// ============================================================================

export const sidebarOpen = writable(false);
export const currentPage = writable('dashboard');
export const pageTitle = writable('Dashboard');

// Notifications
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
}

export const notifications = writable<Notification[]>([]);

// ============================================================================
// ACTIONS (usando servicios de @sync/core)
// ============================================================================

export const auth = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Limpiar datos usando @sync/core
    if (crediSyncApp.isStarted) {
      await crediSyncApp.stop();
    }
  },

  async initialize() {
    authLoading.set(true);
    
    try {
      // Get initial session
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      if (initialSession) {
        session.set(initialSession);
        user.set(initialSession.user);
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log('Auth state changed:', event, newSession?.user?.email);
        
        session.set(newSession);
        user.set(newSession?.user || null);
        
        if (event === 'SIGNED_OUT') {
          // Usar @sync/core para limpiar datos
          if (crediSyncApp.isStarted) {
            await crediSyncApp.stop();
          }
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      authLoading.set(false);
    }
  }
};

export const app = {
  // Sync actions usando @sync/core
  async sync() {
    try {
      await crediSyncApp.services.sync.sync();
      await updateAppStatus();
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  },

  // UI actions
  toggleSidebar() {
    sidebarOpen.update(open => !open);
  },

  closeSidebar() {
    sidebarOpen.set(false);
  },

  setCurrentPage(page: string, title: string) {
    currentPage.set(page);
    pageTitle.set(title);
    document.title = `${title} - CrediSync`;
  },

  // Notifications
  addNotification(notification: Omit<Notification, 'id' | 'timestamp'>) {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    notifications.update(items => [...items, newNotification]);

    // Auto-remove after 5 seconds if autoClose is true
    if (notification.autoClose !== false) {
      setTimeout(() => {
        app.removeNotification(newNotification.id);
      }, 5000);
    }

    return newNotification.id;
  },

  removeNotification(id: string) {
    notifications.update(items => items.filter(item => item.id !== id));
  },

  clearNotifications() {
    notifications.set([]);
  }
};

// ============================================================================
// STATUS UPDATER (usando @sync/core)
// ============================================================================

async function updateAppStatus() {
  try {
    const status = await getAppStatus();
    appStatus.set(status);
  } catch (error) {
    console.error('Error updating app status:', error);
  }
}

// Update status every 5 seconds
setInterval(updateAppStatus, 5000);

// Initialize network status listener
window.addEventListener('online', updateAppStatus);
window.addEventListener('offline', updateAppStatus);

// Initialize auth on module load
auth.initialize();