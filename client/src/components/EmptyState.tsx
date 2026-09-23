import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { scale, moderateScale } from '../styles/scale';
import { colors } from '../styles/colors';

interface EmptyStateProps {
  message: string;
  style?: StyleProp<ViewStyle>;
}

export default function EmptyState({ message, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: scale(20),
  },
  text: {
    color: colors.textMuted,
    fontSize: moderateScale(14),
    textAlign: 'center',
  },
});
