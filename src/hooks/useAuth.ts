import { useState, useEffect, useCallback } from 'react';
import type { AuthSession, UserAccount } from '../types/auth';
import type { UserProfile } from '../types/food';
import { authService } from '../services/authService';

export function useAuth() {
  const [session, setSession] = useState<AuthSession>(() => authService.getSession());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    authService.init().then((initial) => {
      setSession(initial);
      setIsLoading(false);
    });

    const unsubscribe = authService.subscribe((updated) => {
      setSession(updated);
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    return await authService.login(email, password);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, customProfile?: Partial<UserProfile>) => {
      return await authService.register(name, email, password, customProfile);
    },
    []
  );

  const guestLogin = useCallback(async () => {
    return await authService.guestLogin();
  }, []);

  const loginWithGoogle = useCallback(
    async (googleData?: { email: string; name: string; avatarUrl?: string }) => {
      return await authService.loginWithGoogle(googleData);
    },
    []
  );

  const resetPassword = useCallback(async (email: string, newPassword?: string) => {
    return await authService.resetPassword(email, newPassword);
  }, []);

  const changePassword = useCallback(async (oldPass: string, newPass: string) => {
    return await authService.changePassword(oldPass, newPass);
  }, []);

  const logout = useCallback(async () => {
    return await authService.logout();
  }, []);

  const updateProfile = useCallback(async (partial: Partial<UserProfile>) => {
    return await authService.updateProfile(partial);
  }, []);

  return {
    session,
    user: session.user,
    isAuthenticated: session.isAuthenticated,
    isLoading,
    login,
    register,
    loginWithGoogle,
    guestLogin,
    resetPassword,
    changePassword,
    logout,
    updateProfile,
  };
}

