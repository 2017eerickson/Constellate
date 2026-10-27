import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { Card, ActionButton } from '../components';
import { scale, moderateScale, verticalScale } from '../styles/scale';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';

type MainStackParamList = {
  Tabs: undefined;
  Settings: undefined;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  async function handleCopy() {
    if (user?.partner_code) {
      await Clipboard.setStringAsync(user.partner_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <View style={commonStyles.screenCentered}>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate('Settings')}
      >
        <MaterialCommunityIcons name="cog-outline" size={scale(26)} color={colors.textSecondary} />
      </TouchableOpacity>

      <Text style={styles.greeting}>Hey, {user?.first_name}!</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Your Partner Code</Text>
        <View style={styles.codeRow}>
          <Text style={styles.code}>{user?.partner_code}</Text>
        </View>
        <Text style={styles.hint}>Share this code to connect with a partner</Text>
        <ActionButton
          variant="secondary"
          onPress={handleCopy}
          text={copied ? 'Copied!' : 'Copy'}
          style={styles.copyButton}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  settingsButton: {
    position: 'absolute',
    top: verticalScale(50),
    right: scale(20),
    zIndex: 1,
  },
  greeting: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    marginBottom: scale(40),
  },
  card: {
    padding: scale(24),
    alignItems: 'center',
    width: '80%',
    marginBottom: scale(40),
  },
  label: {
    fontSize: moderateScale(14),
    color: colors.textSecondary,
    marginBottom: scale(8),
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  code: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  hint: {
    fontSize: moderateScale(12),
    paddingBottom: scale(8),
    color: colors.textMuted,
  },
  copyButton: {
    marginLeft: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(6),
    padding: undefined,
  },
});
