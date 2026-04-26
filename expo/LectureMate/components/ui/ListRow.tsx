import {
  View,
  Text,
  StyleSheet,
  TouchableHighlight,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { useTheme, Typography, Spacing } from '../../constants/theme';

interface ListRowProps {
  title: string;
  subtitle?: string;
  detail?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconBackground?: string;
  iconColor?: string;
  rightElement?: ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
}

/**
 * iOS-style list row with optional icon, subtitle, detail and chevron.
 */
export function ListRow({
  title,
  subtitle,
  detail,
  icon,
  iconBackground,
  iconColor,
  rightElement,
  showChevron = false,
  destructive = false,
  onPress,
  onLongPress,
  style,
  titleStyle,
}: ListRowProps) {
  const { colors } = useTheme();

  const content = (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.secondarySystemGroupedBackground,
        },
        style,
      ]}
    >
      {icon && (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: iconBackground ?? colors.systemBlue },
          ]}
        >
          <Ionicons name={icon} size={18} color={iconColor ?? '#fff'} />
        </View>
      )}

      <View style={styles.content}>
        <Text
          style={[
            { color: destructive ? colors.systemRed : colors.label, ...Typography.body },
            titleStyle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{ color: colors.secondaryLabel, ...Typography.footnote, marginTop: 2 }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {detail !== undefined && (
        <Text style={{ color: colors.secondaryLabel, ...Typography.body }}>{detail}</Text>
      )}

      {rightElement}

      {showChevron && (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.tertiaryLabel}
          style={{ marginLeft: Spacing.xs }}
        />
      )}
    </View>
  );

  if (!onPress && !onLongPress) {
    return content;
  }

  return (
    <TouchableHighlight
      underlayColor={colors.systemFill}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {content}
    </TouchableHighlight>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 11,
    minHeight: 44,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
});
