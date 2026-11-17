import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { default as Text } from './AppText';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, moderateScale } from '../styles/scale';
import { colors } from '../styles/colors';

interface SectionHeaderProps {
  title: string;
  onEdit?: () => void;
  editDisabled?: boolean;
  editTestID?: string;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}

export default function SectionHeader({ title, onEdit, editDisabled = false, editTestID, style, titleStyle }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, titleStyle]}>{title}</Text>
      {onEdit && (
        <TouchableOpacity
          onPress={onEdit}
          disabled={editDisabled}
          testID={editTestID}
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
