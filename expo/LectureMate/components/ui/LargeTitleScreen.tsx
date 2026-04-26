import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  RefreshControl,
  Platform,
} from 'react-native';
import { ReactNode, useRef } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme, Typography, Spacing } from '../../constants/theme';

interface LargeTitleScreenProps {
  title: string;
  rightAction?: ReactNode;
  children: ReactNode;
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
  searchBar?: ReactNode;
  contentInsetTop?: number;
}

const HEADER_HEIGHT = 44;

/**
 * iOS Large Title pattern: title shrinks into nav bar on scroll.
 * Replicates UINavigationController + UINavigationBar with prefersLargeTitles.
 */
export function LargeTitleScreen({
  title,
  rightAction,
  children,
  onRefresh,
  refreshing = false,
  searchBar,
}: LargeTitleScreenProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Title transitions: large -> compact when scrolled past large title
  const compactTitleOpacity = scrollY.interpolate({
    inputRange: [40, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const largeTitleOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const largeTitleTranslate = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  const navBarBorderOpacity = scrollY.interpolate({
    inputRange: [40, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.systemGroupedBackground }]}>
      {/* Compact Navigation Bar */}
      <View
        style={[
          styles.navBar,
          {
            paddingTop: insets.top,
            height: insets.top + HEADER_HEIGHT,
          },
        ]}
        pointerEvents="box-none"
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={80}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.systemBackground }]}
          />
        )}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.separator,
              opacity: navBarBorderOpacity,
            },
          ]}
        />

        <View style={styles.navContent}>
          <Animated.Text
            style={[
              styles.compactTitle,
              { color: colors.label, opacity: compactTitleOpacity },
            ]}
            numberOfLines={1}
          >
            {title}
          </Animated.Text>

          {rightAction && <View style={styles.navRight}>{rightAction}</View>}
        </View>
      </View>

      <Animated.ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + HEADER_HEIGHT,
          paddingBottom: Spacing.xxl + insets.bottom + 60,
        }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.systemGray} />
          ) : undefined
        }
        showsVerticalScrollIndicator
      >
        {/* Large Title */}
        <Animated.View
          style={[
            styles.largeTitleWrap,
            {
              opacity: largeTitleOpacity,
              transform: [{ translateY: largeTitleTranslate }],
            },
          ]}
        >
          <Text style={[styles.largeTitle, { color: colors.label }]} numberOfLines={1}>
            {title}
          </Text>
        </Animated.View>

        {searchBar}

        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  navContent: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
  },
  compactTitle: {
    ...Typography.headline,
  },
  navRight: {
    position: 'absolute',
    right: Spacing.base,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  largeTitleWrap: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  largeTitle: {
    ...Typography.largeTitle,
  },
});
