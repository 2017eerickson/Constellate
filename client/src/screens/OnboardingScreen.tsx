import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ActionButton } from '../components';
import { scale, moderateScale } from '../styles/scale';
import { commonStyles } from '../styles/common';

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
      style={commonStyles.screenCentered}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[commonStyles.screenTitle, styles.titleSpacing]}>
        {needsName ? 'Welcome!' : `Welcome, ${user?.first_name}!`}
      </Text>
      <Text style={[commonStyles.subtitle, styles.subtitleSpacing]}>Let's get to know you</Text>

      {needsName && (
        <TextInput
          style={[commonStyles.inputBordered, styles.inputOverride]}
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          editable={!isSubmitting}
        />
      )}

      <TextInput
        style={[commonStyles.inputBordered, styles.inputOverride]}
        placeholder="YYYY-MM-DD"
        value={birthday}
        onChangeText={setBirthday}
        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
        maxLength={10}
        editable={!isSubmitting}
      />

      <ActionButton
        variant="google"
        onPress={handleSubmit}
        text="Continue"
        loadingText="Saving..."
        loading={isSubmitting}
        style={styles.button}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  titleSpacing: {
    marginBottom: moderateScale(8),
  },
  subtitleSpacing: {
    marginBottom: scale(30),
  },
  inputOverride: {
    fontSize: moderateScale(18),
    textAlign: 'center',
    marginBottom: scale(16),
  },
  button: {
    paddingHorizontal: scale(32),
    paddingVertical: scale(14),
    marginTop: scale(8),
    padding: undefined,
  },
});
