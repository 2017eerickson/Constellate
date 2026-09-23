import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { scale, moderateScale } from '../styles/scale';

interface ActionButtonProps {
  onPress: () => void;
  text: string;
  loadingText?: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'google';
  style?: StyleProp<ViewStyle>;
}

export default function ActionButton({
  onPress,
  text,
  loadingText,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}: ActionButtonProps) {
  return (
    <TouchableOpacity
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
      <Text
        style={[
          styles.text,
          variant === 'secondary' && styles.secondaryText,
        ]}
      >
        {loading && loadingText ? loadingText : text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#000',
    borderRadius: scale(8),
    padding: scale(14),
    alignItems: 'center',
  },
  secondary: {
    backgroundColor: '#e0e0e0',
  },
  google: {
    backgroundColor: '#4285F4',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  secondaryText: {
    color: '#333',
  },
});
