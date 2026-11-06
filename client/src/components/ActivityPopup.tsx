import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../styles/colors';
import { moderateScale } from '../styles/scale';

interface ActivityPopupProps {
  visible: boolean;
  title: string;
  subtitle: string;
  onDismiss: () => void;
}

export default function ActivityPopup({
  visible,
  title,
  subtitle,
  onDismiss,
}: ActivityPopupProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable style={styles.closeBtn} onPress={onDismiss}>
            <MaterialCommunityIcons
              name="close"
              size={moderateScale(22)}
              color={colors.white}
            />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
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
  title: {
    color: colors.white,
    fontSize: moderateScale(22),
    fontWeight: '700',
    textAlign: 'center',
    marginTop: moderateScale(12),
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: moderateScale(15),
    fontWeight: '500',
    textAlign: 'center',
    marginTop: moderateScale(8),
  },
});
