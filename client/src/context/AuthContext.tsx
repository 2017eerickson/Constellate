import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  signInWithGoogle,
  signInWithEmail as authSignInWithEmail,
  registerWithEmail,
  signOut as authSignOut,
  getStoredAuth,
  completeOnboarding as authCompleteOnboarding,
} from '../services/auth';
import { AuthContextType, User } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const storedUser = await getStoredAuth();
        if (storedUser) {
          setUser(storedUser);
          setIsNewUser(!storedUser.onboarding_complete);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  async function signIn() {
    const result = await signInWithGoogle();
    setUser(result.user);
    setIsNewUser(result.isNewUser);
  }

  async function signInWithEmail(email: string, password: string) {
    const result = await authSignInWithEmail(email, password);
    setUser(result.user);
    setIsNewUser(result.isNewUser);
  }

  async function register(email: string, password: string, firstName: string) {
    const result = await registerWithEmail(email, password, firstName);
    setUser(result.user);
    setIsNewUser(result.isNewUser);
  }

  async function signOut() {
    await authSignOut();
    setUser(null);
    setIsNewUser(false);
  }

  async function completeOnboarding(birthday: string, firstName?: string) {
    const updatedUser = await authCompleteOnboarding(birthday, firstName);
    setUser(updatedUser);
    setIsNewUser(false);
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isNewUser, signIn, signInWithEmail, register, signOut, completeOnboarding }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
