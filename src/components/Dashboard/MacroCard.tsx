import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import type { MacroNutrients } from '../../types/food';
import { COLORS } from '../../theme/colors';

interface MacroCardProps {
  current: MacroNutrients;
  targets: {
    protein: number;
    carbs: number;
    fat: number;
  };
  isDark: boolean;
}

export const MacroCard: React.FC<MacroCardProps> = ({ current, targets, isDark }) => {
  const theme = isDark ? COLORS.dark : COLORS.light;

  const proteinPercent = Math.min(Math.round((current.protein / (targets.protein || 1)) * 100), 100);
  const carbsPercent = Math.min(Math.round((current.carbs / (targets.carbs || 1)) * 100), 100);
  const fatPercent = Math.min(Math.round((current.fat / (targets.fat || 1)) * 100), 100);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primaryBg }]}>
            <MaterialCommunityIcons name="scale-balance" size={15} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Dinh Dưỡng Đa Lượng</Text>
        </View>
        <Text style={[styles.subBadge, { color: theme.textMuted }]}>Tỷ lệ hấp thụ</Text>
      </View>

      <View style={styles.barsContainer}>
        {/* 1. Protein */}
        <View style={styles.macroRow}>
          <View style={styles.macroLabelRow}>
            <View style={styles.iconNameRow}>
              <View style={[styles.macroDot, { backgroundColor: theme.protein }]} />
              <Text style={[styles.macroName, { color: theme.text }]}>Đạm (Protein)</Text>
            </View>
            <Text style={[styles.macroNumbers, { color: theme.text }]}>
              {Math.round(current.protein)}g
              <Text style={{ color: theme.textMuted, fontWeight: 'normal' }}> / {targets.protein}g </Text>
              <Text style={{ color: theme.protein, fontWeight: '800' }}>({proteinPercent}%)</Text>
            </Text>
          </View>
          <View
            style={[
              styles.track,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' },
            ]}
          >
            <View
              style={[
                styles.fill,
                { width: `${proteinPercent}%`, backgroundColor: theme.protein },
              ]}
            />
          </View>
        </View>

        {/* 2. Carbs */}
        <View style={styles.macroRow}>
          <View style={styles.macroLabelRow}>
            <View style={styles.iconNameRow}>
              <View style={[styles.macroDot, { backgroundColor: theme.carbs }]} />
              <Text style={[styles.macroName, { color: theme.text }]}>Tinh Bột (Carbs)</Text>
            </View>
            <Text style={[styles.macroNumbers, { color: theme.text }]}>
              {Math.round(current.carbs)}g
              <Text style={{ color: theme.textMuted, fontWeight: 'normal' }}> / {targets.carbs}g </Text>
              <Text style={{ color: theme.carbs, fontWeight: '800' }}>({carbsPercent}%)</Text>
            </Text>
          </View>
          <View
            style={[
              styles.track,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' },
            ]}
          >
            <View
              style={[
                styles.fill,
                { width: `${carbsPercent}%`, backgroundColor: theme.carbs },
              ]}
            />
          </View>
        </View>

        {/* 3. Fat */}
        <View style={styles.macroRow}>
          <View style={styles.macroLabelRow}>
            <View style={styles.iconNameRow}>
              <View style={[styles.macroDot, { backgroundColor: theme.fat }]} />
              <Text style={[styles.macroName, { color: theme.text }]}>Chất Béo (Fat)</Text>
            </View>
            <Text style={[styles.macroNumbers, { color: theme.text }]}>
              {Math.round(current.fat)}g
              <Text style={{ color: theme.textMuted, fontWeight: 'normal' }}> / {targets.fat}g </Text>
              <Text style={{ color: theme.fat, fontWeight: '800' }}>({fatPercent}%)</Text>
            </Text>
          </View>
          <View
            style={[
              styles.track,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' },
            ]}
          >
            <View
              style={[
                styles.fill,
                { width: `${fatPercent}%`, backgroundColor: theme.fat },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Micro metrics bottom */}
      <View style={[styles.microRow, { borderTopColor: theme.cardBorder }]}>
        <View
          style={[
            styles.microBadge,
            {
              backgroundColor: theme.cardElevated,
              borderColor: theme.cardBorderStrong || theme.cardBorder,
            },
          ]}
        >
          <MaterialCommunityIcons name="leaf" size={13} color={theme.primary} />
          <Text style={[styles.microText, { color: theme.textSecondary }]}>
            Chất xơ: <Text style={{ color: theme.text, fontWeight: '700' }}>{Math.round(current.fiber || 4)}g</Text> / 25g
          </Text>
        </View>

        <View
          style={[
            styles.microBadge,
            {
              backgroundColor: theme.cardElevated,
              borderColor: theme.cardBorderStrong || theme.cardBorder,
            },
          ]}
        >
          <Ionicons name="sparkles-outline" size={13} color="#0284c7" />
          <Text style={[styles.microText, { color: theme.textSecondary }]}>
            Natri: <Text style={{ color: theme.text, fontWeight: '700' }}>{Math.round(current.sodium || 800)}mg</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
      } as any,
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subBadge: {
    fontSize: 11,
    fontWeight: '500',
  },
  barsContainer: {
    gap: 10,
  },
  macroRow: {
    gap: 5,
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroName: {
    fontSize: 12,
    fontWeight: '700',
  },
  macroNumbers: {
    fontSize: 11,
    fontWeight: '700',
  },
  track: {
    height: 7,
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3.5,
  },
  microRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  microBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  microText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
