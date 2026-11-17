import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import AppText from './AppText';
import { scale, moderateScale } from '../styles/scale';
import { colors } from '../styles/colors';

interface ActionButtonProps {
  onPress: () => void;
  text: string;
  loadingText?: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'google';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function ActionButton({
  onPress,
  text,
  loadingText,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  testID,
}: ActionButtonProps) {
  return (
    <TouchableOpacity
      testID={testID}
      style={[
        styles.button,
        variant === 'secondary' && styles.secondary,
        variant === 'google' && styles.google,
        (loading || disabled) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      <AppText
        style={[
          styles.text,
          variant === 'secondary' && styles.secondaryText,
        ]}
      >
        {loading && loadingText ? loadingText : text}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: scale(8),
    padding: scale(14),
    alignItems: 'center',
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  google: {
    backgroundColor: colors.googleBlue,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.white,
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  secondaryText: {
    color: colors.textPrimary,
  },
});
