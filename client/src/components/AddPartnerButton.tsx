import React, { useCallback, useState } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getPartnerships } from '../services/partnerships';
import ActionButton from './ActionButton';
import { scale } from '../styles/scale';
import { colors } from '../styles/colors';

interface AddPartnerButtonProps {
  style?: StyleProp<ViewStyle>;
}

export default function AddPartnerButton({ style }: AddPartnerButtonProps) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [hasPending, setHasPending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getPartnerships()
        .then((data) => {
          const incoming = data.some(
            (p) => p.status === 'pending' && p.partner.id === user?.id,
          );
          setHasPending(incoming);
        })
        .catch(() => {});
    }, [user?.id]),
  );

  return (
    <View style={[styles.wrapper, style]}>
      <ActionButton
        onPress={() => navigation.navigate('Connect' as never)}
        text="+ Add a Partner"
        testID="add-partner-button"
        style={styles.button}
      />
      {hasPending && <View style={styles.activityDot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  button: {
    borderRadius: scale(12),
    padding: scale(16),
    borderWidth: 1,
    borderColor: colors.white,
  },
  activityDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 10,
  },
});
