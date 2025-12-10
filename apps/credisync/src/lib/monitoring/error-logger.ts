/**
 * Error Logging and Monitoring Service
 * 
 * Integrates Sentry for error tracking and performance monitoring.
 * Provides local error logging and sensitive data filtering.
 * 
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6
 */

import * as Sentry from '@sentry/svelte';
import { db } from '../app-config';
import { auditLogger } from '../app-config';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ErrorLogEntry {
  id?: number;
  timestamp: number;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context: Record<string, any>;
  user_id?: string;
  device_id?: string;
  app_version: string;
  sent_to_sentry: boolean;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

// ============================================================================
// SENSITIVE DATA PATTERNS
// ============================================================================

const SENSITIVE_PATTERNS = [
  /\b\d{3}-?\d{2}-?\d{4}\b/g, // SSN
  /\b\d{16}\b/g, // Credit card
  /\b\d{10,11}\b/g, // Phone numbers
  /password/gi,
  /token/gi,
  /api[_-]?key/gi,
  /secret/gi,
  /authorization/gi,
];

const SENSITIVE_KEYS = [
  'password',
  'token',
  'api_key',
  'apiKey',
  'secret',
  'authorization',
  'numero_documento',
  'telefono',
  'telefono_2',
  'telefono_fiador',
];

// ============================================================================
// ERROR LOGGER CLASS
// ============================================================================

export class ErrorLogger {
  private static instance: ErrorLogger;
  private initialized: boolean = false;
  private localLogsEnabled: boolean = true;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Initialize Sentry
   * Requirements: 20.1
   */
  initialize(options: {
    dsn?: string;
    environment?: string;
    release?: string;
    tracesSampleRate?: number;
    enableLocalLogs?: boolean;
  }): void {
    if (this.initialized) {
      console.warn('ErrorLogger already initialized');
      return;
    }

    this.localLogsEnabled = options.enableLocalLogs ?? true;

    // Only initialize Sentry if DSN is provided
    if (options.dsn) {
      try {
        Sentry.init({
          dsn: options.dsn,
          environment: options.environment || 'development',
          release: options.release || import.meta.env.VITE_APP_VERSION || '1.0.0',
          
          // Performance monitoring
          tracesSampleRate: options.tracesSampleRate || 0.1,
          
          // Integrations
          integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
              maskAllText: true,
              blockAllMedia: true,
            }),
          ],
          
          // Replay sampling
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
          
          // Before send hook to filter sensitive data
          beforeSend: (event, hint) => {
            return this.filterSensitiveData(event);
          },
          
          // Before breadcrumb hook
          beforeBreadcrumb: (breadcrumb) => {
            return this.filterSensitiveBreadcrumb(breadcrumb);
          },
        });

        this.initialized = true;
        console.log('✅ Sentry initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Sentry:', error);
      }
    } else {
      console.log('⚠️ Sentry DSN not provided, running in local-only mode');
      this.initialized = true;
    }
  }

  /**
   * Log an error
   * Requirements: 20.1, 20.3, 20.4
   */
  async logError(
    error: Error | string,
    context?: Record<string, any>,
    level: 'error' | 'warning' | 'info' = 'error'
  ): Promise<void> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    // Filter sensitive data from context
    const filteredContext = context ? this.filterSensitiveObject(context) : {};

    // Log locally
    if (this.localLogsEnabled) {
      await this.logLocally({
        timestamp: Date.now(),
        level,
        message: errorMessage,
        stack: errorStack,
        context: filteredContext,
        app_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        sent_to_sentry: this.initialized,
      });
    }

    // Send to Sentry if initialized
    if (this.initialized && Sentry.isInitialized()) {
      try {
        Sentry.withScope((scope) => {
          // Add context
          if (filteredContext) {
            Object.entries(filteredContext).forEach(([key, value]) => {
              scope.setContext(key, value);
            });
          }

          // Set level
          scope.setLevel(level as Sentry.SeverityLevel);

          // Capture exception or message
          if (typeof error === 'string') {
            Sentry.captureMessage(error, level as Sentry.SeverityLevel);
          } else {
            Sentry.captureException(error);
          }
        });
      } catch (sentryError) {
        console.error('Failed to send error to Sentry:', sentryError);
      }
    }

    // Also log to audit log for critical errors
    if (level === 'error') {
      try {
        await auditLogger.logEvent({
          tenant_id: filteredContext.tenant_id || 'unknown',
          user_id: filteredContext.user_id || 'unknown',
          device_id: filteredContext.device_id || 'unknown',
          event_type: 'ERROR',
          aggregate_type: 'user',
          aggregate_id: filteredContext.user_id || 'unknown',
          data: {
            message: errorMessage,
            stack: errorStack,
            context: filteredContext,
          },
        });
      } catch (auditError) {
        console.error('Failed to log error to audit log:', auditError);
      }
    }
  }

  /**
   * Log performance metric
   * Requirements: 20.2
   */
  logPerformance(metric: PerformanceMetric): void {
    if (this.initialized && Sentry.isInitialized()) {
      Sentry.metrics.distribution(metric.name, metric.value, {
        tags: metric.tags,
        unit: 'millisecond',
      });
    }

    // Log locally
    console.log(`📊 Performance: ${metric.name} = ${metric.value}ms`, metric.tags);
  }

  /**
   * Set user context
   * Requirements: 20.4
   */
  setUser(user: {
    id: string;
    email?: string;
    username?: string;
    tenant_id?: string;
  }): void {
    if (this.initialized && Sentry.isInitialized()) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
      });

      // Set tenant as tag
      if (user.tenant_id) {
        Sentry.setTag('tenant_id', user.tenant_id);
      }
    }
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (this.initialized && Sentry.isInitialized()) {
      Sentry.setUser(null);
    }
  }

  /**
   * Add breadcrumb
   * Requirements: 20.4
   */
  addBreadcrumb(
    message: string,
    category: string,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, any>
  ): void {
    if (this.initialized && Sentry.isInitialized()) {
      Sentry.addBreadcrumb({
        message,
        category,
        level: level as Sentry.SeverityLevel,
        data: data ? this.filterSensitiveObject(data) : undefined,
        timestamp: Date.now() / 1000,
      });
    }
  }

  /**
   * Filter sensitive data from Sentry event
   * Requirements: 20.5, 20.6
   */
  private filterSensitiveData(event: Sentry.Event): Sentry.Event | null {
    // Filter request data
    if (event.request) {
      if (event.request.headers) {
        event.request.headers = this.filterSensitiveObject(event.request.headers);
      }
      if (event.request.data) {
        event.request.data = this.filterSensitiveObject(event.request.data);
      }
      if (event.request.cookies) {
        event.request.cookies = {};
      }
    }

    // Filter extra data
    if (event.extra) {
      event.extra = this.filterSensitiveObject(event.extra);
    }

    // Filter contexts
    if (event.contexts) {
      Object.keys(event.contexts).forEach((key) => {
        if (event.contexts![key]) {
          event.contexts![key] = this.filterSensitiveObject(event.contexts![key]);
        }
      });
    }

    // Filter exception values
    if (event.exception?.values) {
      event.exception.values = event.exception.values.map((exception) => {
        if (exception.value) {
          exception.value = this.filterSensitiveString(exception.value);
        }
        return exception;
      });
    }

    return event;
  }

  /**
   * Filter sensitive data from breadcrumb
   * Requirements: 20.5, 20.6
   */
  private filterSensitiveBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
    if (breadcrumb.data) {
      breadcrumb.data = this.filterSensitiveObject(breadcrumb.data);
    }

    if (breadcrumb.message) {
      breadcrumb.message = this.filterSensitiveString(breadcrumb.message);
    }

    return breadcrumb;
  }

  /**
   * Filter sensitive data from object
   * Requirements: 20.6
   */
  private filterSensitiveObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.filterSensitiveObject(item));
    }

    const filtered: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if key is sensitive
      if (SENSITIVE_KEYS.some((pattern) => key.toLowerCase().includes(pattern.toLowerCase()))) {
        filtered[key] = '[FILTERED]';
      } else if (typeof value === 'string') {
        filtered[key] = this.filterSensitiveString(value);
      } else if (typeof value === 'object' && value !== null) {
        filtered[key] = this.filterSensitiveObject(value);
      } else {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  /**
   * Filter sensitive data from string
   * Requirements: 20.6
   */
  private filterSensitiveString(str: string): string {
    let filtered = str;

    SENSITIVE_PATTERNS.forEach((pattern) => {
      filtered = filtered.replace(pattern, '[FILTERED]');
    });

    return filtered;
  }

  /**
   * Log error locally to IndexedDB
   * Requirements: 20.3
   */
  private async logLocally(entry: ErrorLogEntry): Promise<void> {
    try {
      // Store in app_state table as error logs
      const errorLogs = await db.app_state.get('error_logs');
      const logs: ErrorLogEntry[] = errorLogs?.value || [];

      // Add new log
      logs.push(entry);

      // Keep only last 100 errors
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }

      // Save back
      await db.app_state.put({
        key: 'error_logs',
        value: logs,
        updated_at: Date.now(),
      });
    } catch (error) {
      console.error('Failed to log error locally:', error);
    }
  }

  /**
   * Get local error logs
   */
  async getLocalLogs(limit: number = 50): Promise<ErrorLogEntry[]> {
    try {
      const errorLogs = await db.app_state.get('error_logs');
      const logs: ErrorLogEntry[] = errorLogs?.value || [];
      return logs.slice(-limit);
    } catch (error) {
      console.error('Failed to get local logs:', error);
      return [];
    }
  }

  /**
   * Clear local error logs
   */
  async clearLocalLogs(): Promise<void> {
    try {
      await db.app_state.delete('error_logs');
    } catch (error) {
      console.error('Failed to clear local logs:', error);
    }
  }

  /**
   * Measure performance of a function
   * Requirements: 20.2
   */
  async measurePerformance<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      this.logPerformance({
        name,
        value: duration,
        timestamp: Date.now(),
        tags,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.logPerformance({
        name: `${name}_error`,
        value: duration,
        timestamp: Date.now(),
        tags: { ...tags, error: 'true' },
      });

      throw error;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const errorLogger = ErrorLogger.getInstance();
