import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { moderateScale } from '../styles/scale';

export default function ConstellationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Constellation</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    marginBottom: moderateScale(8),
  },
  subtitle: {
    fontSize: moderateScale(16),
    color: '#999',
  },
});
