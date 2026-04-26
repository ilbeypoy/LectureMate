import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Spacing, Radii, Typography } from '../../constants/theme';

interface SearchFieldProps {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}

export function SearchField({ value, onChangeText, placeholder }: SearchFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm }}>
      <View
        style={[
          styles.field,
          { backgroundColor: colors.tertiarySystemFill },
        ]}
      >
        <Ionicons name="search" size={16} color={colors.secondaryLabel} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.secondaryLabel}
          style={[styles.input, { color: colors.label }]}
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')}>
            <Ionicons name="close-circle" size={16} color={colors.tertiaryLabel} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 8,
    borderRadius: Radii.md,
  },
  input: {
    flex: 1,
    ...Typography.callout,
    paddingVertical: 0,
  },
});
