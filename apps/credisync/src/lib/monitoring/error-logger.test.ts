/**
 * Tests for Error Logger
 * 
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorLogger } from './error-logger';
import { db } from '../db/index';

describe('ErrorLogger', () => {
  let logger: ErrorLogger;

  beforeEach(async () => {
    // Clear database
    await db.app_state.clear();
    
    // Get fresh instance
    // @ts-ignore - accessing private static for testing
    ErrorLogger.instance = undefined;
    logger = ErrorLogger.getInstance();
    
    // Initialize without Sentry DSN (local-only mode)
    logger.initialize({
      enableLocalLogs: true,
    });
  });

  describe('Initialization', () => {
    it('should initialize in local-only mode without DSN', () => {
      expect(logger).toBeDefined();
    });

    it('should be a singleton', () => {
      const instance1 = ErrorLogger.getInstance();
      const instance2 = ErrorLogger.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Error Logging', () => {
    it('should log error with string message', async () => {
      await logger.logError('Test error message');

      const logs = await logger.getLocalLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test error message');
      expect(logs[0].level).toBe('error');
    });

    it('should log error with Error object', async () => {
      const error = new Error('Test error object');
      await logger.logError(error);

      const logs = await logger.getLocalLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test error object');
      expect(logs[0].stack).toBeDefined();
    });

    it('should log error with context', async () => {
      await logger.logError('Test error', {
        user_id: 'user-123',
        action: 'test_action',
      });

      const logs = await logger.getLocalLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].context.user_id).toBe('user-123');
      expect(logs[0].context.action).toBe('test_action');
    });

    it('should log error with different levels', async () => {
      await logger.logError('Error message', {}, 'error');
      await logger.logError('Warning message', {}, 'warning');
      await logger.logError('Info message', {}, 'info');

      const logs = await logger.getLocalLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].level).toBe('error');
      expect(logs[1].level).toBe('warning');
      expect(logs[2].level).toBe('info');
    });

    it('should keep only last 100 errors', async () => {
      // Log 150 errors
      for (let i = 0; i < 150; i++) {
        await logger.logError(`Error ${i}`);
      }

      const logs = await logger.getLocalLogs(200);
      expect(logs.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Sensitive Data Filtering', () => {
    it('should filter sensitive keys from context', async () => {
      await logger.logError('Test error', {
        user_id: 'user-123',
        password: 'secret123',
        token: 'abc123',
        api_key: 'key123',
        normal_field: 'normal_value',
      });

      const logs = await logger.getLocalLogs();
      expect(logs[0].context.password).toBe('[FILTERED]');
      expect(logs[0].context.token).toBe('[FILTERED]');
      expect(logs[0].context.api_key).toBe('[FILTERED]');
      expect(logs[0].context.normal_field).toBe('normal_value');
    });

    it('should filter phone numbers from context', async () => {
      await logger.logError('Test error', {
        telefono: '3001234567',
        telefono_2: '3009876543',
        other_field: 'value',
      });

      const logs = await logger.getLocalLogs();
      expect(logs[0].context.telefono).toBe('[FILTERED]');
      expect(logs[0].context.telefono_2).toBe('[FILTERED]');
      expect(logs[0].context.other_field).toBe('value');
    });

    it('should filter nested sensitive data', async () => {
      await logger.logError('Test error', {
        user: {
          id: 'user-123',
          password: 'secret',
          profile: {
            name: 'John',
            api_key: 'key123',
          },
        },
      });

      const logs = await logger.getLocalLogs();
      expect(logs[0].context.user.password).toBe('[FILTERED]');
      expect(logs[0].context.user.profile.api_key).toBe('[FILTERED]');
      expect(logs[0].context.user.profile.name).toBe('John');
    });

    it('should filter sensitive patterns from strings', async () => {
      await logger.logError('Test error', {
        message: 'User password is secret123 and token is abc-def-123',
      });

      const logs = await logger.getLocalLogs();
      expect(logs[0].context.message).toContain('[FILTERED]');
    });
  });

  describe('Performance Logging', () => {
    it('should log performance metric', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      logger.logPerformance({
        name: 'test_operation',
        value: 150,
        timestamp: Date.now(),
        tags: { component: 'test' },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance: test_operation = 150ms'),
        expect.objectContaining({ component: 'test' })
      );

      consoleSpy.mockRestore();
    });

    it('should measure performance of async function', async () => {
      const testFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'result';
      };

      const result = await logger.measurePerformance('test_async', testFn);

      expect(result).toBe('result');
    });

    it('should measure performance even when function throws', async () => {
      const testFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Test error');
      };

      await expect(
        logger.measurePerformance('test_error', testFn)
      ).rejects.toThrow('Test error');
    });
  });

  describe('User Context', () => {
    it('should set user context', () => {
      expect(() => {
        logger.setUser({
          id: 'user-123',
          email: 'user@example.com',
          username: 'testuser',
          tenant_id: 'tenant-1',
        });
      }).not.toThrow();
    });

    it('should clear user context', () => {
      logger.setUser({
        id: 'user-123',
        email: 'user@example.com',
      });

      expect(() => {
        logger.clearUser();
      }).not.toThrow();
    });
  });

  describe('Breadcrumbs', () => {
    it('should add breadcrumb', () => {
      expect(() => {
        logger.addBreadcrumb(
          'User clicked button',
          'ui.click',
          'info',
          { button_id: 'submit' }
        );
      }).not.toThrow();
    });

    it('should add breadcrumb with different levels', () => {
      expect(() => {
        logger.addBreadcrumb('Debug message', 'debug', 'debug');
        logger.addBreadcrumb('Info message', 'info', 'info');
        logger.addBreadcrumb('Warning message', 'warning', 'warning');
        logger.addBreadcrumb('Error message', 'error', 'error');
      }).not.toThrow();
    });
  });

  describe('Local Logs Management', () => {
    it('should get local logs with limit', async () => {
      for (let i = 0; i < 10; i++) {
        await logger.logError(`Error ${i}`);
      }

      const logs = await logger.getLocalLogs(5);
      expect(logs).toHaveLength(5);
      // Should get the last 5
      expect(logs[4].message).toBe('Error 9');
    });

    it('should clear local logs', async () => {
      await logger.logError('Test error 1');
      await logger.logError('Test error 2');

      let logs = await logger.getLocalLogs();
      expect(logs).toHaveLength(2);

      await logger.clearLocalLogs();

      logs = await logger.getLocalLogs();
      expect(logs).toHaveLength(0);
    });

    it('should handle errors when getting logs fails', async () => {
      // Mock db.app_state.get to throw error
      const originalGet = db.app_state.get;
      db.app_state.get = vi.fn().mockRejectedValue(new Error('DB error'));

      const logs = await logger.getLocalLogs();
      expect(logs).toEqual([]);

      // Restore
      db.app_state.get = originalGet;
    });
  });

  describe('Error Handling', () => {
    it('should handle logging errors gracefully', async () => {
      // Mock db.app_state.put to throw error
      const originalPut = db.app_state.put;
      db.app_state.put = vi.fn().mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(
        logger.logError('Test error')
      ).resolves.not.toThrow();

      // Restore
      db.app_state.put = originalPut;
    });
  });
});
