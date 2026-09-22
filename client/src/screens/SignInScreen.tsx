import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SignInScreen() {
  const { signIn, signInWithEmail, register } = useAuth();
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');

  async function handleGoogleSignIn() {
    setIsGoogleSigningIn(true);
    try {
      await signIn();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      Alert.alert('Sign In Failed', message);
    } finally {
      setIsGoogleSigningIn(false);
    }
  }

  async function handleEmailSubmit() {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password');
      return;
    }

    if (isRegisterMode && !firstName.trim()) {
      Alert.alert('Missing Name', 'Please enter your first name');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        await register(email.trim(), password, firstName.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      Alert.alert(isRegisterMode ? 'Registration Failed' : 'Sign In Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const busy = isGoogleSigningIn || isSubmitting;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Constellate</Text>
      <Text style={styles.subtitle}>Your relationships, gamified</Text>

      <TouchableOpacity
        style={[styles.googleButton, busy && styles.buttonDisabled]}
        onPress={handleGoogleSignIn}
        disabled={busy}
      >
        <Text style={styles.googleButtonText}>
          {isGoogleSigningIn ? 'Signing in...' : 'Sign in with Google'}
        </Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
      
      {isRegisterMode && (
        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          editable={!busy}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!busy}
      />

      <TouchableOpacity
        style={[styles.emailButton, busy && styles.buttonDisabled]}
        onPress={handleEmailSubmit}
        disabled={busy}
      >
        <Text style={styles.emailButtonText}>
          {isSubmitting
            ? (isRegisterMode ? 'Creating account...' : 'Signing in...')
            : (isRegisterMode ? 'Create Account' : 'Sign In')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIsRegisterMode(!isRegisterMode)}
        disabled={busy}
      >
        <Text style={styles.toggleText}>
          {isRegisterMode
            ? 'Already have an account? Sign In'
            : "Don't have an account? Register"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#999',
    fontSize: 14,
  },
  input: {
    width: '80%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  emailButton: {
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  toggleText: {
    color: '#4285F4',
    fontSize: 14,
  },
});
