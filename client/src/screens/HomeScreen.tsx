import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../context/AuthContext';
import { Card, ActionButton } from '../components';
import { scale, moderateScale } from '../styles/scale';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (user?.partner_code) {
      await Clipboard.setStringAsync(user.partner_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      Alert.alert('Error', 'Failed to sign out');
    }
  }

  return (
    <View style={commonStyles.screenCentered}>
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

      <ActionButton
        variant="secondary"
        onPress={handleSignOut}
        text="Sign Out"
        style={styles.signOutButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  signOutButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
    padding: undefined,
  },
});
