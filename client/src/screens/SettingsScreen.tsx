import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { deactivateAccount } from '../services/auth';
import { Card, ActionButton, SectionHeader } from '../components';
import { scale, moderateScale, verticalScale } from '../styles/scale';
import { colors } from '../styles/colors';

export default function SettingsScreen() {
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

  function handleDelete() {
    Alert.alert(
      'Delete Account',
      'Are you sure? This will deactivate your account and sign you out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateAccount();
              await signOut();
            } catch {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader title="User Details" />
      <Card>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.first_name}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Partner Code</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeValue}>{user?.partner_code}</Text>
            <ActionButton
              variant="secondary"
              onPress={handleCopy}
              text={copied ? 'Copied!' : 'Copy'}
              style={styles.copyButton}
            />
          </View>
        </View>
      </Card>

      <SectionHeader title="Account" />
      <Card>
        <ActionButton
          variant="secondary"
          onPress={handleDelete}
          text="Delete Account"
          style={styles.deleteButton}
        />
      </Card>

      <SectionHeader title="App Info" />
      <Card>
        <View style={styles.row}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Terms of Service</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Privacy Policy</Text>
        </View>
      </Card>

      <ActionButton
        variant="secondary"
        onPress={handleSignOut}
        text="Sign Out"
        testID="sign-out-button"
        style={styles.signOutButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(40),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(10),
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  label: {
    fontSize: moderateScale(15),
    color: colors.textSecondary,
  },
  value: {
    fontSize: moderateScale(15),
    fontWeight: '500',
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeValue: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    letterSpacing: 2,
    color: colors.textPrimary,
    marginRight: scale(8),
  },
  copyButton: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    padding: undefined,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.error,
  },
  signOutButton: {
    marginHorizontal: scale(20),
    marginTop: scale(20),
    backgroundColor: 'transparent',
  },
});
