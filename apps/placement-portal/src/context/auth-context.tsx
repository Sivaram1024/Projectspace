import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isEmailVerified: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured]);

  const signUp = async (email: string, password: string) => {
    if (!configured) {
      const msg = 'Supabase credentials not configured in .env file.';
      toast.error(msg);
      return { error: { message: msg } as AuthError };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else if (data.user && !data.session) {
      toast.info('Registration successful! Please check your email for verification link.', {
        duration: 8000,
      });
    } else {
      toast.success('Sign up successful! Welcome.');
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (!configured) {
      const msg = 'Supabase credentials not configured in .env file.';
      toast.error(msg);
      return { error: { message: msg } as AuthError };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Logged in successfully!');
    }
    return { error };
  };

  const signOut = async () => {
    if (!configured) {
      setUser(null);
      setSession(null);
      return { error: null };
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Logged out successfully.');
    }
    return { error };
  };

  const resetPassword = async (email: string) => {
    if (!configured) {
      const msg = 'Supabase credentials not configured in .env file.';
      toast.error(msg);
      return { error: { message: msg } as AuthError };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.info('Password recovery link sent! Please check your email inbox.');
    }
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    if (!configured) {
      const msg = 'Supabase credentials not configured in .env file.';
      toast.error(msg);
      return { error: { message: msg } as AuthError };
    }
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully!');
    }
    return { error };
  };

  const isEmailVerified = Boolean(user && user.email_confirmed_at);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: configured,
        isEmailVerified,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
