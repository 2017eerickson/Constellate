import { StyleSheet } from 'react-native';
import { scale, moderateScale, verticalScale } from './scale';
import { colors } from './colors';

export const commonStyles = StyleSheet.create({
  // Screen containers
  screenCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: scale(20),
  },
  screenList: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: verticalScale(60),
  },
  screenBase: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Typography
  screenTitle: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
  },
  listScreenTitle: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    paddingHorizontal: scale(20),
    marginBottom: scale(20),
  },
  subtitle: {
    fontSize: moderateScale(16),
    color: colors.textSecondary,
  },
  nameText: {
    fontSize: moderateScale(18),
    fontWeight: '600',
  },
  relationText: {
    fontSize: moderateScale(14),
    color: colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: scale(12),
  },

  // Inputs
  input: {
    backgroundColor: colors.cardBg,
    borderRadius: scale(8),
    padding: scale(12),
    fontSize: moderateScale(16),
    marginBottom: scale(10),
  },
  inputBordered: {
    width: '80%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scale(8),
    padding: scale(14),
    fontSize: moderateScale(16),
    marginBottom: scale(12),
  },

  // Layout
  rowSpaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Error
  errorText: {
    color: colors.error,
    fontSize: moderateScale(14),
    textAlign: 'center',
  },
});
