import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

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
        <Text style={styles.code}>{user?.partner_code}</Text>
        <Text style={styles.hint}>Share this code to connect with a partner</Text>
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
  code: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
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
