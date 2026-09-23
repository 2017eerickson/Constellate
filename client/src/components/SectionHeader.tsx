import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle, StyleProp } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, moderateScale } from '../styles/scale';
import { colors } from '../styles/colors';

interface SectionHeaderProps {
  title: string;
  onEdit?: () => void;
  editDisabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function SectionHeader({ title, onEdit, editDisabled = false, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {onEdit && (
        <TouchableOpacity
          onPress={onEdit}
          disabled={editDisabled}
          style={editDisabled ? styles.disabled : undefined}
        >
          <MaterialIcons name="edit" size={scale(20)} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    marginBottom: scale(12),
  },
  title: {
    fontSize: moderateScale(20),
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.3,
  },
});
