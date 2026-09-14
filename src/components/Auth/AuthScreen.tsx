import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { UserProfile } from '../../types/food';
import {
  launchGoogleOAuth,
  getActiveGoogleClientId,
  saveGoogleClientId,
  isValidGoogleClientId,
} from '../../services/googleAuthService';
import { authService } from '../../services/authService';
import { COLORS } from '../../theme/colors';

interface AuthScreenProps {
  onLogin: (email: string, pass: string) => Promise<{ success: boolean; error?: string; user?: any }>;
  onRegister: (
    name: string,
    email: string,
    pass: string,
    profile?: Partial<UserProfile>
  ) => Promise<{ success: boolean; error?: string; user?: any }>;
  onGoogleLogin: (googleData?: {
    email: string;
    name: string;
    avatarUrl?: string;
    googleId?: string;
  }) => Promise<{ success: boolean; error?: string; user?: any }>;
  onGuestLogin: () => Promise<void>;
  onResetPassword?: (
    email: string,
    newPass?: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  isDark: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLogin,
  onRegister,
  onGoogleLogin,
  onGuestLogin,
  onResetPassword,
  isDark,
}) => {
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register Form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  // Forgot Password Modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);
  const [forgotErrorMsg, setForgotErrorMsg] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Google OAuth Config & Quick Connect State
  const [googleClientId, setGoogleClientId] = useState('');
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleModalTab, setGoogleModalTab] = useState<'quick' | 'client_id'>('quick');
  const [customGmail, setCustomGmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  // General Status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    getActiveGoogleClientId().then((id) => {
      if (id) setGoogleClientId(id);
    });
  }, []);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  /**
   * Điền nhanh tài khoản Demo
   */
  const handleQuickDemoFill = async () => {
    setEmail('demo@calovision.com');
    setPassword('demo@password123');
    clearMessages();
    setLoading(true);
    try {
      const res = await onLogin('demo@calovision.com', 'demo@password123');
      if (!res.success) {
        setErrorMessage(res.error || 'Đăng nhập Demo thất bại.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi đăng nhập tài khoản Demo.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xử lý Đăng Nhập
   */
  const handleLoginSubmit = async () => {
    clearMessages();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const res = await onLogin(trimmedEmail, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Email hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi mạng hoặc hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xử lý Đăng Ký
   */
  const handleRegisterSubmit = async () => {
    clearMessages();
    const trimmedName = registerName.trim();
    const trimmedEmail = registerEmail.trim();

    if (!trimmedName) {
      setErrorMessage('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    if (!registerPassword || registerPassword.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const res = await onRegister(trimmedName, trimmedEmail, registerPassword, {
        name: trimmedName,
        hasCompletedOnboarding: false,
      });
      if (!res.success) {
        setErrorMessage(res.error || 'Đăng ký thất bại.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi mạng hoặc hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xử lý Đăng Nhập Google (OAuth Popup / Direct)
   */
  const handleGoogleSignInClick = async () => {
    clearMessages();
    const activeId = googleClientId.trim() || (await getActiveGoogleClientId());

    setLoading(true);
    try {
      const googleUser = await launchGoogleOAuth(activeId);
      if (googleUser && googleUser.email) {
        const res = await onGoogleLogin({
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.avatarUrl,
          googleId: googleUser.id,
        });
        if (!res.success) {
          setErrorMessage(res.error || 'Đăng nhập Google thất bại.');
        }
      }
    } catch (err: any) {
      console.warn('Google OAuth error:', err);
      const msg = err?.message || '';
      if (
        msg.includes('đã bị đóng') ||
        msg.includes('closed') ||
        msg.includes('cancel') ||
        msg.includes('popup_closed')
      ) {
        setErrorMessage('Bạn đã đóng cửa sổ đăng nhập Google.');
      } else {
        // Mở modal hỗ trợ người dùng
        setIsGoogleModalOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Đăng nhập nhanh Google (Quick Connect)
   */
  const handleQuickGoogleLogin = async () => {
    const trimmedEmail = customGmail.trim().toLowerCase();
    const trimmedName = customGoogleName.trim() || (trimmedEmail ? trimmedEmail.split('@')[0] : 'Google User');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      Alert.alert('Email không hợp lệ', 'Vui lòng nhập đúng định dạng địa chỉ Email/Gmail.');
      return;
    }

    setIsGoogleModalOpen(false);
    setLoading(true);
    try {
      const res = await onGoogleLogin({
        email: trimmedEmail,
        name: trimmedName,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmedName)}&background=EA4335&color=fff&bold=true`,
      });
      if (!res.success) {
        setErrorMessage(res.error || 'Đăng nhập Google thất bại.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi kết nối tài khoản Google.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Lưu Client ID và mở OAuth
   */
  const handleSaveAndLaunchPopup = async () => {
    const trimmed = googleClientId.trim();
    if (!trimmed) {
      Alert.alert('Chưa nhập Client ID', 'Vui lòng dán Google OAuth Web Client ID của bạn.');
      return;
    }

    await saveGoogleClientId(trimmed);
    setIsGoogleModalOpen(false);

    setLoading(true);
    try {
      const googleUser = await launchGoogleOAuth(trimmed);
      if (googleUser && googleUser.email) {
        const res = await onGoogleLogin({
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.avatarUrl,
          googleId: googleUser.id,
        });
        if (!res.success) {
          setErrorMessage(res.error || 'Đăng nhập Google thất bại.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi uỷ quyền từ Google.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Đăng nhập Khách
   */
  const handleGuestSubmit = async () => {
    clearMessages();
    setLoading(true);
    try {
      await onGuestLogin();
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tạo phiên khách.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xử lý Quên mật khẩu
   */
  const handleResetPasswordSubmit = async () => {
    setForgotErrorMsg(null);
    setForgotSuccessMsg(null);

    const trimmedEmail = forgotEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setForgotErrorMsg('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    const newPass = forgotNewPassword.trim() || '123456';
    if (newPass.length < 6) {
      setForgotErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setForgotLoading(true);
    try {
      const resetFn = onResetPassword || authService.resetPassword.bind(authService);
      const res = await resetFn(trimmedEmail, newPass);
      if (res.success) {
        setForgotSuccessMsg(res.message || 'Đã đặt lại mật khẩu mới thành công!');
        setEmail(trimmedEmail);
        setPassword(newPass);
      } else {
        setForgotErrorMsg(res.error || 'Không thể đặt lại mật khẩu.');
      }
    } catch (err: any) {
      setForgotErrorMsg(err.message || 'Lỗi hệ thống khi khôi phục mật khẩu.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Brand Banner */}
        <View style={styles.brandHeader}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.brandLogoImage}
            resizeMode="contain"
          />
          <View style={styles.titleRow}>
            <Text style={[styles.brandTitle, { color: theme.text }]}>CaloVision AI</Text>
            <View style={[styles.aiBadge, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
              <Text style={[styles.aiBadgeText, { color: theme.primary }]}>AI 2.0</Text>
            </View>
          </View>
          <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
            Nhận diện món ăn chuẩn xác & nhật ký dinh dưỡng thông minh hàng ngày
          </Text>
        </View>

        {/* Mode Switcher Tabs */}
        <View style={[styles.tabSegment, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              mode === 'login' && [styles.tabBtnActive, { backgroundColor: theme.card, shadowColor: '#000' }],
            ]}
            onPress={() => {
              setMode('login');
              clearMessages();
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-in-outline"
              size={17}
              color={mode === 'login' ? theme.primary : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: mode === 'login' ? theme.primary : theme.textSecondary },
                mode === 'login' && { fontWeight: '800' },
              ]}
            >
              Đăng Nhập
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              mode === 'register' && [styles.tabBtnActive, { backgroundColor: theme.card, shadowColor: '#000' }],
            ]}
            onPress={() => {
              setMode('register');
              clearMessages();
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="person-add-outline"
              size={17}
              color={mode === 'register' ? theme.primary : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: mode === 'register' ? theme.primary : theme.textSecondary },
                mode === 'register' && { fontWeight: '800' },
              ]}
            >
              Đăng Ký
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Notification Banner */}
        {errorMessage && (
          <View style={[styles.errorBox, { backgroundColor: theme.dangerBg, borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
            <Ionicons name="alert-circle" size={18} color={theme.danger} />
            <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
            <TouchableOpacity onPress={() => setErrorMessage(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color={theme.danger} />
            </TouchableOpacity>
          </View>
        )}

        {/* Success Notification Banner */}
        {successMessage && (
          <View style={[styles.successBox, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
            <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
            <Text style={[styles.successText, { color: theme.primary }]}>{successMessage}</Text>
          </View>
        )}

        {/* Form Container */}
        <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Direct Google Sign In Button */}
          <TouchableOpacity
            style={[styles.googleSignInBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
            onPress={handleGoogleSignInClick}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#EA4335" />
            ) : (
              <View style={styles.googleIconBox}>
                <MaterialCommunityIcons name="google" size={22} color="#EA4335" />
              </View>
            )}
            <Text style={[styles.googleBtnText, { color: theme.text }]}>
              {loading
                ? 'Đang xác thực Google...'
                : mode === 'login'
                ? 'Tiếp tục bằng tài khoản Google'
                : 'Đăng ký nhanh với Google'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>HOẶC QUA EMAIL</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
          </View>

          {mode === 'login' ? (
            /* ========================================================
             * --- LOGIN FORM ---
             * ======================================================== */
            <View style={styles.formFields}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Địa chỉ Email</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <Ionicons name="mail-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    placeholder="vidu@email.com"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.passwordLabelRow}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Mật khẩu</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setForgotEmail(email);
                      setForgotSuccessMsg(null);
                      setForgotErrorMsg(null);
                      setIsForgotModalOpen(true);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.forgotPassLink, { color: theme.primary }]}>Quên mật khẩu?</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputWrapper, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    placeholder="Nhập mật khẩu..."
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
                onPress={handleLoginSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.primaryActionBtnText}>Đăng Nhập Ngay</Text>
                    <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>

              {/* Quick Demo Login Option */}
              <TouchableOpacity
                style={[styles.demoLoginBtn, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}
                onPress={handleQuickDemoFill}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons name="flash" size={15} color={theme.primary} />
                <Text style={[styles.demoLoginBtnText, { color: theme.primary }]}>
                  Dùng thử tài khoản mẫu (Demo 1-Click)
                </Text>
              </TouchableOpacity>

              {/* Guest Login Option */}
              <TouchableOpacity
                style={[styles.guestBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
                onPress={handleGuestSubmit}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={16} color={theme.textSecondary} />
                <Text style={[styles.guestBtnText, { color: theme.text }]}>
                  Tiếp tục với tư cách Khách
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ========================================================
             * --- REGISTER FORM ---
             * ======================================================== */
            <View style={styles.formFields}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Họ và tên của bạn</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <Ionicons name="person-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    placeholderTextColor={theme.textMuted}
                    value={registerName}
                    onChangeText={setRegisterName}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Địa chỉ Email</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <Ionicons name="mail-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    placeholder="vidu@email.com"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={registerEmail}
                    onChangeText={setRegisterEmail}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Mật khẩu (ít nhất 6 ký tự)</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    placeholder="Tạo mật khẩu an toàn..."
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showRegisterPassword}
                    value={registerPassword}
                    onChangeText={setRegisterPassword}
                  />
                  <TouchableOpacity onPress={() => setShowRegisterPassword(!showRegisterPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showRegisterPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.passwordLabelRow}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Xác nhận mật khẩu</Text>
                  {registerConfirmPassword.length > 0 && (
                    <Text
                      style={[
                        styles.matchStatusText,
                        {
                          color:
                            registerPassword === registerConfirmPassword
                              ? theme.primary
                              : theme.danger,
                        },
                      ]}
                    >
                      {registerPassword === registerConfirmPassword ? '✓ Khớp mật khẩu' : '✕ Chưa khớp'}
                    </Text>
                  )}
                </View>
                <View style={[styles.inputWrapper, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    placeholder="Nhập lại mật khẩu..."
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showRegisterConfirmPassword}
                    value={registerConfirmPassword}
                    onChangeText={setRegisterConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showRegisterConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
                onPress={handleRegisterSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.primaryActionBtnText}>Tạo Tài Khoản & Bắt Đầu</Text>
                    <Ionicons name="arrow-forward-circle" size={18} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>

              <Text style={[styles.privacyNote, { color: theme.textMuted }]}>
                Bằng việc đăng ký, bạn đồng ý với Điều khoản & Chính sách dinh dưỡng của CaloVision AI.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ========================================================
       * --- FORGOT PASSWORD MODAL ---
       * ======================================================== */}
      <Modal
        visible={isForgotModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsForgotModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.googleModalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.googleModalHeader}>
              <View style={[styles.iconCircleHeader, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
                <Ionicons name="key-outline" size={26} color={theme.primary} />
              </View>
              <Text style={[styles.googleModalTitle, { color: theme.text }]}>Khôi Phục Mật Khẩu</Text>
              <Text style={[styles.googleModalSubtitle, { color: theme.textSecondary }]}>
                Nhập email của bạn và mật khẩu mới mong muốn để đặt lại quyền truy cập ngay lập tức.
              </Text>
            </View>

            {forgotErrorMsg && (
              <View style={[styles.errorBox, { backgroundColor: theme.dangerBg, borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                <Ionicons name="alert-circle" size={16} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>{forgotErrorMsg}</Text>
              </View>
            )}

            {forgotSuccessMsg && (
              <View style={[styles.successBox, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
                <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
                <Text style={[styles.successText, { color: theme.primary }]}>{forgotSuccessMsg}</Text>
              </View>
            )}

            <View style={{ gap: 12, marginVertical: 4 }}>
              <View style={{ gap: 6 }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email tài khoản:</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <Ionicons name="mail-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    placeholder="email@vidu.com"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                  />
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Mật khẩu mới (tối thiểu 6 ký tự):</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    placeholder="Nhập mật khẩu mới..."
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry
                    value={forgotNewPassword}
                    onChangeText={setForgotNewPassword}
                  />
                </View>
              </View>
            </View>

            <View style={styles.googleModalActions}>
              <TouchableOpacity
                style={[styles.googleCancelBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
                onPress={() => setIsForgotModalOpen(false)}
              >
                <Text style={[styles.googleCancelBtnText, { color: theme.textSecondary }]}>Đóng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.googleConfirmBtn, { backgroundColor: theme.primary }]}
                onPress={handleResetPasswordSubmit}
                disabled={forgotLoading}
              >
                {forgotLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={16} color="#ffffff" />
                    <Text style={styles.googleConfirmBtnText}>Đặt Lại Mật Khẩu</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================
       * --- GOOGLE AUTHENTICATION MODAL ---
       * ======================================================== */}
      <Modal
        visible={isGoogleModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGoogleModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.googleModalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Header */}
            <View style={styles.googleModalHeader}>
              <View style={styles.googleBigIconBox}>
                <MaterialCommunityIcons name="google" size={28} color="#EA4335" />
              </View>
              <Text style={[styles.googleModalTitle, { color: theme.text }]}>Đăng Nhập Bằng Google</Text>
              <Text style={[styles.googleModalSubtitle, { color: theme.textSecondary }]}>
                Đăng nhập nhanh chóng và đồng bộ dữ liệu calo, dinh dưỡng với tài khoản Google.
              </Text>
            </View>

            {/* Modal Tabs */}
            <View style={[styles.tabSegment, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, marginVertical: 4 }]}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  googleModalTab === 'quick' && [styles.tabBtnActive, { backgroundColor: theme.card }],
                ]}
                onPress={() => setGoogleModalTab('quick')}
                activeOpacity={0.8}
              >
                <Ionicons name="flash-outline" size={15} color={googleModalTab === 'quick' ? '#EA4335' : theme.textSecondary} />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: googleModalTab === 'quick' ? '#EA4335' : theme.textSecondary, fontSize: 12 },
                    googleModalTab === 'quick' && { fontWeight: '800' },
                  ]}
                >
                  Đăng Nhập Nhanh
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  googleModalTab === 'client_id' && [styles.tabBtnActive, { backgroundColor: theme.card }],
                ]}
                onPress={() => setGoogleModalTab('client_id')}
                activeOpacity={0.8}
              >
                <Ionicons name="key-outline" size={15} color={googleModalTab === 'client_id' ? '#4285F4' : theme.textSecondary} />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: googleModalTab === 'client_id' ? '#4285F4' : theme.textSecondary, fontSize: 12 },
                    googleModalTab === 'client_id' && { fontWeight: '800' },
                  ]}
                >
                  Google Client ID
                </Text>
              </TouchableOpacity>
            </View>

            {googleModalTab === 'quick' ? (
              /* TAB 1: QUICK GOOGLE LOGIN */
              <View style={{ gap: 12, marginVertical: 4 }}>
                <View style={{ gap: 6 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Địa chỉ Gmail Google của bạn:</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                    <MaterialCommunityIcons name="gmail" size={18} color="#EA4335" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: theme.text }]}
                      placeholder="vidu@gmail.com"
                      placeholderTextColor={theme.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={customGmail}
                      onChangeText={setCustomGmail}
                    />
                  </View>
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Tên hiển thị Google:</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                    <Ionicons name="person-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: theme.text }]}
                      placeholder="Họ và tên..."
                      placeholderTextColor={theme.textMuted}
                      value={customGoogleName}
                      onChangeText={setCustomGoogleName}
                    />
                  </View>
                </View>

                <View style={styles.googleModalActions}>
                  <TouchableOpacity
                    style={[styles.googleCancelBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
                    onPress={() => setIsGoogleModalOpen(false)}
                  >
                    <Text style={[styles.googleCancelBtnText, { color: theme.textSecondary }]}>Đóng</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.googleConfirmBtn, { backgroundColor: '#EA4335' }]}
                    onPress={handleQuickGoogleLogin}
                  >
                    <MaterialCommunityIcons name="google" size={16} color="#ffffff" />
                    <Text style={styles.googleConfirmBtnText}>Đăng Nhập Google Ngay</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* TAB 2: GOOGLE CLOUD CONSOLE CLIENT ID */
              <View style={{ gap: 12 }}>
                <View style={[styles.setupGuideBox, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.setupGuideTitle, { color: theme.text }]}>Cách lấy Web Client ID từ Google Cloud:</Text>
                  <Text style={[styles.setupGuideStep, { color: theme.textSecondary }]}>
                    1. Truy cập <Text style={{ fontWeight: '700', color: theme.primary }}>console.cloud.google.com/apis/credentials</Text>
                  </Text>
                  <Text style={[styles.setupGuideStep, { color: theme.textSecondary }]}>
                    2. Tạo OAuth Client ID (Web Application) và thêm Authorized Javascript Origin: <Text style={{ fontWeight: '700', color: theme.primary }}>http://localhost:8081</Text>
                  </Text>
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Dán Google Client ID vào đây:</Text>
                  <TextInput
                    style={[
                      styles.customGmailInput,
                      { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder, color: theme.text },
                    ]}
                    placeholder="xxxxxx.apps.googleusercontent.com"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                    value={googleClientId}
                    onChangeText={setGoogleClientId}
                  />
                </View>

                <View style={styles.googleModalActions}>
                  <TouchableOpacity
                    style={[styles.googleCancelBtn, { backgroundColor: theme.cardElevated, borderColor: theme.cardBorder }]}
                    onPress={() => setIsGoogleModalOpen(false)}
                  >
                    <Text style={[styles.googleCancelBtnText, { color: theme.textSecondary }]}>Đóng</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.googleConfirmBtn, { backgroundColor: '#4285F4' }]}
                    onPress={handleSaveAndLaunchPopup}
                  >
                    <MaterialCommunityIcons name="google" size={16} color="#ffffff" />
                    <Text style={styles.googleConfirmBtnText}>
                      {Platform.OS === 'web' ? 'Mở Popup Google' : 'Tiếp Tục Đăng Nhập'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 36,
    paddingBottom: 48,
    gap: 16,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  brandHeader: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  brandLogoImage: {
    width: 68,
    height: 68,
    borderRadius: 18,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  aiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  brandSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  tabSegment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabBtnActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  successText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  formCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  googleSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  googleIconBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  formFields: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  forgotPassLink: {
    fontSize: 11,
    fontWeight: '700',
  },
  matchStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  demoLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  demoLoginBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  guestBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  privacyNote: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  googleModalCard: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  googleModalHeader: {
    alignItems: 'center',
    gap: 6,
  },
  iconCircleHeader: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  googleBigIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  googleModalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  googleModalSubtitle: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  setupGuideBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  setupGuideTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  setupGuideStep: {
    fontSize: 11,
    lineHeight: 16,
  },
  customGmailInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
  },
  googleModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  googleCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  googleConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  googleConfirmBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
