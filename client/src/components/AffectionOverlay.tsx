import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../styles/colors';
import { moderateScale } from '../styles/scale';
import GridPickerOverlay from './GridPickerOverlay';
import type { GridItem } from './GridPickerOverlay';
import type { AffectionType } from '../types';

const AFFECTION_ITEMS: GridItem[] = [
  { key: 'kiss', color: '#FF6B8A' },
  { key: 'hug', color: '#FFB74D' },
  { key: 'gratitude', color: '#A8D88E' },
  { key: 'poke', color: '#5DADE2' },
  { key: 'bite', color: '#E85D4A' },
  { key: 'tease', color: '#C4A6E8' },
];

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

  useEffect(() => {
    setRemaining(cooldownSeconds);
  }, [cooldownSeconds]);

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

  useEffect(() => {
    if (visible) setSelected(null);
  }, [visible]);

  const handleSend = () => {
    if (selected) onSend(selected);
  };

  if (onCooldown) {
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
            <View style={styles.cooldownContainer}>
              <Text style={styles.cooldownTimer}>
                {formatCountdown(remaining)}
              </Text>
              <Text style={styles.cooldownMessage}>
                come back soon to send more affection
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <GridPickerOverlay
      visible={visible}
      title="Send affection"
      items={AFFECTION_ITEMS}
      selectedKey={selected}
      onSelect={(key) => setSelected(key as AffectionType)}
      onClose={onClose}
    >
      <Pressable
        style={[styles.sendBtn, !selected && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!selected}
      >
        <Text style={styles.sendBtnText}>Send</Text>
      </Pressable>
    </GridPickerOverlay>
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
    paddingHorizontal: moderateScale(24),
    paddingBottom: moderateScale(40),
    paddingTop: moderateScale(16),
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: moderateScale(8),
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
