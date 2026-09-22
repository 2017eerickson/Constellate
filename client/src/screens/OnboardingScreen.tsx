import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function OnboardingScreen() {
  const { user, completeOnboarding } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsName = !user?.first_name;

  async function handleSubmit() {
    if (needsName && !firstName.trim()) {
      Alert.alert('Missing Name', 'Please enter your first name');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      Alert.alert('Invalid Date', 'Please enter your birthday as YYYY-MM-DD');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeOnboarding(birthday, needsName ? firstName.trim() : undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>
        {needsName ? 'Welcome!' : `Welcome, ${user?.first_name}!`}
      </Text>
      <Text style={styles.subtitle}>Let's get to know you</Text>

      {needsName && (
        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          editable={!isSubmitting}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={birthday}
        onChangeText={setBirthday}
        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
        maxLength={10}
        editable={!isSubmitting}
      />

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? 'Saving...' : 'Continue'}
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  input: {
    width: '80%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
