import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../styles/colors';
import { moderateScale } from '../styles/scale';
import type { Affection } from '../types';

const AFFECTION_COLORS: Record<string, string> = {
  kiss: '#FF6B8A',
  hug: '#FFB74D',
  gratitude: '#A8D88E',
  poke: '#5DADE2',
  bite: '#E85D4A',
  tease: '#C4A6E8',
};

interface AffectionReceivedPopupProps {
  affection: Affection;
  partnerName: string;
  onDismiss: () => void;
}

export default function AffectionReceivedPopup({
  affection,
  partnerName,
  onDismiss,
}: AffectionReceivedPopupProps) {
  const typeColor = AFFECTION_COLORS[affection.type] || colors.white;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable style={styles.closeBtn} onPress={onDismiss}>
            <MaterialCommunityIcons
              name="close"
              size={moderateScale(22)}
              color={colors.white}
            />
          </Pressable>

          <Text style={styles.message}>
            {partnerName} sent you a{' '}
            <Text style={[styles.affectionType, { color: typeColor }]}>
              {affection.type}
            </Text>
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 26, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.skyDark,
    borderRadius: moderateScale(20),
    paddingHorizontal: moderateScale(32),
    paddingVertical: moderateScale(28),
    alignItems: 'center',
    width: '80%',
  },
  closeBtn: {
    position: 'absolute',
    top: moderateScale(10),
    right: moderateScale(10),
    padding: moderateScale(6),
  },
  message: {
    color: colors.white,
    fontSize: moderateScale(18),
    fontWeight: '600',
    textAlign: 'center',
    marginTop: moderateScale(12),
  },
  affectionType: {
    fontWeight: '800',
    textTransform: 'capitalize',
  },
});
