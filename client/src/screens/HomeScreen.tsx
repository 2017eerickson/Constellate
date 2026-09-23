import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../context/AuthContext';

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
    <View style={styles.container}>
      <Text style={styles.greeting}>Hey, {user?.first_name}!</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Your Partner Code</Text>
        <View style={styles.codeRow}>
          <Text style={styles.code}>{user?.partner_code}</Text>
        </View>
        <Text style={styles.hint}>Share this code to connect with a partner</Text>
        <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
            <Text style={styles.copyText}>{copied ? 'Copied!' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  code: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  copyButton: {
    marginLeft: 12,
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  hint: {
    fontSize: 12,
    paddingBottom: 8,
    color: '#999',
  },
  signOutButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  signOutText: {
    color: '#999',
    fontSize: 14,
  },
});
