import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { scale, moderateScale } from '../styles/scale';
import { colors } from '../styles/colors';

interface Stat {
  value: string | number;
  label: string;
}

interface StatDisplayProps {
  stats: Stat[];
  style?: StyleProp<ViewStyle>;
}

export default function StatDisplay({ stats, style }: StatDisplayProps) {
  return (
    <View style={[styles.row, style]}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.stat}>
          <Text style={styles.value}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: scale(24),
  },
  stat: {
    alignItems: 'center',
  },
  value: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
  },
  label: {
    fontSize: moderateScale(12),
    color: colors.textMuted,
  },
});
