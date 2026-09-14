import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

interface BottomTabBarProps {
  activeTab: 'dashboard' | 'scanner' | 'history' | 'analytics' | 'profile';
  setActiveTab: (tab: 'dashboard' | 'scanner' | 'history' | 'analytics' | 'profile') => void;
  onOpenScanner: () => void;
  isDark: boolean;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenScanner,
  isDark,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.cardBorder,
        },
      ]}
    >
      {/* 1. Dashboard Tab */}
      <TouchableOpacity
        style={[
          styles.tabItem,
          activeTab === 'dashboard' && [
            styles.activeTabItem,
            { backgroundColor: theme.primaryBg },
          ],
        ]}
        onPress={() => setActiveTab('dashboard')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === 'dashboard' ? 'home' : 'home-outline'}
          size={21}
          color={activeTab === 'dashboard' ? theme.primary : theme.textSecondary}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: activeTab === 'dashboard' ? theme.primary : theme.textSecondary },
            activeTab === 'dashboard' && styles.activeTabLabel,
          ]}
        >
          Hôm nay
        </Text>
      </TouchableOpacity>

      {/* 2. History Tab */}
      <TouchableOpacity
        style={[
          styles.tabItem,
          activeTab === 'history' && [
            styles.activeTabItem,
            { backgroundColor: theme.primaryBg },
          ],
        ]}
        onPress={() => setActiveTab('history')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === 'history' ? 'calendar' : 'calendar-outline'}
          size={21}
          color={activeTab === 'history' ? theme.primary : theme.textSecondary}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: activeTab === 'history' ? theme.primary : theme.textSecondary },
            activeTab === 'history' && styles.activeTabLabel,
          ]}
        >
          Nhật ký
        </Text>
      </TouchableOpacity>

      {/* 3. Floating Center Camera Action Button */}
      <View style={styles.centerBtnWrapper}>
        <TouchableOpacity
          style={[
            styles.floatingCameraBtn,
            {
              backgroundColor: theme.primary,
              borderColor: theme.card,
              shadowColor: theme.primary,
            },
          ]}
          onPress={onOpenScanner}
          activeOpacity={0.85}
        >
          <Ionicons name="camera" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* 4. Analytics Tab */}
      <TouchableOpacity
        style={[
          styles.tabItem,
          activeTab === 'analytics' && [
            styles.activeTabItem,
            { backgroundColor: theme.primaryBg },
          ],
        ]}
        onPress={() => setActiveTab('analytics')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === 'analytics' ? 'stats-chart' : 'stats-chart-outline'}
          size={21}
          color={activeTab === 'analytics' ? theme.primary : theme.textSecondary}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: activeTab === 'analytics' ? theme.primary : theme.textSecondary },
            activeTab === 'analytics' && styles.activeTabLabel,
          ]}
        >
          Thống kê
        </Text>
      </TouchableOpacity>

      {/* 5. Profile Tab */}
      <TouchableOpacity
        style={[
          styles.tabItem,
          activeTab === 'profile' && [
            styles.activeTabItem,
            { backgroundColor: theme.primaryBg },
          ],
        ]}
        onPress={() => setActiveTab('profile')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === 'profile' ? 'person' : 'person-outline'}
          size={21}
          color={activeTab === 'profile' ? theme.primary : theme.textSecondary}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: activeTab === 'profile' ? theme.primary : theme.textSecondary },
            activeTab === 'profile' && styles.activeTabLabel,
          ]}
        >
          Hồ sơ
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.04)',
      } as any,
    }),
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 12,
    minWidth: 52,
  },
  activeTabItem: {
    transform: [{ scale: 1.02 }],
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  activeTabLabel: {
    fontWeight: '800',
  },
  centerBtnWrapper: {
    top: -16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCameraBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
