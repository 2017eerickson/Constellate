import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { moderateScale } from '../styles/scale';
import { colors } from '../styles/colors';

interface LoadingStateProps {
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
}

export default function LoadingState({ loading, error, children }: LoadingStateProps) {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.error,
    fontSize: moderateScale(16),
  },
});
