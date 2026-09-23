import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
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
import { ActionButton, Card, EmptyState, SectionHeader } from '../components';
import { scale, moderateScale } from '../styles/scale';
import { colors } from '../styles/colors';
import { commonStyles } from '../styles/common';

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
      <Card>
        <View style={[commonStyles.rowSpaceBetween, styles.pendingHeaderSpacing]}>
          <Text style={commonStyles.nameText}>{getOtherName(item)}</Text>
          <Text style={[commonStyles.relationText, styles.pendingRelationOverride]}>{item.relation}</Text>
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
              <ActionButton
                onPress={() => handleAccept(item.id)}
                text="Accept"
                style={styles.actionBtn}
              />
              <ActionButton
                variant="secondary"
                onPress={() => handleDecline(item.id)}
                text="Decline"
                style={styles.actionBtn}
              />
            </>
          ) : (
            <ActionButton
              variant="secondary"
              onPress={() => handleDecline(item.id)}
              text="Cancel"
              style={styles.actionBtn}
            />
          )}
        </View>
      </Card>
    );
  }

  return (
    <View style={commonStyles.screenList}>
      <Text style={commonStyles.listScreenTitle}>Connect</Text>

      <Card style={styles.formCard}>
        <TextInput
          style={commonStyles.input}
          placeholder="Partner code"
          value={partnerCode}
          onChangeText={setPartnerCode}
          autoCapitalize="characters"
          maxLength={8}
        />
        <TextInput
          style={commonStyles.input}
          placeholder="romantic, platonic, metamour..."
          value={relation}
          onChangeText={setRelation}
          autoCapitalize="none"
        />
        <TextInput
          style={commonStyles.input}
          placeholder="Anniversary YYYY-MM-DD (optional)"
          value={anniversary}
          onChangeText={setAnniversary}
          keyboardType="numbers-and-punctuation"
        />
        <ActionButton
          onPress={handleConnect}
          text="Connect"
          loadingText="Sending..."
          loading={connecting}
          style={styles.connectButton}
        />
      </Card>

      <SectionHeader title="Pending" />
      {fetchError && (
        <Text style={[commonStyles.errorText, styles.errorSpacing]}>Something went wrong. Pull down to refresh.</Text>
      )}

      <FlatList
        data={pending}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPending}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState message="No pending requests" />
        }
        contentContainerStyle={pending.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    marginBottom: scale(24),
  },
  connectButton: {
    marginTop: scale(4),
  },
  pendingHeaderSpacing: {
    marginBottom: scale(4),
  },
  pendingRelationOverride: {
    marginBottom: 0,
  },
  pendingCode: {
    fontSize: moderateScale(13),
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: scale(4),
  },
  pendingRole: {
    fontSize: moderateScale(13),
    color: colors.textMuted,
    marginBottom: scale(12),
  },
  pendingActions: {
    flexDirection: 'row',
    gap: scale(12),
  },
  actionBtn: {
    flex: 1,
    padding: scale(10),
  },
  emptyList: {
    flex: 1,
  },
  errorSpacing: {
    marginBottom: scale(12),
  },
});
