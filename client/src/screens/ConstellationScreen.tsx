import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { moderateScale } from '../styles/scale';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';

export default function ConstellationScreen() {
  return (
    <View style={commonStyles.screenCentered}>
      <Text style={[commonStyles.screenTitle, styles.titleSpacing]}>Constellation</Text>
      <Text style={[commonStyles.subtitle, { color: colors.textMuted }]}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleSpacing: {
    marginBottom: moderateScale(8),
  },
});
