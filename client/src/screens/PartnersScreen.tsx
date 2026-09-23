import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getPartnerships } from '../services/partnerships';
import { Partnership } from '../types';
import {
  ActionButton,
  Card,
  EmptyState,
  LoadingState,
  StatDisplay,
  StatusBadge,
} from '../components';
import { scale, moderateScale, verticalScale } from '../styles/scale';

export default function PartnersScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPartnerships = useCallback(async () => {
    try {
      setError(null);
      const data = await getPartnerships();
      setPartnerships(data);
    } catch {
      setError('Failed to load partnerships');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPartnerships();
  }, [fetchPartnerships]);

  function handleRefresh() {
    setRefreshing(true);
    fetchPartnerships();
  }

  const soulmate = partnerships.find((p) => p.relation === 'soulmate');
  const active = partnerships.filter(
    (p) => p.relation !== 'soulmate' && (p.status === 'active' || p.status === 'paused'),
  );

  function getDisplayName(partnership: Partnership): string {
    const other =
      partnership.initiator.id === user?.id
        ? partnership.partner
        : partnership.initiator;
    return other.first_name;
  }

  function getDaysInOrbit(partnership: Partnership): number {
    const dateStr = partnership.anniversary || partnership.started_at;
    const start = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  function renderPartnership({ item }: { item: Partnership }) {
    return (
      <Card onPress={() => navigation.navigate('PartnerDetail' as never, { partnershipId: item.id } as never)}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{getDisplayName(item)}</Text>
          <StatusBadge status={item.status} />
        </View>

        <Text style={styles.relation}>{item.relation}</Text>

        <StatDisplay stats={[
          { value: item.streak?.current_count ?? 0, label: 'Streak' },
          { value: item.stardust, label: 'Stardust' },
          { value: getDaysInOrbit(item), label: 'Days in Orbit' },
        ]} />
      </Card>
    );
  }

  return (
    <LoadingState loading={loading} error={error}>
      <View style={styles.container}>
        <Text style={styles.title}>Partners</Text>

        <FlatList
          data={active}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPartnership}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            soulmate ? (
              <Card variant="soulmate">
                <Text style={styles.soulmateName}>You</Text>
                <Text style={styles.soulmateHint}>Your personal journey</Text>
                <StatDisplay stats={[
                  { value: soulmate.streak?.current_count ?? 0, label: 'Streak' },
                  { value: soulmate.stardust, label: 'Stardust' },
                ]} />
              </Card>
            ) : null
          }
          ListFooterComponent={
            <ActionButton
              onPress={() => navigation.navigate('Connect' as never)}
              text="+ Add a Partner"
              style={styles.addButton}
            />
          }
          ListEmptyComponent={
            <EmptyState message="No active partnerships yet" />
          }
        />
      </View>
    </LoadingState>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: verticalScale(60),
  },
  title: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    paddingHorizontal: scale(20),
    marginBottom: scale(20),
  },
  soulmateName: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    marginBottom: scale(2),
  },
  soulmateHint: {
    fontSize: moderateScale(12),
    color: '#7c4dff',
    fontStyle: 'italic',
    marginBottom: scale(12),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  name: {
    fontSize: moderateScale(18),
    fontWeight: '600',
  },
  relation: {
    fontSize: moderateScale(14),
    color: '#666',
    textTransform: 'capitalize',
    marginBottom: scale(12),
  },
  addButton: {
    borderRadius: scale(12),
    padding: scale(16),
    marginHorizontal: scale(20),
    marginTop: scale(8),
    marginBottom: scale(20),
  },
});
