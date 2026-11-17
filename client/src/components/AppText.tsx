import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { APP_FONT } from '../styles/fonts';

export default function AppText({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.default, style]} />;
}

const styles = StyleSheet.create({
  default: {
    fontFamily: APP_FONT,
  },
});
