import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, Typography, Spacing, Radii } from '../../constants/theme';
import { Children, ReactNode } from 'react';

interface ListSectionProps {
  header?: string;
  footer?: string;
  children: ReactNode;
  inset?: boolean;
  style?: ViewStyle;
}

/**
 * iOS-style grouped list section.
 * Children get rounded corners on first/last item and separators between.
 */
export function ListSection({ header, footer, children, inset = true, style }: ListSectionProps) {
  const { colors } = useTheme();
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View style={[{ marginBottom: Spacing.lg }, style]}>
      {header && (
        <Text
          style={[
            styles.header,
            { color: colors.secondaryLabel, paddingHorizontal: inset ? Spacing.base + Spacing.base : Spacing.base },
          ]}
        >
          {header.toUpperCase()}
        </Text>
      )}

      <View
        style={[
          styles.group,
          {
            backgroundColor: colors.secondarySystemGroupedBackground,
            marginHorizontal: inset ? Spacing.base : 0,
            borderRadius: inset ? Radii.lg : 0,
          },
        ]}
      >
        {items.map((child, idx) => (
          <View key={idx}>
            {child}
            {idx < items.length - 1 && (
              <View
                style={[
                  styles.separator,
                  { backgroundColor: colors.separator, marginLeft: Spacing.base + 36 },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {footer && (
        <Text
          style={[
            styles.footer,
            { color: colors.secondaryLabel, paddingHorizontal: inset ? Spacing.base + Spacing.base : Spacing.base },
          ]}
        >
          {footer}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    ...Typography.footnote,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  footer: {
    ...Typography.footnote,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  group: {
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
