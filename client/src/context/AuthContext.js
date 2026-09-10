import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithGoogle,
  signOut as authSignOut,
  getStoredAuth,
  completeOnboarding as auth ,
  CompleteOnboarding,
} from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // On app startup, check if user is already signed in
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

  async function signOut() {
    await authSignOut();
    setUser(null);
    setIsNewUser(false);
  }

  async function completeOnboarding(birthday) {
    const updatedUser = await authCompleteOnboarding(birthday);
    setUser(updatedUser);
    setIsNewUser(false);
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isNewUser, signIn, signOut, completeOnboarding }}
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