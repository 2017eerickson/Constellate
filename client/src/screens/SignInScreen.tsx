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
import { ActionButton } from '../components';
import { scale, moderateScale } from '../styles/scale';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';

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
      style={commonStyles.screenCentered}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Constellate</Text>
      <Text style={[commonStyles.subtitle, styles.subtitleSpacing]}>Your relationships, gamified</Text>

      <ActionButton
        variant="google"
        onPress={handleGoogleSignIn}
        text="Sign in with Google"
        loadingText="Signing in..."
        loading={isGoogleSigningIn}
        disabled={busy}
        style={styles.googleButton}
      />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {isRegisterMode && (
        <TextInput
          style={commonStyles.inputBordered}
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

      <ActionButton
        onPress={handleEmailSubmit}
        text={isRegisterMode ? 'Create Account' : 'Sign In'}
        loadingText={isRegisterMode ? 'Creating account...' : 'Signing in...'}
        loading={isSubmitting}
        disabled={busy}
        style={styles.emailButton}
      />

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
  title: {
    fontSize: moderateScale(36),
    fontWeight: 'bold',
    marginBottom: moderateScale(8),
  },
  subtitleSpacing: {
    marginBottom: scale(40),
  },
  googleButton: {
    width: '80%',
    paddingHorizontal: scale(32),
    paddingVertical: scale(14),
    padding: undefined,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginVertical: scale(24),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerText: {
    marginHorizontal: scale(12),
    color: colors.textMuted,
    fontSize: moderateScale(14),
  },
  emailButton: {
    width: '80%',
    paddingHorizontal: scale(32),
    paddingVertical: scale(14),
    marginTop: scale(4),
    marginBottom: scale(16),
    padding: undefined,
  },
  toggleText: {
    color: colors.googleBlue,
    fontSize: moderateScale(14),
  },
});
