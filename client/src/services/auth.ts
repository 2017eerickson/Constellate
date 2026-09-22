import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import apiClient from '../api/client';
import { AuthResponse, User } from '../types';

export function configureGoogleSignIn(): void {
  GoogleSignin.configure({
    webClientId: Constants.expoConfig?.extra?.webClientId,
    iosClientId: Constants.expoConfig?.extra?.iosClientId,
  });
}

export async function signInWithGoogle(): Promise<{ user: User; isNewUser: boolean }> {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;

  if (!idToken) {
    throw new Error('No ID token received from Google');
  }

  const { data } = await apiClient.post<AuthResponse>('/users/auth/google/', {
    id_token: idToken,
  });

  await AsyncStorage.setItem('access_token', data.access);
  await AsyncStorage.setItem('refresh_token', data.refresh);

  return {
    user: data.user,
    isNewUser: data.is_new_user,
  };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ user: User; isNewUser: boolean }> {
  const { data } = await apiClient.post<AuthResponse>('/users/auth/login/', {
    email,
    password,
  });

  await AsyncStorage.setItem('access_token', data.access);
  await AsyncStorage.setItem('refresh_token', data.refresh);

  return { user: data.user, isNewUser: false };
}

export async function registerWithEmail(
  email: string,
  password: string,
  firstName: string,
): Promise<{ user: User; isNewUser: boolean }> {
  const { data } = await apiClient.post<AuthResponse>('/users/auth/register/', {
    email,
    password,
    first_name: firstName,
  });

  await AsyncStorage.setItem('access_token', data.access);
  await AsyncStorage.setItem('refresh_token', data.refresh);

  return { user: data.user, isNewUser: true };
}

export async function completeOnboarding(birthday: string, firstName?: string): Promise<User> {
  const body: { birthday: string; first_name?: string } = { birthday };
  if (firstName) body.first_name = firstName;
  const { data } = await apiClient.post<{ user: User }>('/users/auth/onboarding/', body);
  return data.user;
}

export async function signOut(): Promise<void> {
  await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
  try {
    await GoogleSignin.signOut();
  } catch {
    // Google sign-out failing shouldn't block app sign-out
  }
}

export async function getStoredAuth(): Promise<User | null> {
  const accessToken = await AsyncStorage.getItem('access_token');
  if (!accessToken) {
    return null;
  }

  try {
    const { data } = await apiClient.get<{ user: User }>('/users/auth/me/');
    return data.user;
  } catch {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    return null;
  }
}
