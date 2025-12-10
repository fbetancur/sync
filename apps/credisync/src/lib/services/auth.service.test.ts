/**
 * Tests for Authentication Service
 *
 * Tests authentication functionality with Supabase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';

// Mock Supabase client
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      refreshSession: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      admin: {
        deleteUser: vi.fn()
      }
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  describe('signIn', () => {
    it('should sign in successfully with valid credentials', async () => {
      const mockSession = { access_token: 'token', user: { id: 'user-1' } };
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockProfile = {
        id: 'user-1',
        tenant_id: 'tenant-1',
        email: 'test@example.com',
        nombre: 'Test User',
        rol: 'cobrador' as const,
        activo: true
      };

      const { supabase } = await import('../supabase');

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any);

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result.session).toEqual(mockSession);
      expect(result.user).toEqual(mockUser);
    });

    it('should throw error with invalid credentials', async () => {
      const { supabase } = await import('../supabase');

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { session: null, user: null },
        error: new Error('Invalid credentials')
      } as any);

      await expect(
        authService.signIn({
          email: 'wrong@example.com',
          password: 'wrongpassword'
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      const { supabase } = await import('../supabase');

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null
      } as any);

      // Mock localStorage
      const localStorageMock = {
        clear: vi.fn()
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true
      });

      await authService.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(localStorageMock.clear).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should return current session', async () => {
      const mockSession = { access_token: 'token', user: { id: 'user-1' } };
      const { supabase } = await import('../supabase');

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      } as any);

      const session = await authService.getSession();

      expect(session).toEqual(mockSession);
    });

    it('should return null when no session', async () => {
      const { supabase } = await import('../supabase');

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      } as any);

      const session = await authService.getSession();

      expect(session).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when session exists', async () => {
      const mockSession = { access_token: 'token' };
      const { supabase } = await import('../supabase');

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      } as any);

      const isAuth = await authService.isAuthenticated();

      expect(isAuth).toBe(true);
    });

    it('should return false when no session', async () => {
      const { supabase } = await import('../supabase');

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      } as any);

      const isAuth = await authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });
  });
});
