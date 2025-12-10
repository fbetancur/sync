/**
 * Servicio de Autenticación para @sync/core
 * 
 * Proporciona una capa de abstracción sobre Supabase Auth
 * con funcionalidades offline-first y gestión de sesiones.
 */

import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js';

export interface AuthConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: Error | null;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  options?: {
    data?: Record<string, any>;
  };
}

/**
 * Servicio de autenticación que integra Supabase Auth
 * con las capacidades offline-first de @sync/core
 */
export class AuthService {
  private supabase: SupabaseClient | null = null;
  private currentUser: User | null = null;
  private currentSession: Session | null = null;
  private initialized = false;

  constructor(private config: AuthConfig) {}

  /**
   * Inicializar el servicio de autenticación
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Crear cliente de Supabase
      this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseKey);

      // Obtener sesión actual
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.warn('Error obteniendo sesión:', error.message);
      } else if (session) {
        this.currentSession = session;
        this.currentUser = session.user;
        console.log('✅ Sesión existente restaurada');
      }

      // Configurar listener de cambios de auth
      this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth state change:', event);
        this.currentSession = session;
        this.currentUser = session?.user || null;
      });

      this.initialized = true;
      console.log('✅ AuthService inicializado');
    } catch (error) {
      console.error('❌ Error inicializando AuthService:', error);
      throw error;
    }
  }

  /**
   * Iniciar sesión con email y contraseña
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    if (!this.supabase) {
      throw new Error('AuthService no está inicializado');
    }

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return {
          user: null,
          session: null,
          error: new Error(error.message)
        };
      }

      this.currentUser = data.user;
      this.currentSession = data.session;

      return {
        user: data.user,
        session: data.session,
        error: null
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error : new Error('Error desconocido en signIn')
      };
    }
  }

  /**
   * Registrar nuevo usuario
   */
  async signUp(email: string, password: string, options?: SignUpCredentials['options']): Promise<AuthResult> {
    if (!this.supabase) {
      throw new Error('AuthService no está inicializado');
    }

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options
      });

      if (error) {
        return {
          user: null,
          session: null,
          error: new Error(error.message)
        };
      }

      // Para signUp, el usuario puede estar pendiente de confirmación
      this.currentUser = data.user;
      this.currentSession = data.session;

      return {
        user: data.user,
        session: data.session,
        error: null
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error : new Error('Error desconocido en signUp')
      };
    }
  }

  /**
   * Cerrar sesión
   */
  async signOut(): Promise<{ error: Error | null }> {
    if (!this.supabase) {
      throw new Error('AuthService no está inicializado');
    }

    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        return { error: new Error(error.message) };
      }

      this.currentUser = null;
      this.currentSession = null;

      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Error desconocido en signOut')
      };
    }
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Obtener sesión actual
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentSession !== null;
  }

  /**
   * Obtener token de acceso actual
   */
  getAccessToken(): string | null {
    return this.currentSession?.access_token || null;
  }

  /**
   * Refrescar token de acceso
   */
  async refreshSession(): Promise<AuthResult> {
    if (!this.supabase) {
      throw new Error('AuthService no está inicializado');
    }

    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        return {
          user: null,
          session: null,
          error: new Error(error.message)
        };
      }

      this.currentUser = data.user;
      this.currentSession = data.session;

      return {
        user: data.user,
        session: data.session,
        error: null
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error : new Error('Error desconocido en refreshSession')
      };
    }
  }

  /**
   * Verificar si el servicio está inicializado
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Obtener cliente de Supabase (para casos avanzados)
   */
  getSupabaseClient(): SupabaseClient | null {
    return this.supabase;
  }
}