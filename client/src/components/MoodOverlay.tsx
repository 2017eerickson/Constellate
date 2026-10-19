import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../styles/colors';
import { moderateScale } from '../styles/scale';

const { width: SCREEN_W } = Dimensions.get('window');

export const MOOD_COLORS: Record<string, string> = {
  happy: '#FFD700',
  sad: '#4A90D9',
  loved: '#FF6B8A',
  anxious: '#C4A6E8',
  upset: '#E85D4A',
  stressed: '#FF8C42',
  calm: '#7EC8B8',
  excited: '#FFE066',
  tired: '#8B8FAE',
  grateful: '#A8D88E',
  focused: '#5DADE2',
  okay: '#B8C4CE',
};

const MOODS = Object.keys(MOOD_COLORS);

const GRID_COLUMNS = 3;
const GRID_GAP = moderateScale(12);
const GRID_PADDING = moderateScale(24);
const ITEM_SIZE =
  (SCREEN_W - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

interface MoodOverlayProps {
  visible: boolean;
  currentMood: string;
  onSelect: (mood: string) => void;
  onClose: () => void;
}

export default function MoodOverlay({
  visible,
  currentMood,
  onSelect,
  onClose,
}: MoodOverlayProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <MaterialCommunityIcons
              name="close"
              size={moderateScale(24)}
              color={colors.white}
            />
          </Pressable>

          <Text style={styles.title}>How are you feeling?</Text>

          <View style={styles.grid}>
            {MOODS.map((mood) => {
              const isSelected = mood === currentMood;
              return (
                <Pressable
                  key={mood}
                  style={[
                    styles.moodItem,
                    { backgroundColor: MOOD_COLORS[mood] },
                    isSelected && styles.moodSelected,
                  ]}
                  onPress={() => onSelect(mood)}
                >
                  <Text
                    style={[
                      styles.moodLabel,
                      isSelected && styles.moodLabelSelected,
                    ]}
                  >
                    {mood}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 26, 0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.skyDark,
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingHorizontal: GRID_PADDING,
    paddingBottom: moderateScale(40),
    paddingTop: moderateScale(16),
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: moderateScale(8),
  },
  title: {
    color: colors.white,
    fontSize: moderateScale(20),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: moderateScale(20),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  moodItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 0.6,
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodSelected: {
    borderWidth: 3,
    borderColor: colors.white,
  },
  moodLabel: {
    color: 'rgba(0, 0, 0, 0.7)',
    fontSize: moderateScale(13),
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  moodLabelSelected: {
    color: '#000',
    fontWeight: '800',
  },
});
