// PRIMARY THEME COLOR — single source of truth
export const PRIMARY = '#19b558';
export const PRIMARY_DARK = '#15803d';

const PRIMARY_COLORS = {
  light: PRIMARY,
  dark: '#22c55e',
};

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: PRIMARY_COLORS.light,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: PRIMARY_COLORS.light,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: PRIMARY_COLORS.dark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: PRIMARY_COLORS.dark,
  },
};

export const Fonts = {
  body: 'Mulish_400Regular',
  bodyMedium: 'Mulish_500Medium',
  bodySemiBold: 'Mulish_600SemiBold',
  bodyBold: 'Mulish_700Bold',
  headingSemiBold: 'Syne_600SemiBold',
  headingBold: 'Syne_700Bold',
  headingExtraBold: 'Syne_800ExtraBold',
};