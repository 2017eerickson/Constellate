import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { scale, moderateScale } from '../styles/scale';

const STATUS_COLORS: Record<string, string> = {
  active: '#4CAF50',
  paused: '#9E9E9E',
  ended: '#9E9E9E',
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
        { backgroundColor: STATUS_COLORS[status] || '#9E9E9E' },
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
    color: '#fff',
    fontSize: moderateScale(12),
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
