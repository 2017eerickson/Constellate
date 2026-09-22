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
  deleteSpecialDate,
  getPartnerships,
  getSpecialDates,
  updatePartnership,
  updateSpecialDate,
} from '../services/partnerships';
import { Partnership, SpecialDate } from '../types';

type EditingMode = 'none' | 'partnership' | number;


export default function PartnerDetailScreen() {
  const { user } = useAuth();
  const route = useRoute();
  const { partnershipId } = route.params as { partnershipId: number };

  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Add special date form
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit mode — 'none', 'partnership', or a special date ID
  const [editingMode, setEditingMode] = useState<EditingMode>('none');

  // Edit partnership fields
  const [editRelation, setEditRelation] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // Edit special date fields
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');

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

  function cancelEditing() {
    setEditingMode('none');
  }

  // --- Partnership edit ---

  function startEditPartnership() {
    if (!partnership) return;
    setEditRelation(partnership.relation);
    setEditStatus(partnership.status);
    setEditingMode('partnership');
  }

  async function handleSavePartnership() {
    if (!partnership) return;
    const fields: { relation?: string; status?: string } = {};
    if (editRelation.trim() !== partnership.relation) {
      fields.relation = editRelation.trim();
    }
    if (editStatus !== partnership.status) {
      fields.status = editStatus;
    }
    if (Object.keys(fields).length === 0) {
      cancelEditing();
      return;
    }
    try {
      await updatePartnership(partnershipId, fields);
      setEditingMode('none');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to update');
    }
  }

  // --- Special date edit ---

  function startEditDate(sd: SpecialDate) {
    setEditTitle(sd.title);
    setEditDate(sd.date);
    setEditingMode(sd.id);
  }

  async function handleSaveDate(dateId: number) {
    try {
      await updateSpecialDate(partnershipId, dateId, {
        title: editTitle.trim(),
        date: editDate.trim(),
      });
      setEditingMode('none');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to update');
    }
  }

  async function handleDeleteDate(dateId: number) {
    Alert.alert('Delete', 'Are you sure you want to delete this date?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSpecialDate(partnershipId, dateId);
            setEditingMode('none');
            fetchData();
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to delete');
          }
        },
      },
    ]);
  }

  // --- Add special date ---

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

  // --- Helpers ---

  function getDisplayName(p: Partnership): string {
    const other = p.initiator.id === user?.id ? p.partner : p.initiator;
    return other.first_name;
  }

  function getDaysInOrbit(p: Partnership): number {
    const dateStr = p.anniversary || p.started_at;
    const start = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  const isEditing = editingMode !== 'none';

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

              {editingMode === 'partnership' ? (
                <>
                  <TextInput
                    style={styles.editInput}
                    value={editRelation}
                    onChangeText={setEditRelation}
                    placeholder="Relation"
                  />
                  <View style={styles.statusRow}>
                    {['active', 'paused', 'ended'].map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.statusOption,
                          editStatus === s && styles.statusOptionSelected,
                        ]}
                        onPress={() => setEditStatus(s)}
                      >
                        <Text
                          style={[
                            styles.statusOptionText,
                            editStatus === s && styles.statusOptionTextSelected,
                          ]}
                        >
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSavePartnership}>
                      <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
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
                  <TouchableOpacity
                    style={[styles.editButton, isEditing && styles.buttonDisabled]}
                    onPress={startEditPartnership}
                    disabled={isEditing}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <Text style={styles.sectionTitle}>Special Dates</Text>
          </>
        }
        renderItem={({ item }) => {
          if (editingMode === item.id) {
            return (
              <View style={styles.dateCard}>
                <TextInput
                  style={styles.editInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Title"
                />
                <TextInput
                  style={styles.editInput}
                  value={editDate}
                  onChangeText={setEditDate}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => handleSaveDate(item.id)}
                  >
                    <Text style={styles.saveText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteDate(item.id)}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <View style={styles.dateCard}>
              <View style={styles.dateRow}>
                <Text style={styles.dateTitle}>{item.title}</Text>
                <Text style={styles.dateValue}>{item.date}</Text>
              </View>
              <TouchableOpacity
                style={[styles.editButton, isEditing && styles.buttonDisabled]}
                onPress={() => startEditDate(item)}
                disabled={isEditing}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          );
        }}
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
    marginBottom: 12,
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
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  editInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusOption: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
  },
  statusOptionSelected: {
    backgroundColor: '#000',
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  statusOptionTextSelected: {
    color: '#fff',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: '#333',
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#F44336',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
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