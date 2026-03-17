/**
 * Numia v1.0 - Authentication Context (Supabase)
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { type User as SupabaseUser } from '@supabase/supabase-js';
import {
  onAuthChange,
  signInWithGoogle as supabaseSignInGoogle,
  signInWithEmail as supabaseSignInEmail,
  signUpWithEmail as supabaseSignUpEmail,
  resetPassword as supabaseResetPassword,
  signOut as supabaseSignOut
} from '@/lib/supabase/auth';

// Define User type to abstract provider details
// We map Supabase User to this AppUser interface to minimize breakage in components
interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified?: boolean;
  provider?: string;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Supabase onAuthChange returns an unsubscribe function
    const unsubscribe = onAuthChange((supabaseUser: SupabaseUser | null) => {
      if (supabaseUser) {
        setUser({
          uid: supabaseUser.id,
          email: supabaseUser.email || null,
          // Supabase stores extra fields in user_metadata
          displayName: supabaseUser.user_metadata?.display_name || supabaseUser.user_metadata?.full_name || null,
          photoURL: supabaseUser.user_metadata?.photo_url || supabaseUser.user_metadata?.avatar_url || null,
          emailVerified: !!supabaseUser.email_confirmed_at,
          provider: supabaseUser.app_metadata?.provider || 'email',
          metadata: {
            creationTime: supabaseUser.created_at,
            lastSignInTime: supabaseUser.last_sign_in_at,
          },
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    await supabaseSignInGoogle();
  };

  const signInWithEmail = async (email: string, password: string) => {
    await supabaseSignInEmail(email, password);
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    await supabaseSignUpEmail(email, password, displayName);
  };

  const resetPassword = async (email: string) => {
    await supabaseResetPassword(email);
  };

  const signOut = async () => {
    await supabaseSignOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
