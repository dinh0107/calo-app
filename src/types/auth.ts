import type { UserProfile } from './food';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  password?: string;
  authProvider?: 'email' | 'google' | 'guest';
  avatarUrl?: string;
  googleId?: string;
  profile: UserProfile;
  createdAt: number;
  lastLoginAt?: number;
}

export interface AuthSession {
  user: UserAccount | null;
  isAuthenticated: boolean;
}


