import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import apiClient from '../api/client';

// Call this once at app startup (in App.js)
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: Constants.expoConfig.extra.webClientId,
    iosClientId: Constants.expoConfig.extra.iosClientId,
  });
}

// Sign in with Google, send token to backend, store JWTs
export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;

  if (!idToken) {
    throw new Error('No ID token received from Google');
  }

  // Send the Google ID token to your backend for verification
  const { data } = await apiClient.post('/auth/google/', {
    id_token: idToken,
  });

  // Store the JWT pair on the device
  await AsyncStorage.setItem('access_token', data.access);
  await AsyncStorage.setItem('refresh_token', data.refresh);

  return {
    user: data.user,
    isNewUser: data.is_new_user,
  };
}

// Complete onboarding (save birthday)
export async function completeOnboarding(birthday) {
  const { data } = await apiClient.post('/auth/onboarding/', { birthday });
  return data.user;
}

// Sign out — clear tokens and Google session
export async function signOut() {
  await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
  try {
    await GoogleSignin.signOut();
  } catch {
    // Google sign-out failing shouldn't block app sign-out
  }
}

// Check if user has stored tokens (used on app startup)
export async function getStoredAuth() {
  const accessToken = await AsyncStorage.getItem('access_token');
  if (!accessToken) {
    return null;
  }

  // Verify the token still works by fetching current user data
  try {
    const { data } = await apiClient.get('/auth/me/');
    return data.user;
  } catch {
    // Token expired and refresh failed — user needs to sign in again
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    return null;
  }
}
