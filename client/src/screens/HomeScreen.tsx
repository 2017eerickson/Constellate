import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { AppText as Text, Card, ActionButton } from '../components';
import { getPartnerships } from '../services/partnerships';
import { scale, moderateScale, verticalScale } from '../styles/scale';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';

type MainStackParamList = {
  Tabs: undefined;
  Settings: undefined;
  Connect: undefined;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  useFocusEffect(
    useCallback(() => {
      getPartnerships()
        .then((data) => {
          const incoming = data.some(
            (p) => p.status === 'pending' && p.partner.id === user?.id,
          );
          setHasPending(incoming);
        })
        .catch(() => {});
    }, [user?.id]),
  );

  async function handleCopy() {
    if (user?.partner_code) {
      await Clipboard.setStringAsync(user.partner_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: scale(20) }}>
      <LinearGradient
        colors={['#0a0a1a', '#1a1030', '#2a1545']}
        style={StyleSheet.absoluteFill}
      />
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate('Settings')}
      >
        <MaterialCommunityIcons name="cog-outline" size={scale(26)} color={colors.white} />
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

      <View style={styles.addButtonWrapper}>
        <ActionButton
          onPress={() => navigation.navigate('Connect')}
          text="+ Add a Partner"
          testID="add-partner-button"
          style={styles.addButton}
        />
        {hasPending && <View style={styles.activityDot} />}
      </View>
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
    color: colors.white,
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
  addButtonWrapper: {
    width: '80%',
    position: 'relative',
  },
  addButton: {
    borderRadius: scale(12),
    padding: scale(16),
    borderWidth: 1,
    borderColor: colors.white,
  },
  activityDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 10,
  },
  copyButton: {
    marginLeft: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(6),
    padding: undefined,
  },
});
