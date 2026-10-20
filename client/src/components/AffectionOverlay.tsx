import React, { useEffect, useRef, useState } from 'react';
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
import type { AffectionType } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');

const AFFECTION_COLORS: Record<AffectionType, string> = {
  kiss: '#FF6B8A',
  hug: '#FFB74D',
  gratitude: '#A8D88E',
  poke: '#5DADE2',
  bite: '#E85D4A',
  tease: '#C4A6E8',
};

const AFFECTION_TYPES = Object.keys(AFFECTION_COLORS) as AffectionType[];

const GRID_COLUMNS = 3;
const GRID_GAP = moderateScale(12);
const GRID_PADDING = moderateScale(24);
const ITEM_SIZE =
  (SCREEN_W - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

interface AffectionOverlayProps {
  visible: boolean;
  cooldownSeconds: number;
  onSend: (type: AffectionType) => void;
  onClose: () => void;
}

function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function AffectionOverlay({
  visible,
  cooldownSeconds,
  onSend,
  onClose,
}: AffectionOverlayProps) {
  const [selected, setSelected] = useState<AffectionType | null>(null);
  const [remaining, setRemaining] = useState(cooldownSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onCooldown = remaining > 0;

  // Sync remaining when cooldownSeconds changes (e.g. after sending)
  useEffect(() => {
    setRemaining(cooldownSeconds);
  }, [cooldownSeconds]);

  // Live countdown tick
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (visible && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, remaining > 0]);

  // Reset selection when overlay opens
  useEffect(() => {
    if (visible) setSelected(null);
  }, [visible]);

  const handleSend = () => {
    if (selected) onSend(selected);
  };

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

          {onCooldown ? (
            <View style={styles.cooldownContainer}>
              <Text style={styles.cooldownTimer}>
                {formatCountdown(remaining)}
              </Text>
              <Text style={styles.cooldownMessage}>
                come back soon to send more affection
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Send affection</Text>

              <View style={styles.grid}>
                {AFFECTION_TYPES.map((type) => {
                  const isSelected = type === selected;
                  return (
                    <Pressable
                      key={type}
                      style={[
                        styles.item,
                        { backgroundColor: AFFECTION_COLORS[type] },
                        isSelected && styles.itemSelected,
                      ]}
                      onPress={() => setSelected(type)}
                    >
                      <Text
                        style={[
                          styles.itemLabel,
                          isSelected && styles.itemLabelSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={[styles.sendBtn, !selected && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!selected}
              >
                <Text style={styles.sendBtnText}>Send</Text>
              </Pressable>
            </>
          )}
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
  sendBtn: {
    marginTop: moderateScale(20),
    backgroundColor: colors.soulmateGlow,
    paddingVertical: moderateScale(14),
    borderRadius: moderateScale(12),
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: colors.white,
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  cooldownContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(40),
  },
  cooldownTimer: {
    color: colors.starGlow,
    fontSize: moderateScale(40),
    fontWeight: '700',
    marginBottom: moderateScale(12),
  },
  cooldownMessage: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: moderateScale(15),
    fontWeight: '500',
    textAlign: 'center',
  },
});
