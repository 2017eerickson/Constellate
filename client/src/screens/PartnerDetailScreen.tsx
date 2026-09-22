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
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  createSpecialDate,
  getPartnerships,
  getSpecialDates,
} from '../services/partnerships';
import { Partnership, SpecialDate } from '../types';

export default function PartnerDetailScreen() {
  const { user } = useAuth();
  const route = useRoute();
  const { partnershipId } = route.params as { partnershipId: number };

  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [partnerships, dates] = await Promise.all([
        getPartnerships(),
        getSpecialDates(partnershipId),
      ]);
      const found = partnerships.find((p) => p.id === partnershipId);
      if (found) setPartnership(found);
      setSpecialDates(dates);
    } catch {
      // silent — pull to refresh
    } finally {
      setRefreshing(false);
    }
  }, [partnershipId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleRefresh() {
    setRefreshing(true);
    fetchData();
  }

  async function handleAddDate() {
    if (!title.trim() || !date.trim()) return;
    setAdding(true);
    try {
      await createSpecialDate(partnershipId, title.trim(), date.trim());
      setTitle('');
      setDate('');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to add date');
    } finally {
      setAdding(false);
    }
  }

  function getDisplayName(p: Partnership): string {
    const other =
      p.initiator.id === user?.id ? p.partner : p.initiator;
    return other.first_name;
  }

  function getDaysInOrbit(p: Partnership): number {
    const dateStr = p.anniversary || p.started_at;
    const start = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (!partnership) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={specialDates}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{getDisplayName(partnership)}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: partnership.status === 'active' ? '#4CAF50' : '#9E9E9E' },
                  ]}
                >
                  <Text style={styles.statusText}>{partnership.status}</Text>
                </View>
              </View>

              <Text style={styles.relation}>{partnership.relation}</Text>

              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {partnership.streak?.current_count ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Streak</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{partnership.stardust}</Text>
                  <Text style={styles.statLabel}>Stardust</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{getDaysInOrbit(partnership)}</Text>
                  <Text style={styles.statLabel}>Days in Orbit</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Special Dates</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.dateCard}>
            <Text style={styles.dateTitle}>{item.title}</Text>
            <Text style={styles.dateValue}>{item.date}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No special dates yet</Text>
        }
        ListFooterComponent={
          <View style={styles.addForm}>
            <Text style={styles.sectionTitle}>Add a Special Date</Text>
            <TextInput
              style={styles.input}
              placeholder="Title (e.g. First Trip)"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Date YYYY-MM-DD"
              value={date}
              onChangeText={setDate}
              keyboardType="numbers-and-punctuation"
            />
            <TouchableOpacity
              style={[styles.addButton, adding && styles.buttonDisabled]}
              onPress={handleAddDate}
              disabled={adding}
            >
              <Text style={styles.addButtonText}>
                {adding ? 'Adding...' : 'Add Date'}
              </Text>
            </TouchableOpacity>
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  dateCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  addForm: {
    marginTop: 24,
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 14,
    marginHorizontal: 20,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
