/**
 * UI-related types and interfaces
 */

// Component prop types
export interface ComponentProps {
  class?: string;
  id?: string;
  disabled?: boolean;
}

// Sync indicator component
export interface SyncIndicatorProps extends ComponentProps {
  status: SyncStatus;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

// Connection status component
export interface ConnectionStatusProps extends ComponentProps {
  showIcon?: boolean;
  showText?: boolean;
}

// Form state management
export interface FormState<T = any> {
  data: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  dirty: boolean;
  valid: boolean;
  submitting: boolean;
}

// PIN entry component
export interface PinEntryProps extends ComponentProps {
  length?: number;
  onComplete?: (pin: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

// Loading spinner component
export interface LoadingSpinnerProps extends ComponentProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
}

// Form auto-save component
export interface FormAutoSaveProps extends ComponentProps {
  data: any;
  onSave: (data: any) => Promise<void>;
  interval?: number;
  enabled?: boolean;
}

// Modal and dialog types
export interface ModalProps extends ComponentProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
}

// Toast notification types
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  actions?: ToastAction[];
}

export interface ToastAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary';
}

// Theme and styling types
export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: Record<string, string>;
    fontWeight: Record<string, number>;
  };
}
