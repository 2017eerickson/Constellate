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
import DropDownPicker from 'react-native-dropdown-picker';
import { MaterialIcons } from '@expo/vector-icons';
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
import {
  ActionButton,
  Card,
  EmptyState,
  LoadingState,
  SectionHeader,
  StatDisplay,
  StatusBadge,
} from '../components';
import { scale, moderateScale } from '../styles/scale';

type EditingMode = 'none' | 'partnership' | 'dates';

interface DateEdit {
  id: number;
  title: string;
  date: string;
}

export default function PartnerDetailScreen() {
  const { user } = useAuth();
  const route = useRoute();
  const { partnershipId } = route.params as { partnershipId: number };

  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // Add special date form
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit mode
  const [editingMode, setEditingMode] = useState<EditingMode>('none');

  // Edit partnership fields
  const [editRelation, setEditRelation] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusItems, setStatusItems] = useState([
    { label: 'Active', value: 'active' },
    { label: 'Paused', value: 'paused' },
    { label: 'Ended', value: 'ended' },
  ]);

  // Edit special dates fields (all at once)
  const [dateEdits, setDateEdits] = useState<DateEdit[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [partnerships, dates] = await Promise.all([
        getPartnerships(),
        getSpecialDates(partnershipId),
      ]);
      const found = partnerships.find((p) => p.id === partnershipId);
      if (found) setPartnership(found);
      setSpecialDates(dates);
      setFetchError(false);
    } catch {
      setFetchError(true);
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

  const isEditing = editingMode !== 'none';

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
    if (editRelation.trim() && editRelation.trim() !== partnership.relation) {
      fields.relation = editRelation.trim();
    }
    if (editStatus && editStatus !== partnership.status) {
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

  // --- Special dates edit ---

  function startEditDates() {
    setDateEdits(
      specialDates.map((sd) => ({ id: sd.id, title: sd.title, date: sd.date })),
    );
    setEditingMode('dates');
  }

  function updateDateEdit(id: number, field: 'title' | 'date', value: string) {
    setDateEdits((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    );
  }

  async function handleSaveDates() {
    try {
      const promises = dateEdits.map((edit) => {
        const original = specialDates.find((sd) => sd.id === edit.id);
        if (!original) return null;
        const fields: { title?: string; date?: string } = {};
        if (edit.title.trim() !== original.title) fields.title = edit.title.trim();
        if (edit.date.trim() !== original.date) fields.date = edit.date.trim();
        if (Object.keys(fields).length === 0) return null;
        return updateSpecialDate(partnershipId, edit.id, fields);
      });
      await Promise.all(promises.filter(Boolean));
      setEditingMode('none');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to save');
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
            setDateEdits((prev) => prev.filter((d) => d.id !== dateId));
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

  if (!partnership) {
    return (
      <LoadingState
        loading={!partnership}
        error={fetchError ? 'Something went wrong. Pull down to refresh.' : null}
      >
        <></>
      </LoadingState>
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
              {/* Partnership card */}
              <Card style={styles.topCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.name}>{getDisplayName(partnership)}</Text>
                  {editingMode === 'partnership' ? (
                    <View style={styles.headerActions}>
                      <TouchableOpacity
                        style={styles.cancelIcon}
                        onPress={cancelEditing}
                      >
                        <MaterialIcons name="close" size={scale(20)} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.saveIcon}
                        onPress={handleSavePartnership}
                      >
                        <MaterialIcons name="save" size={scale(20)} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={startEditPartnership}
                      disabled={isEditing}
                      style={isEditing ? styles.iconDisabled : undefined}
                    >
                      <MaterialIcons name="edit" size={scale(22)} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>

                {editingMode === 'partnership' ? (
                  <>
                    <TextInput
                      style={styles.editInput}
                      value={editRelation}
                      onChangeText={setEditRelation}
                      placeholder={partnership.relation}
                    />
                    <DropDownPicker
                      open={statusOpen}
                      value={editStatus}
                      items={statusItems}
                      setOpen={setStatusOpen}
                      setValue={setEditStatus}
                      setItems={setStatusItems}
                      style={styles.dropdown}
                      dropDownContainerStyle={styles.dropdownContainer}
                      listMode="SCROLLVIEW"
                    />
                  </>
                ) : (
                  <Text style={styles.relation}>{partnership.relation}</Text>
                )}

                <View style={styles.bottomRow}>
                  <StatDisplay
                    stats={[
                      { value: partnership.streak?.current_count ?? 0, label: 'Streak' },
                      { value: partnership.stardust, label: 'Stardust' },
                      { value: getDaysInOrbit(partnership), label: 'Days in Orbit' },
                    ]}
                    style={{ gap: scale(20) }}
                  />
                  {editingMode !== 'partnership' && (
                    <StatusBadge
                      status={partnership.status}
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </View>
              </Card>

              {/* Special Dates header */}
              {editingMode === 'dates' ? (
                <SectionHeader title="Special Dates" />
              ) : (
                <SectionHeader
                  title="Special Dates"
                  onEdit={startEditDates}
                  editDisabled={isEditing}
                />
              )}
            </>
          }
          renderItem={({ item }) => {
            if (editingMode === 'dates') {
              const edit = dateEdits.find((d) => d.id === item.id);
              if (!edit) return null;
              return (
                <Card style={styles.dateCard}>
                  <View style={styles.dateEditRow}>
                    <TextInput
                      style={styles.dateEditInput}
                      value={edit.title}
                      onChangeText={(v) => updateDateEdit(item.id, 'title', v)}
                      placeholder={item.title}
                    />
                    <TextInput
                      style={styles.dateEditInputSmall}
                      value={edit.date}
                      onChangeText={(v) => updateDateEdit(item.id, 'date', v)}
                      placeholder={item.date}
                      keyboardType="numbers-and-punctuation"
                    />
                    <TouchableOpacity onPress={() => handleDeleteDate(item.id)}>
                      <MaterialIcons name="delete" size={scale(22)} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            }

            return (
              <Card style={styles.dateCard}>
                <View style={styles.dateRow}>
                  <Text style={styles.dateTitle}>{item.title}</Text>
                  <Text style={styles.dateValue}>{item.date}</Text>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <EmptyState message="No special dates yet" />
          }
          ListFooterComponent={
            <>
              {editingMode === 'dates' && (
                <View style={styles.dateActions}>
                  <TouchableOpacity style={styles.cancelIcon} onPress={cancelEditing}>
                    <MaterialIcons name="close" size={scale(20)} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveIcon} onPress={handleSaveDates}>
                    <MaterialIcons name="save" size={scale(20)} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.addForm}>
                <SectionHeader title="Add a Special Date" style={{ paddingHorizontal: 0 }} />
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
                <ActionButton
                  onPress={handleAddDate}
                  text="Add Date"
                  loadingText="Adding..."
                  loading={adding}
                  style={styles.addButton}
                />
              </View>
            </>
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
  topCard: {
    marginTop: scale(20),
    marginBottom: scale(24),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  headerActions: {
    flexDirection: 'row',
    gap: scale(8),
  },
  cancelIcon: {
    backgroundColor: '#e0e0e0',
    borderRadius: scale(6),
    padding: scale(6),
  },
  saveIcon: {
    backgroundColor: '#000',
    borderRadius: scale(6),
    padding: scale(6),
  },
  iconDisabled: {
    opacity: 0.3,
  },
  name: {
    fontSize: moderateScale(18),
    fontWeight: '600',
  },
  editInput: {
    backgroundColor: '#fff',
    borderRadius: scale(8),
    padding: scale(10),
    fontSize: moderateScale(15),
    marginBottom: scale(8),
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: scale(8),
    borderColor: '#e0e0e0',
    marginBottom: scale(8),
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderColor: '#e0e0e0',
    borderRadius: scale(8),
  },
  relation: {
    fontSize: moderateScale(14),
    color: '#666',
    textTransform: 'capitalize',
    marginBottom: scale(12),
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateCard: {
    borderRadius: scale(10),
    padding: scale(14),
    marginBottom: scale(8),
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  dateEditInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: scale(6),
    padding: scale(8),
    fontSize: moderateScale(14),
  },
  dateEditInputSmall: {
    width: scale(110),
    backgroundColor: '#fff',
    borderRadius: scale(6),
    padding: scale(8),
    fontSize: moderateScale(14),
  },
  dateTitle: {
    fontSize: moderateScale(16),
    fontWeight: '500',
  },
  dateValue: {
    fontSize: moderateScale(14),
    color: '#666',
  },
  dateActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: scale(8),
    paddingHorizontal: scale(20),
    marginTop: scale(8),
    marginBottom: scale(8),
  },
  addForm: {
    marginTop: scale(24),
    marginBottom: scale(40),
    paddingHorizontal: scale(20),
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: scale(8),
    padding: scale(12),
    fontSize: moderateScale(16),
    marginBottom: scale(10),
  },
  addButton: {
    marginTop: scale(4),
  },
});
