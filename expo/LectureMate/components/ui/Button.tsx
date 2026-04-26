import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, Typography, Radii, Spacing } from '../../constants/theme';

type Variant = 'filled' | 'tinted' | 'plain' | 'destructive';
type Size = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
  haptic?: boolean;
}

/**
 * iOS-style button with filled/tinted/plain/destructive variants.
 */
export function Button({
  title,
  onPress,
  variant = 'filled',
  size = 'medium',
  icon,
  loading,
  disabled,
  style,
  fullWidth = true,
  haptic = true,
}: ButtonProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const sizing: Record<Size, { padV: number; padH: number; font: TextStyle }> = {
    small: { padV: 6, padH: 12, font: Typography.subheadline },
    medium: { padV: 10, padH: 16, font: Typography.body },
    large: { padV: 14, padH: 20, font: Typography.headline },
  };
  const s = sizing[size];

  let bg: string;
  let fg: string;
  switch (variant) {
    case 'filled':
      bg = colors.systemBlue;
      fg = '#FFFFFF';
      break;
    case 'tinted':
      bg = colors.systemBlue + '24';
      fg = colors.systemBlue;
      break;
    case 'plain':
      bg = 'transparent';
      fg = colors.systemBlue;
      break;
    case 'destructive':
      bg = colors.systemRed;
      fg = '#FFFFFF';
      break;
  }

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={isDisabled}
      onPress={handlePress}
      style={[
        styles.btn,
        {
          backgroundColor: bg,
          paddingVertical: s.padV,
          paddingHorizontal: s.padH,
          opacity: isDisabled ? 0.4 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={s.font.fontSize as number} color={fg} />}
          <Text style={[s.font, { color: fg, fontWeight: '600' }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: Radii.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
