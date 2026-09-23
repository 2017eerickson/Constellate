import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { scale, moderateScale } from '../styles/scale';
import { colors } from '../styles/colors';

const STATUS_COLORS: Record<string, string> = {
  active: colors.success,
  paused: colors.neutral,
  ended: colors.neutral,
};

interface StatusBadgeProps {
  status: string;
  style?: StyleProp<ViewStyle>;
}

export default function StatusBadge({ status, style }: StatusBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: STATUS_COLORS[status] || colors.neutral },
        style,
      ]}
    >
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  text: {
    color: colors.white,
    fontSize: moderateScale(12),
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
