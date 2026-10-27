import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle, StyleProp } from 'react-native';
import { scale } from '../styles/scale';
import { colors } from '../styles/colors';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'soulmate';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function Card({ children, variant = 'default', onPress, style }: CardProps) {
  const cardStyle = [
    styles.card,
    variant === 'soulmate' && styles.soulmate,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: scale(12),
    padding: scale(16),
    marginHorizontal: scale(20),
    marginBottom: scale(12),
  },
  soulmate: {
    backgroundColor: colors.soulmateBg,
  },
});
