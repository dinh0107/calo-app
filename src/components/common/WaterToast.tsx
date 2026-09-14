import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';

interface WaterToastProps {
  visible: boolean;
  title: string;
  message: string;
  amountMl?: number;
  onQuickDrink?: (amount: number) => void;
  onClose: () => void;
  isDark: boolean;
}

export const WaterToast: React.FC<WaterToastProps> = ({
  visible,
  title,
  message,
  amountMl = 250,
  onQuickDrink,
  onClose,
  isDark,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, 7000);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(slideAnim, {
        toValue: -140,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -140,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: Math.max(insets.top + 8, Platform.OS === 'ios' ? 50 : 16),
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.toastCard,
          {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            borderColor: isDark ? 'rgba(34, 197, 94, 0.4)' : '#22c55e',
          },
        ]}
      >
        {/* Official CaloVision App Logo */}
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
          <View style={styles.badgeIconBox}>
            <Ionicons name="water" size={10} color="#ffffff" />
          </View>
        </View>

        <View style={styles.contentCol}>
          <View style={styles.headerRow}>
            <View style={styles.brandTagRow}>
              <Text style={styles.brandName}>CALOVISION</Text>
              <Text style={styles.dotSeparator}>•</Text>
              <Text style={styles.timeText}>Vừa xong</Text>
            </View>
            <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{title || 'Nhắc nhở uống nước!'}</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]} numberOfLines={2}>
            {message}
          </Text>

          {onQuickDrink && (
            <TouchableOpacity
              style={styles.drinkBtn}
              onPress={() => {
                onQuickDrink(amountMl);
                handleDismiss();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={14} color="#ffffff" />
              <Text style={styles.drinkBtnText}>Đã uống +{amountMl}ml</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 8px 24px rgba(34, 197, 94, 0.2)',
      } as any,
    }),
  },
  logoWrapper: {
    position: 'relative',
    marginTop: 2,
  },
  logoImage: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgeIconBox: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  contentCol: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  brandTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  brandName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22c55e',
    letterSpacing: 0.5,
  },
  dotSeparator: {
    fontSize: 10,
    color: '#94a3b8',
  },
  timeText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
  },
  message: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  drinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 6,
  },
  drinkBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
});
