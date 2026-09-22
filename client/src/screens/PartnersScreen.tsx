import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getPartnerships } from '../services/partnerships';
import { Partnership } from '../types';

const STATUS_COLORS: Record<string, string> = {
  active: '#4CAF50',
  paused: '#9E9E9E',
};

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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{getDisplayName(item)}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[item.status] || '#9E9E9E' },
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.relation}>{item.relation}</Text>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.streak?.current_count ?? 0}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.stardust}</Text>
            <Text style={styles.statLabel}>Stardust</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{getDaysInOrbit(item)}</Text>
            <Text style={styles.statLabel}>Days in Orbit</Text>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
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
            <View style={styles.soulmateCard}>
              <Text style={styles.soulmateName}>You</Text>
              <Text style={styles.soulmateHint}>Your personal journey</Text>
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{soulmate.streak?.current_count ?? 0}</Text>
                  <Text style={styles.statLabel}>Streak</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{soulmate.stardust}</Text>
                  <Text style={styles.statLabel}>Stardust</Text>
                </View>
              </View>
            </View>
          ) : null
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('Connect' as never)}
          >
            <Text style={styles.addButtonText}>+ Add a Partner</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active partnerships yet</Text>
          </View>
        }
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  soulmateCard: {
    backgroundColor: '#f0e6ff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  soulmateName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  soulmateHint: {
    fontSize: 12,
    color: '#7c4dff',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  relation: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 24,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  addButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
  },
});
