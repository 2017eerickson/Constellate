import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFonts, Megrim_400Regular } from '@expo-google-fonts/megrim';
import { useAuth } from '../context/AuthContext';
import { ActionButton, AppText as Text, LandingBackground } from '../components';
import { scale, moderateScale } from '../styles/scale';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';
import { Ionicons } from '@expo/vector-icons';

export default function SignInScreen() {
  const [fontsLoaded] = useFonts({ Megrim_400Regular });
  const { signIn, signInWithEmail, register } = useAuth();
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      Alert.alert(isRegisterMode ? 'Registration Failed' : 'Sign In Failed', 
        (error as { status: number }).status === 400 ? 'Password is too weak. Password must be 8 characters long and it cant only contain numbers' 
        : (error as { status: number }).status === 401 ? 'Username or password is incorrect' : message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const busy = isGoogleSigningIn || isSubmitting;

  return (
    <LandingBackground>
    <KeyboardAvoidingView
      style={[commonStyles.screenCentered, styles.transparent]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Constellate</Text>
        <Text style={[styles.title, styles.titleShadow1]}>Constellate</Text>
        <Text style={[styles.title, styles.titleShadow2]}>Constellate</Text>
        <Text style={[styles.title, styles.titleShadow3]}>Constellate</Text>
      </View>
      <Text style={[commonStyles.subtitle, styles.subtitleSpacing, styles.lightText]}>Your relationships, gamified</Text>

      <ActionButton
        variant="google"
        onPress={handleGoogleSignIn}
        text="Sign in with Google"
        testID="google-signin-button"
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
      <View style={{ position: 'relative', width: '80%' }}>
        <TextInput
          style={[commonStyles.inputBordered, styles.frostedInput]}
          placeholder="First Name"
          placeholderTextColor="rgba(255,255,255,0.5)"
          testID="first-name-input"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          editable={!busy}
        />
      </View>
      )}
      <View style={{ position: 'relative', width: '80%' }}>
        <TextInput
          style={[commonStyles.inputBordered, styles.frostedInput]}
          placeholder="Email"
          placeholderTextColor="rgba(255,255,255,0.5)"
          testID="email-input"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
        />
      </View>
      <View style={{ position: 'relative', width: '80%' }}>
        <TextInput
          style={[commonStyles.inputBordered, styles.frostedInput]}
          placeholder="Password"
          placeholderTextColor="rgba(255,255,255,0.5)"
          testID="password-input"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!busy}
        />
        <Pressable
          onPress={() => setShowPassword(!showPassword)}
          disabled={busy}
          style={{ position: 'absolute', justifyContent: 'center' , right: scale(12), top: 0, bottom: 0 }}
        >
          <Ionicons
              name={showPassword ? 'eye' : 'eye-off'}
              size={24}
              color={colors.neutral}
            />
        </Pressable>

      </View>
      <ActionButton
        onPress={handleEmailSubmit}
        text={isRegisterMode ? 'Create Account' : 'Sign In'}
        testID="email-submit-button"
        loadingText={isRegisterMode ? 'Creating account...' : 'Signing in...'}
        loading={isSubmitting}
        disabled={busy}
        style={styles.emailButton}
      />

      <TouchableOpacity
        testID="toggle-auth-mode"
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
    </LandingBackground>
  );
}

const styles = StyleSheet.create({
  transparent: {
    backgroundColor: 'transparent',
  },
  titleContainer: {
    position: 'relative',
    marginBottom: moderateScale(8),
  },
  title: {
    fontSize: moderateScale(58.4),
    fontFamily: 'Megrim_400Regular',
    color: '#fff',
  },
  titleShadow1: {
    position: 'absolute',
    left: 0.8,
    top: 0,
  },
  titleShadow2: {
    position: 'absolute',
    left: 0,
    top: 0.8,
  },
  titleShadow3: {
    position: 'absolute',
    left: 0.8,
    top: 0.8,
  },
  lightText: {
    color: 'rgba(255,255,255,0.8)',
  },
  subtitleSpacing: {
    fontSize: moderateScale(17.6),
    fontWeight: 'bold',
    color: '#fff',
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
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dividerText: {
    marginHorizontal: scale(12),
    color: 'rgba(255,255,255,0.6)',
    fontSize: moderateScale(14),
  },
  frostedInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.3)',
    color: '#fff',
    fontFamily: 'PoiretOne_400Regular',
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
    color: 'rgba(255,255,255,0.8)',
    fontSize: moderateScale(14),
  },
});
