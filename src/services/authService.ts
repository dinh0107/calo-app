import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './apiClient';
import type { UserProfile } from '../types/food';
import type { UserAccount, AuthSession } from '../types/auth';
import { calculateNutritionTargets } from '../utils/nutritionCalculators';

const AUTH_KEYS = {
  USERS: 'calovision_users_db_v1',
  ACTIVE_USER_ID: 'calovision_active_user_id_v1',
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Người dùng CaloVision',
  gender: 'male',
  age: 25,
  weight: 65,
  height: 170,
  activityLevel: 'moderate',
  goal: 'maintain',
  targetCalories: 2000,
  targetProtein: 120,
  targetCarbs: 230,
  targetFat: 60,
  waterGoal: 2000,
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  hasCompletedOnboarding: false,
};

const DEFAULT_DEMO_USER: UserAccount = {
  id: 'user_demo_calovision',
  email: 'demo@calovision.com',
  name: 'Nguyễn Minh Anh',
  password: 'demo@password123',
  authProvider: 'email',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  createdAt: 1710000000000,
  profile: {
    ...DEFAULT_USER_PROFILE,
    name: 'Nguyễn Minh Anh',
    gender: 'female',
    age: 24,
    weight: 52,
    height: 162,
    activityLevel: 'moderate',
    goal: 'maintain',
    targetCalories: 1850,
    targetProtein: 110,
    targetCarbs: 210,
    targetFat: 55,
    waterGoal: 2000,
    hasCompletedOnboarding: true,
  },
};

let currentSession: AuthSession = {
  user: null,
  isAuthenticated: false,
};

let authListeners: Array<(session: AuthSession) => void> = [];

export const authService = {
  /**
   * Khởi tạo hệ thống Auth từ AsyncStorage
   */
  async init(): Promise<AuthSession> {
    try {
      const [usersJson, activeId] = await Promise.all([
        AsyncStorage.getItem(AUTH_KEYS.USERS),
        AsyncStorage.getItem(AUTH_KEYS.ACTIVE_USER_ID),
      ]);

      let users: UserAccount[] = usersJson ? JSON.parse(usersJson) : [];

      // Khởi tạo tài khoản Demo nếu database chưa có người dùng
      if (users.length === 0) {
        users = [DEFAULT_DEMO_USER];
        await AsyncStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));
      } else {
        // Đảm bảo demo user luôn sẵn sàng
        const hasDemo = users.some((u) => u.email.toLowerCase() === DEFAULT_DEMO_USER.email.toLowerCase());
        if (!hasDemo) {
          users.unshift(DEFAULT_DEMO_USER);
          await AsyncStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));
        }
      }

      if (activeId) {
        const found = users.find((u) => u.id === activeId);
        if (found) {
          if (!found.profile.geminiApiKey && DEFAULT_USER_PROFILE.geminiApiKey) {
            found.profile.geminiApiKey = DEFAULT_USER_PROFILE.geminiApiKey;
          }
          currentSession = { user: found, isAuthenticated: true };
          this.notify();
          return currentSession;
        }
      }
    } catch (e) {
      console.warn('Auth init error:', e);
    }

    currentSession = { user: null, isAuthenticated: false };
    this.notify();
    return currentSession;
  },

  getSession(): AuthSession {
    return currentSession;
  },

  getCurrentUser(): UserAccount | null {
    return currentSession.user;
  },

  async getAllUsers(): Promise<UserAccount[]> {
    try {
      const usersJson = await AsyncStorage.getItem(AUTH_KEYS.USERS);
      return usersJson ? JSON.parse(usersJson) : [];
    } catch {
      return [];
    }
  },

  /**
   * Đăng ký tài khoản mới bằng Email & Mật khẩu
   */
  async register(
    name: string,
    email: string,
    password: string,
    customProfile?: Partial<UserProfile>
  ): Promise<{ success: boolean; error?: string; user?: UserAccount }> {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim() || 'Người dùng CaloVision';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      return { success: false, error: 'Vui lòng nhập địa chỉ email hợp lệ.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự.' };
    }

    // 1. Thử gửi đăng ký tới Backend nếu có
    try {
      const apiRes = await api.auth.register(trimmedName, trimmedEmail, password);
      if (apiRes.success && apiRes.data?.user) {
        const backendUser = apiRes.data.user;
        const userAccount: UserAccount = {
          id: backendUser.id,
          email: backendUser.email,
          name: backendUser.name,
          authProvider: 'email',
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmedName)}&background=10b981&color=fff&bold=true`,
          profile: {
            ...DEFAULT_USER_PROFILE,
            ...backendUser.profile,
            ...customProfile,
          },
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        };

        await AsyncStorage.setItem(AUTH_KEYS.ACTIVE_USER_ID, userAccount.id);
        currentSession = { user: userAccount, isAuthenticated: true };
        this.notify();
        return { success: true, user: userAccount };
      } else if (apiRes.message && !apiRes.success) {
        return { success: false, error: apiRes.message };
      }
    } catch (err) {
      console.warn('Backend register failed, using local storage mode:', err);
    }

    // 2. Lưu trữ cục bộ (Local Storage Mode)
    const users = await this.getAllUsers();
    const exists = users.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (exists) {
      return { success: false, error: 'Email này đã được đăng ký tài khoản.' };
    }

    // Tạo thông số dinh dưỡng cơ bản
    const baseProfile: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      name: trimmedName,
      ...customProfile,
    };

    const calculatedTargets = calculateNutritionTargets(
      baseProfile.gender,
      baseProfile.weight,
      baseProfile.height,
      baseProfile.age,
      baseProfile.activityLevel,
      baseProfile.goal
    );

    const initialProfile: UserProfile = {
      ...baseProfile,
      ...calculatedTargets,
      name: trimmedName,
    };

    const newUser: UserAccount = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      email: trimmedEmail,
      name: trimmedName,
      password: password,
      authProvider: 'email',
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmedName)}&background=10b981&color=fff&bold=true`,
      profile: initialProfile,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    users.push(newUser);

    await Promise.all([
      AsyncStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users)),
      AsyncStorage.setItem(AUTH_KEYS.ACTIVE_USER_ID, newUser.id),
    ]);

    currentSession = { user: newUser, isAuthenticated: true };
    this.notify();
    return { success: true, user: newUser };
  },

  /**
   * Đăng nhập bằng Email & Mật khẩu
   */
  async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: UserAccount }> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      return { success: false, error: 'Vui lòng điền đầy đủ Email và Mật khẩu.' };
    }

    // 1. Thử gửi đăng nhập tới Backend nếu có
    try {
      const apiRes = await api.auth.login(trimmedEmail, password);
      if (apiRes.success && apiRes.data?.user) {
        const backendUser = apiRes.data.user;
        const userAccount: UserAccount = {
          id: backendUser.id,
          email: backendUser.email,
          name: backendUser.name,
          authProvider: 'email',
          avatarUrl: backendUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(backendUser.name)}&background=10b981&color=fff&bold=true`,
          profile: {
            ...DEFAULT_USER_PROFILE,
            ...backendUser.profile,
          },
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        };

        await AsyncStorage.setItem(AUTH_KEYS.ACTIVE_USER_ID, userAccount.id);
        currentSession = { user: userAccount, isAuthenticated: true };
        this.notify();
        return { success: true, user: userAccount };
      } else if (apiRes.message && !apiRes.success) {
        return { success: false, error: apiRes.message };
      }
    } catch (err) {
      console.warn('Backend login failed, using local storage mode:', err);
    }

    // 2. Tìm kiếm trong Local Database
    const users = await this.getAllUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === trimmedEmail && u.password === password
    );

    if (!user) {
      return { success: false, error: 'Email hoặc mật khẩu không chính xác.' };
    }

    user.lastLoginAt = Date.now();
    await Promise.all([
      AsyncStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users)),
      AsyncStorage.setItem(AUTH_KEYS.ACTIVE_USER_ID, user.id),
    ]);

    currentSession = { user, isAuthenticated: true };
    this.notify();
    return { success: true, user };
  },

  /**
   * Đăng nhập hoặc Tạo tài khoản qua Google OAuth
   */
  async loginWithGoogle(googleData?: {
    email: string;
    name: string;
    avatarUrl?: string;
    googleId?: string;
    idToken?: string;
  }): Promise<{ success: boolean; error?: string; user?: UserAccount }> {
    const email = (googleData?.email || 'user@gmail.com').trim().toLowerCase();
    const name = (googleData?.name || 'Google User').trim();
    const avatarUrl =
      googleData?.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ea4335&color=fff&bold=true`;

    try {
      const apiRes = await api.auth.googleLogin({
        email,
        name,
        avatarUrl,
        googleId: googleData?.googleId,
      });
      if (apiRes.success && apiRes.data?.user) {
        const backendUser = apiRes.data.user;
        const userAccount: UserAccount = {
          id: backendUser.id,
          email: backendUser.email,
          name: backendUser.name,
          authProvider: 'google',
          avatarUrl: backendUser.avatarUrl || avatarUrl,
          googleId: googleData?.googleId,
          profile: {
            ...DEFAULT_USER_PROFILE,
            ...backendUser.profile,
          },
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        };

        await AsyncStorage.setItem(AUTH_KEYS.ACTIVE_USER_ID, userAccount.id);
        currentSession = { user: userAccount, isAuthenticated: true };
        this.notify();
        return { success: true, user: userAccount };
      }
    } catch (err) {
      console.warn('Backend Google login failed, using local storage mode:', err);
    }

    const users = await this.getAllUsers();
    let existingUser = users.find((u) => u.email.toLowerCase() === email);

    if (existingUser) {
      existingUser.authProvider = 'google';
      existingUser.name = name || existingUser.name;
      existingUser.avatarUrl = avatarUrl || existingUser.avatarUrl;
      existingUser.googleId = googleData?.googleId || existingUser.googleId;
      existingUser.lastLoginAt = Date.now();

      await Promise.all([
        AsyncStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users)),
        AsyncStorage.setItem(AUTH_KEYS.ACTIVE_USER_ID, existingUser.id),
      ]);

      currentSession = { user: existingUser, isAuthenticated: true };
      this.notify();
      return { success: true, user: existingUser };
    }

    // Tự động tạo tài khoản Google mới
    const initialProfile: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      name: name,
      hasCompletedOnboarding: false,
    };

    const newUser: UserAccount = {
      id: 'google_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      email: email,
      name: name,
      authProvider: 'google',
      avatarUrl: avatarUrl,
      googleId: googleData?.googleId,
      profile: initialProfile,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    users.push(newUser);

    await Promise.all([
      AsyncStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users)),
      AsyncStorage.setItem(AUTH_KEYS.ACTIVE_USER_ID, newUser.id),
    ]);

    currentSession = { user: newUser, isAuthenticated: true };
    this.notify();
    return { success: true, user: newUser };
  },

  /**
   * Đăng nhập với tư cách Khách trải nghiệm
   */
  async guestLogin(): Promise<UserAccount> {
    const guestUser: UserAccount = {
      id: 'guest_' + Date.now(),
      email: 'khach@calovision.local',
      name: 'Khách Trải Nghiệm',
      authProvider: 'guest',
      avatarUrl: 'https://ui-avatars.com/api/?name=Guest&background=64748b&color=fff&bold=true',
      profile: { ...DEFAULT_USER_PROFILE, name: 'Khách Trải Nghiệm' },
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    const users = await this.getAllUsers();
    users.push(guestUser);

    await Promise.all([
      AsyncStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users)),
      AsyncStorage.setItem(AUTH_KEYS.ACTIVE_USER_ID, guestUser.id),
    ]);

    currentSession = { user: guestUser, isAuthenticated: true };
    this.notify();
    return guestUser;
  },

  /**
   * Khôi phục / Đặt lại mật khẩu khi quên mật khẩu
   */
  async resetPassword(
    email: string,
    newPassword?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Vui lòng nhập địa chỉ email hợp lệ.' };
    }

    const users = await this.getAllUsers();
    const userIndex = users.findIndex((u) => u.email.toLowerCase() === trimmedEmail);

    if (userIndex === -1) {
      return { success: false, error: 'Không tìm thấy tài khoản tương ứng với Email này.' };
    }

    const targetUser = users[userIndex];
    if (targetUser.authProvider === 'google') {
      return {
        success: false,
        error: 'Tài khoản này được liên kết qua Google. Vui lòng bấm Đăng nhập bằng Google.',
      };
    }

    const updatedPassword = newPassword?.trim() || '123456';
    targetUser.password = updatedPassword;
    users[userIndex] = targetUser;

    await AsyncStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));

    return {
      success: true,
      message: `Đã đặt lại mật khẩu mới cho ${targetUser.email}. Bạn có thể đăng nhập ngay với mật khẩu mới.`,
    };
  },

  /**
   * Đổi mật khẩu cho người dùng hiện tại
   */
  async changePassword(
    oldPass: string,
    newPass: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!currentSession.user) {
      return { success: false, error: 'Chưa đăng nhập.' };
    }

    if (currentSession.user.authProvider === 'google') {
      return {
        success: false,
        error: 'Tài khoản Google được quản lý bảo mật bởi Google.',
      };
    }

    if (currentSession.user.password && currentSession.user.password !== oldPass) {
      return { success: false, error: 'Mật khẩu hiện tại không đúng.' };
    }

    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' };
    }

    const users = await this.getAllUsers();
    const idx = users.findIndex((u) => u.id === currentSession.user?.id);
    if (idx !== -1) {
      users[idx].password = newPass;
      await AsyncStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));
      if (currentSession.user) {
        currentSession.user.password = newPass;
      }
      this.notify();
      return { success: true, message: 'Đổi mật khẩu thành công!' };
    }

    return { success: false, error: 'Không thể cập nhật mật khẩu.' };
  },

  /**
   * Đăng xuất tài khoản
   */
  async logout(): Promise<void> {
    try {
      await api.auth.logout();
    } catch (e) {
      console.warn('API logout error:', e);
    }
    await AsyncStorage.removeItem(AUTH_KEYS.ACTIVE_USER_ID);
    currentSession = { user: null, isAuthenticated: false };
    this.notify();
  },

  /**
   * Cập nhật thông tin hồ sơ người dùng
   */
  async updateProfile(updated: Partial<UserProfile>): Promise<void> {
    if (!currentSession.user) return;

    try {
      await api.auth.updateProfile(updated);
    } catch (e) {
      console.warn('Backend updateProfile error:', e);
    }

    const newProfile = { ...currentSession.user.profile, ...updated };
    const updatedUser: UserAccount = {
      ...currentSession.user,
      name: newProfile.name || currentSession.user.name,
      profile: newProfile,
    };

    currentSession = { user: updatedUser, isAuthenticated: true };

    const users = await this.getAllUsers();
    const nextUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));

    await AsyncStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(nextUsers));
    this.notify();
  },

  subscribe(listener: (session: AuthSession) => void): () => void {
    authListeners.push(listener);
    return () => {
      authListeners = authListeners.filter((l) => l !== listener);
    };
  },

  notify() {
    authListeners.forEach((l) => l(currentSession));
  },
};
