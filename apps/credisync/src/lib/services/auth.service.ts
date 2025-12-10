import { supabase } from '../supabase';
import { encryptionService } from '../app-config';
import type { User } from '../../types/database';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData extends LoginCredentials {
  nombre: string;
  tenant_id: string;
  rol: 'admin' | 'cobrador' | 'supervisor';
}

export class AuthService {
  /**
   * Sign in with email and password
   */
  async signIn(credentials: LoginCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw error;

    // Get user profile from users table
    const userProfile = await this.getUserProfile(data.user.id);

    return {
      session: data.session,
      user: data.user,
      profile: userProfile,
    };
  }

  /**
   * Sign up new user
   */
  async signUp(signUpData: SignUpData) {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: signUpData.email,
      password: signUpData.password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    // 2. Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        tenant_id: signUpData.tenant_id,
        email: signUpData.email,
        nombre: signUpData.nombre,
        rol: signUpData.rol,
        activo: true,
      })
      .select()
      .single();

    if (profileError) {
      // Rollback: delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return {
      user: authData.user,
      profile: profileData,
    };
  }

  /**
   * Sign out current user
   * Requirements: 17.5
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clear encryption key from memory (Requirement 17.5)
    encryptionService.clearEncryptionKey();

    // Clear any local storage data
    localStorage.clear();
  }

  /**
   * Get current session
   */
  async getSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;
    return session;
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    return user;
  }

  /**
   * Get user profile from users table
   */
  async getUserProfile(userId: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return !!session;
  }

  /**
   * Refresh session
   */
  async refreshSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession();

    if (error) throw error;
    return session;
  }

  /**
   * Reset password
   */
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

// Export singleton instance
export const authService = new AuthService();
