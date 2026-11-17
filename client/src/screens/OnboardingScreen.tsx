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
import { ActionButton, LandingBackground } from '../components';
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

    if (!/^\d{2}-\d{2}-\d{4}$/.test(birthday)) {
      Alert.alert('Invalid Date', 'Please enter your birthday as MM-DD-YYYY');
      return;
    }

    const [mm, dd, yyyy] = birthday.split('-');
    const formattedBirthday = `${yyyy}-${mm}-${dd}`;

    setIsSubmitting(true);
    try {
      await completeOnboarding(formattedBirthday, needsName ? firstName.trim() : undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <LandingBackground>
    <KeyboardAvoidingView
      style={[commonStyles.screenCentered, styles.transparent]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[commonStyles.screenTitle, styles.titleSpacing, styles.whiteText]}>
        {needsName ? 'Welcome!' : `Welcome, ${user?.first_name}!`}
      </Text>
      <Text style={[commonStyles.subtitle, styles.subtitleSpacing, styles.lightText]}>Let's get to know you</Text>

      {needsName && (
        <TextInput
          style={[commonStyles.inputBordered, styles.inputOverride, styles.frostedInput]}
          placeholder="First Name"
          placeholderTextColor="rgba(255,255,255,0.5)"
          testID="onboarding-name-input"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          editable={!isSubmitting}
        />
      )}

      <TextInput
        style={[commonStyles.inputBordered, styles.inputOverride, styles.frostedInput]}
        placeholder="MM-DD-YYYY"
        placeholderTextColor="rgba(255,255,255,0.5)"
        testID="onboarding-birthday-input"
        value={birthday}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, '');
          let formatted = digits;
          if (digits.length > 2) formatted = digits.slice(0, 2) + '-' + digits.slice(2);
          if (digits.length > 4) formatted = digits.slice(0, 2) + '-' + digits.slice(2, 4) + '-' + digits.slice(4, 8);
          setBirthday(formatted);
        }}
        keyboardType="number-pad"
        maxLength={10}
        editable={!isSubmitting}
      />

      <ActionButton
        variant="google"
        onPress={handleSubmit}
        text="Continue"
        testID="onboarding-submit-button"
        loadingText="Saving..."
        loading={isSubmitting}
        style={styles.button}
      />
    </KeyboardAvoidingView>
    </LandingBackground>
  );
}

const styles = StyleSheet.create({
  transparent: {
    backgroundColor: 'transparent',
  },
  whiteText: {
    color: '#fff',
  },
  lightText: {
    color: 'rgba(255,255,255,0.8)',
  },
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
  frostedInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.3)',
    color: '#fff',
  },
  button: {
    paddingHorizontal: scale(32),
    paddingVertical: scale(14),
    marginTop: scale(8),
    padding: undefined,
  },
});
