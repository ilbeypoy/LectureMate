import { View, ViewStyle, StyleSheet } from 'react-native';
import { ReactNode } from 'react';
import { useTheme, Radii, Spacing } from '../../constants/theme';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof Spacing;
  noShadow?: boolean;
}

/**
 * iOS-style elevated card with continuous corners and subtle shadow.
 */
export function Card({ children, style, padding = 'base', noShadow = false }: CardProps) {
  const { colors, isOled } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.secondarySystemGroupedBackground,
          padding: Spacing[padding],
        },
        !noShadow && !isOled && styles.shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
});
