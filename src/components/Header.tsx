import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { UserProfile } from '../types/food';
import { COLORS } from '../theme/colors';

interface HeaderProps {
  profile: UserProfile;
  avatarUrl?: string;
  authProvider?: string;
  isDark: boolean;
  toggleTheme: () => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  avatarUrl,
  authProvider,
  isDark,
  toggleTheme,
  onOpenProfile,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: theme.card,
          borderBottomColor: theme.cardBorder,
          paddingTop: 8,
          paddingBottom: 10,
        },
      ]}
    >
      {/* Brand & User Greeting */}
      <TouchableOpacity
        style={styles.brandRow}
        onPress={onOpenProfile}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: theme.primaryBg,
              borderColor: theme.primaryBorder,
            },
          ]}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person" size={18} color={theme.primary} />
          )}

          {authProvider === 'google' && (
            <View style={styles.googleMiniBadge}>
              <MaterialCommunityIcons name="google" size={9} color="#EA4335" />
            </View>
          )}
        </View>

        <View style={styles.brandTextCol}>
          <Text style={[styles.greetingText, { color: theme.textSecondary }]}>
            Xin chào 👋
          </Text>
          <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
            {profile.name || 'Bạn'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Right Action Controls */}
      <View style={styles.rightActions}>
        {/* Streak Indicator */}
        <View
          style={[
            styles.streakPill,
            {
              backgroundColor: theme.amberBg,
              borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a',
            },
          ]}
        >
          <MaterialCommunityIcons name="fire" size={14} color="#f59e0b" />
          <Text style={styles.streakText}>5 ngày</Text>
        </View>

        {/* Dark/Light Theme Toggle */}
        <TouchableOpacity
          style={[
            styles.themeBtn,
            {
              backgroundColor: theme.cardElevated,
              borderColor: theme.cardBorderStrong || theme.cardBorder,
            },
          ]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={16}
            color={isDark ? '#fbbf24' : '#64748b'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  avatarImage: {
    width: 37,
    height: 37,
    borderRadius: 18.5,
  },
  googleMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  brandTextCol: {
    flex: 1,
    gap: 1,
  },
  greetingText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  streakText: {
    fontSize: 11,
    color: '#d97706',
    fontWeight: '700',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
