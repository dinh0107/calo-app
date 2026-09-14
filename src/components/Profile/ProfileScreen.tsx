import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { UserProfile, ActivityLevel, FitnessGoal } from '../../types/food';
import {
  ACTIVITY_MULTIPLIERS,
  GOAL_CONFIG,
  calculateBMR,
  calculateTDEE,
  calculateNutritionTargets,
} from '../../utils/nutritionCalculators';
import { COLORS } from '../../theme/colors';

interface ProfileScreenProps {
  profile: UserProfile;
  userEmail?: string;
  avatarUrl?: string;
  authProvider?: string;
  onUpdateProfile: (partial: Partial<UserProfile>) => void;
  onResetAllData: () => void;
  onClearAllMeals?: () => void;
  onLogout?: () => void;
  onChangePassword?: (
    oldPass: string,
    newPass: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  onOpenOnboarding?: () => void;
  onOpenWaterReminder?: () => void;
  isDark: boolean;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  userEmail,
  avatarUrl,
  authProvider,
  onUpdateProfile,
  onResetAllData,
  onClearAllMeals,
  onLogout,
  onChangePassword,
  onOpenOnboarding,
  onOpenWaterReminder,
  isDark,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [formData, setFormData] = useState<UserProfile>({ ...profile });

  // Change Password form state
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePassLoading, setChangePassLoading] = useState(false);
  const [changePassMsg, setChangePassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const liveBMR = calculateBMR(formData.gender, formData.weight, formData.height, formData.age);
  const liveTDEE = calculateTDEE(liveBMR, formData.activityLevel);

  const handleAutoRecalculate = () => {
    const targets = calculateNutritionTargets(
      formData.gender,
      formData.weight,
      formData.height,
      formData.age,
      formData.activityLevel,
      formData.goal
    );
    const updated = {
      ...formData,
      targetCalories: targets.targetCalories,
      targetProtein: targets.targetProtein,
      targetCarbs: targets.targetCarbs,
      targetFat: targets.targetFat,
      waterGoal: targets.waterGoal,
    };
    setFormData(updated);
    onUpdateProfile(updated);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert('Đã tự động tính toán lại mục tiêu calo và macros chuẩn khoa học!');
    } else {
      Alert.alert('Thành công', 'Đã tự động tính toán lại mục tiêu calo và macros chuẩn khoa học!');
    }
  };

  const handleSave = () => {
    onUpdateProfile(formData);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert('Đã lưu cài đặt hồ sơ cá nhân!');
    } else {
      Alert.alert('Thành công', 'Đã lưu cài đặt hồ sơ cá nhân!');
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const ok = window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản CaloVision AI?');
      if (ok) {
        onLogout?.();
      }
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => onLogout?.(),
        },
      ]);
    }
  };

  const handleChangePasswordSubmit = async () => {
    setChangePassMsg(null);
    if (!newPassword || newPassword.length < 6) {
      setChangePassMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setChangePassMsg({ type: 'error', text: 'Mật khẩu mới và xác nhận mật khẩu không khớp.' });
      return;
    }

    if (!onChangePassword) return;

    setChangePassLoading(true);
    try {
      const res = await onChangePassword(oldPassword, newPassword);
      if (res.success) {
        setChangePassMsg({ type: 'success', text: res.message || 'Đổi mật khẩu thành công!' });
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setChangePassMsg({ type: 'error', text: res.error || 'Đổi mật khẩu thất bại.' });
      }
    } catch (e: any) {
      setChangePassMsg({ type: 'error', text: e.message || 'Lỗi hệ thống.' });
    } finally {
      setChangePassLoading(false);
    }
  };

  const handleClearAllMeals = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const ok = window.confirm(
        'Bạn có chắc chắn muốn xóa toàn bộ lịch sử các bữa ăn đã ghi?'
      );
      if (ok) {
        onClearAllMeals?.();
        window.alert('Đã xóa toàn bộ nhật ký ăn uống!');
      }
    } else {
      Alert.alert(
        'Xóa nhật ký ăn uống',
        'Bạn có chắc chắn muốn xóa toàn bộ lịch sử các bữa ăn đã ghi?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa toàn bộ',
            style: 'destructive',
            onPress: () => {
              onClearAllMeals?.();
              Alert.alert('Thành công', 'Đã xóa toàn bộ nhật ký ăn uống!');
            },
          },
        ]
      );
    }
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Account Info Card */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.accountHeaderRow}>
          <View style={[styles.accountAvatarBox, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.profileAvatarImg} resizeMode="cover" />
            ) : (
              <Ionicons name="person" size={22} color={theme.primary} />
            )}
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={[styles.title, { color: theme.text }]}>{profile.name || 'Người dùng CaloVision'}</Text>
              
              {/* Provider Badge */}
              {authProvider === 'google' ? (
                <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(234, 67, 53, 0.12)', borderColor: 'rgba(234, 67, 53, 0.3)' }]}>
                  <MaterialCommunityIcons name="google" size={11} color="#EA4335" />
                  <Text style={[styles.verifiedBadgeText, { color: '#EA4335' }]}>Google</Text>
                </View>
              ) : authProvider === 'guest' ? (
                <View style={[styles.verifiedBadge, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <Ionicons name="person-outline" size={11} color={theme.textSecondary} />
                  <Text style={[styles.verifiedBadgeText, { color: theme.textSecondary }]}>Khách</Text>
                </View>
              ) : (
                <View style={[styles.verifiedBadge, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
                  <Ionicons name="checkmark-circle" size={11} color={theme.primary} />
                  <Text style={[styles.verifiedBadgeText, { color: theme.primary }]}>Email</Text>
                </View>
              )}
            </View>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {userEmail || 'Tài khoản hoạt động'}
            </Text>
          </View>

          {/* Quick Logout Icon Button */}
          {onLogout && (
            <TouchableOpacity
              style={[styles.quickLogoutBtn, { backgroundColor: theme.dangerBg, borderColor: 'rgba(239, 68, 68, 0.3)' }]}
              onPress={handleLogout}
              activeOpacity={0.7}
              accessibilityLabel="Đăng xuất"
            >
              <Ionicons name="log-out-outline" size={18} color={theme.danger} />
            </TouchableOpacity>
          )}
        </View>

        {/* Change Password Collapsible Section for Email Accounts */}
        {authProvider === 'email' && onChangePassword && (
          <View style={[styles.changePasswordSection, { borderTopColor: theme.cardBorder }]}>
            <TouchableOpacity
              style={styles.changePasswordHeader}
              onPress={() => setIsChangePasswordOpen(!isChangePasswordOpen)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="lock-closed-outline" size={15} color={theme.primary} />
                <Text style={[styles.changePasswordTitle, { color: theme.text }]}>Đổi mật khẩu tài khoản</Text>
              </View>
              <Ionicons
                name={isChangePasswordOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.textMuted}
              />
            </TouchableOpacity>

            {isChangePasswordOpen && (
              <View style={styles.changePasswordForm}>
                {changePassMsg && (
                  <View
                    style={[
                      styles.msgBox,
                      changePassMsg.type === 'success'
                        ? { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }
                        : { backgroundColor: theme.dangerBg, borderColor: 'rgba(239, 68, 68, 0.3)' },
                    ]}
                  >
                    <Ionicons
                      name={changePassMsg.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                      size={14}
                      color={changePassMsg.type === 'success' ? theme.primary : theme.danger}
                    />
                    <Text
                      style={[
                        styles.msgText,
                        { color: changePassMsg.type === 'success' ? theme.primary : theme.danger },
                      ]}
                    >
                      {changePassMsg.text}
                    </Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Mật khẩu hiện tại (nếu có):</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text }]}
                    secureTextEntry
                    placeholder="Nhập mật khẩu hiện tại..."
                    placeholderTextColor={theme.textMuted}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Mật khẩu mới:</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text }]}
                    secureTextEntry
                    placeholder="Mật khẩu mới (tối thiểu 6 ký tự)..."
                    placeholderTextColor={theme.textMuted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Xác nhận mật khẩu mới:</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text }]}
                    secureTextEntry
                    placeholder="Nhập lại mật khẩu mới..."
                    placeholderTextColor={theme.textMuted}
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.savePassBtn, { backgroundColor: theme.primary }]}
                  onPress={handleChangePasswordSubmit}
                  disabled={changePassLoading}
                  activeOpacity={0.8}
                >
                  {changePassLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={14} color="#ffffff" />
                      <Text style={styles.savePassBtnText}>Cập Nhật Mật Khẩu</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Header */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.titleRow}>
          <Ionicons name="fitness-outline" size={18} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Hồ Sơ & Thể Trạng Cá Nhân</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Tính toán chỉ số BMR, TDEE và cá nhân hóa dinh dưỡng theo thể trạng.
        </Text>
      </View>

      {/* Biometrics Inputs */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Thông Số Cơ Thể</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Tên của bạn:</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text }]}
            value={formData.name}
            onChangeText={(t) => setFormData({ ...formData, name: t })}
            placeholder="Nhập tên"
            placeholderTextColor={theme.textMuted}
          />
        </View>

        <View style={styles.rowInputs}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Giới tính:</Text>
            <View style={styles.genderRow}>
              {(['male', 'female'] as const).map((g) => {
                const isSel = formData.gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderChip,
                      isSel
                        ? { backgroundColor: theme.primaryBg, borderColor: theme.primary }
                        : { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder },
                    ]}
                    onPress={() => setFormData({ ...formData, gender: g })}
                  >
                    <Ionicons
                      name={g === 'male' ? 'male' : 'female'}
                      size={14}
                      color={isSel ? theme.primary : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.genderText,
                        { color: isSel ? theme.primary : theme.textSecondary },
                        isSel && { fontWeight: '800' },
                      ]}
                    >
                      {g === 'male' ? 'Nam' : 'Nữ'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Tuổi:</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text }]}
              value={String(formData.age)}
              onChangeText={(t) => setFormData({ ...formData, age: Number(t) || 20 })}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Chiều cao (cm):</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text }]}
              value={String(formData.height)}
              onChangeText={(t) => setFormData({ ...formData, height: Number(t) || 170 })}
              keyboardType="numeric"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Cân nặng (kg):</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text }]}
              value={String(formData.weight)}
              onChangeText={(t) => setFormData({ ...formData, weight: Number(t) || 65 })}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Live BMR & TDEE Indicator */}
        <View style={styles.bmrRow}>
          <View style={[styles.bmrBox, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
            <Text style={[styles.bmrLabel, { color: theme.textSecondary }]}>BMR (Năng lượng nền)</Text>
            <Text style={[styles.bmrVal, { color: theme.primary }]}>
              {liveBMR} <Text style={{ fontSize: 10, color: theme.textMuted }}>kcal</Text>
            </Text>
          </View>

          <View style={[styles.bmrBox, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
            <Text style={[styles.bmrLabel, { color: theme.textSecondary }]}>TDEE (Tiêu hao/ngày)</Text>
            <Text style={[styles.bmrVal, { color: '#f59e0b' }]}>
              {liveTDEE} <Text style={{ fontSize: 10, color: theme.textMuted }}>kcal</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* Daily Targets Customizer */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Mục Tiêu Dinh Dưỡng</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {onOpenOnboarding && (
              <TouchableOpacity
                style={[styles.autoCalcBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={onOpenOnboarding}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={11} color="#ffffff" />
                <Text style={[styles.autoCalcText, { color: '#ffffff' }]}>Khảo Sát Lại</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.autoCalcBtn, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}
              onPress={handleAutoRecalculate}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={11} color={theme.primary} />
              <Text style={[styles.autoCalcText, { color: theme.primary }]}>Tự Tính</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.targetsGrid}>
          <View style={styles.targetField}>
            <Text style={[styles.targetFieldLabel, { color: theme.primary }]}>Calo (kcal):</Text>
            <TextInput
              style={[styles.targetInput, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.primary }]}
              value={String(formData.targetCalories)}
              onChangeText={(t) => setFormData({ ...formData, targetCalories: Number(t) || 2000 })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.targetField}>
            <Text style={[styles.targetFieldLabel, { color: theme.protein }]}>Đạm (g):</Text>
            <TextInput
              style={[styles.targetInput, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.protein }]}
              value={String(formData.targetProtein)}
              onChangeText={(t) => setFormData({ ...formData, targetProtein: Number(t) || 140 })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.targetField}>
            <Text style={[styles.targetFieldLabel, { color: theme.carbs }]}>Tinh bột (g):</Text>
            <TextInput
              style={[styles.targetInput, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.carbs }]}
              value={String(formData.targetCarbs)}
              onChangeText={(t) => setFormData({ ...formData, targetCarbs: Number(t) || 220 })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.targetField}>
            <Text style={[styles.targetFieldLabel, { color: theme.fat }]}>Chất béo (g):</Text>
            <TextInput
              style={[styles.targetInput, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.fat }]}
              value={String(formData.targetFat)}
              onChangeText={(t) => setFormData({ ...formData, targetFat: Number(t) || 60 })}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveProfileBtn, { backgroundColor: theme.primary }]}
        onPress={handleSave}
        activeOpacity={0.8}
      >
        <Ionicons name="save-outline" size={18} color="#ffffff" />
        <Text style={styles.saveProfileBtnText}>Lưu Cài Đặt Hồ Sơ</Text>
      </TouchableOpacity>

      {/* Water Reminder Settings Card */}
      {onOpenWaterReminder && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="water" size={18} color="#0284c7" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Nhắc Nhở Uống Nước Thông Minh</Text>
            </View>
            <View style={[styles.freeBadge, { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
              <Text style={[styles.freeBadgeText, { color: '#0284c7' }]}>Tự động 2L/ngày</Text>
            </View>
          </View>
          <Text style={[styles.apiKeyDesc, { color: theme.textSecondary }]}>
            Hệ thống tự động tính toán các mốc giờ uống nước khoa học từ lúc bạn thức dậy đến trước khi đi ngủ để đạt chuẩn 2.000ml/ngày.
          </Text>
          <TouchableOpacity
            style={[styles.testKeyBtn, { backgroundColor: 'rgba(2, 132, 199, 0.12)', borderColor: '#0284c7' }]}
            onPress={onOpenWaterReminder}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={16} color="#0284c7" />
            <Text style={[styles.testKeyBtnText, { color: '#0284c7' }]}>
              Cài Đặt Giờ Bắt Đầu & Lịch Nhắc Uống Nước
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Data Management Section */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quản Lý Nhật Ký & Dữ Liệu</Text>
        <Text style={[styles.apiKeyDesc, { color: theme.textSecondary }]}>
          Xóa toàn bộ các bữa ăn đã ghi để làm mới nhật ký dinh dưỡng của bạn:
        </Text>

        {onClearAllMeals && (
          <TouchableOpacity
            style={[styles.clearSampleBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
            onPress={handleClearAllMeals}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.clearSampleBtnText, { color: theme.text }]}>
              Xóa Toàn Bộ Lịch Sử Bữa Ăn
            </Text>
          </TouchableOpacity>
        )}

        {/* Logout button */}
        {onLogout && (
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: theme.dangerBg, borderColor: 'rgba(239, 68, 68, 0.3)' }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={theme.danger} />
            <Text style={[styles.logoutBtnText, { color: theme.danger }]}>Đăng Xuất Tài Khoản</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 110,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genderChip: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bmrRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  bmrBox: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  bmrLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  bmrVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoCalcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  autoCalcText: {
    fontSize: 10,
    fontWeight: '700',
  },
  targetsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  targetField: {
    flex: 1,
    gap: 3,
  },
  targetFieldLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  targetInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  freeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  apiKeyDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  testKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  testKeyBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  saveProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 18,
  },
  saveProfileBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  clearSampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  clearSampleBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  accountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  quickLogoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  changePasswordSection: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
    gap: 8,
  },
  changePasswordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  changePasswordTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  changePasswordForm: {
    gap: 10,
    paddingTop: 6,
  },
  msgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  msgText: {
    fontSize: 11,
    fontWeight: '600',
  },
  savePassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  savePassBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
