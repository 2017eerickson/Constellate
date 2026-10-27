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

const GRID_COLUMNS = 3;
const GRID_GAP = moderateScale(12);
const GRID_PADDING = moderateScale(24);
const ITEM_SIZE =
  (SCREEN_W - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

export interface GridItem {
  key: string;
  color: string;
}

interface GridPickerOverlayProps {
  visible: boolean;
  title: string;
  items: GridItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onClose: () => void;
  children?: React.ReactNode;
}

export default function GridPickerOverlay({
  visible,
  title,
  items,
  selectedKey,
  onSelect,
  onClose,
  children,
}: GridPickerOverlayProps) {
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

          <Text style={styles.title}>{title}</Text>

          <View style={styles.grid}>
            {items.map(({ key, color }) => {
              const isSelected = key === selectedKey;
              return (
                <Pressable
                  key={key}
                  style={[
                    styles.item,
                    { backgroundColor: color },
                    isSelected && styles.itemSelected,
                  ]}
                  onPress={() => onSelect(key)}
                >
                  <Text
                    style={[
                      styles.itemLabel,
                      isSelected && styles.itemLabelSelected,
                    ]}
                  >
                    {key}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {children}
        </View>
      </View>
    </Modal>
  );
}

export const GRID_ITEM_SIZE = ITEM_SIZE;

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
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 0.6,
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSelected: {
    borderWidth: 3,
    borderColor: colors.white,
  },
  itemLabel: {
    color: 'rgba(0, 0, 0, 0.7)',
    fontSize: moderateScale(13),
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  itemLabelSelected: {
    color: '#000',
    fontWeight: '800',
  },
});
