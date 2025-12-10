/**
 * Main application factory for @sync/core
 */

export interface SyncAppConfig {
  appName: string;
  supabaseUrl: string;
  supabaseKey: string;
  encryptionEnabled?: boolean;
  auditEnabled?: boolean;
  syncInterval?: number;
}

export interface SyncApp {
  // Services will be added as we extract modules
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Creates a new sync application instance
 */
export function createSyncApp(config: SyncAppConfig): SyncApp {
  // Implementation will be added as we extract modules
  return {
    async start() {
      console.log(`Starting ${config.appName} sync application...`);
    },
    async stop() {
      console.log(`Stopping ${config.appName} sync application...`);
    }
  };
}