import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  acceptPartnership,
  connectPartner,
  deletePartnership,
  getPartnerships,
} from '../services/partnerships';
import { Partnership } from '../types';

export default function ConnectScreen() {
  const { user } = useAuth();
  const [partnerCode, setPartnerCode] = useState('');
  const [relation, setRelation] = useState('');
  const [anniversary, setAnniversary] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [pending, setPending] = useState<Partnership[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      const data = await getPartnerships();
      setPending(data.filter((p) => p.status === 'pending'));
      setFetchError(false);
    } catch {
      setFetchError(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  async function handleConnect() {
    if (!partnerCode.trim()) return;
    setConnecting(true);
    try {
      await connectPartner(
        partnerCode.trim(),
        relation.trim() || undefined,
        anniversary.trim() || undefined,
      );
      setPartnerCode('');
      setRelation('');
      setAnniversary('');
      Alert.alert('Sent!', 'Partnership request sent.');
      fetchPending();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  }

  async function handleAccept(id: number) {
    try {
      await acceptPartnership(id);
      fetchPending();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to accept');
    }
  }

  async function handleDecline(id: number) {
    try {
      await deletePartnership(id);
      fetchPending();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to decline');
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    fetchPending();
  }

  function isRecipient(partnership: Partnership): boolean {
    return partnership.partner.id === user?.id;
  }

  function getOtherName(partnership: Partnership): string {
    return partnership.initiator.id === user?.id
      ? partnership.partner.first_name
      : partnership.initiator.first_name;
  }

  function renderPending({ item }: { item: Partnership }) {
    const recipient = isRecipient(item);

    return (
      <View style={styles.pendingCard}>
        <View style={styles.pendingHeader}>
          <Text style={styles.pendingName}>{getOtherName(item)}</Text>
          <Text style={styles.pendingRelation}>{item.relation}</Text>
        </View>
        <Text style={styles.pendingCode}>
          Code: {item.initiator.id === user?.id
            ? item.partner.partner_code
            : item.initiator.partner_code}
        </Text>
        <Text style={styles.pendingRole}>
          {recipient ? 'Wants to connect with you' : 'Request pending'}
        </Text>
        <View style={styles.pendingActions}>
          {recipient ? (
            <>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAccept(item.id)}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => handleDecline(item.id)}
              >
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => handleDecline(item.id)}
            >
              <Text style={styles.declineText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect</Text>

      <View style={styles.formCard}>
        <TextInput
          style={styles.input}
          placeholder="Partner code"
          value={partnerCode}
          onChangeText={setPartnerCode}
          autoCapitalize="characters"
          maxLength={8}
        />
        <TextInput
          style={styles.input}
          placeholder="romantic, platonic, metamour..."
          value={relation}
          onChangeText={setRelation}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Anniversary YYYY-MM-DD (optional)"
          value={anniversary}
          onChangeText={setAnniversary}
          keyboardType="numbers-and-punctuation"
        />
        <TouchableOpacity
          style={[styles.connectButton, connecting && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={connecting}
        >
          <Text style={styles.connectText}>
            {connecting ? 'Sending...' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Pending</Text>
      {fetchError && (
        <Text style={styles.errorText}>Something went wrong. Pull down to refresh.</Text>
      )}

      <FlatList
        data={pending}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPending}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No pending requests</Text>
        }
        contentContainerStyle={pending.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  connectButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  connectText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  pendingCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pendingName: {
    fontSize: 18,
    fontWeight: '600',
  },
  pendingRelation: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  pendingCode: {
    fontSize: 13,
    color: '#666',
    letterSpacing: 2,
    marginBottom: 4,
  },
  pendingRole: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  acceptText: {
    color: '#fff',
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  declineText: {
    color: '#333',
    fontWeight: '600',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  emptyList: {
    flex: 1,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
});
