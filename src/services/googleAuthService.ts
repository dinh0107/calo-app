import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export interface GoogleUserInfo {
  id?: string;
  email: string;
  name: string;
  avatarUrl?: string;
  verifiedEmail?: boolean;
  idToken?: string;
  accessToken?: string;
}

const STORAGE_KEY_GOOGLE_CLIENT_ID = 'calovision_google_client_id_v1';

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

let isScriptLoaded = false;
let scriptLoadingPromise: Promise<boolean> | null = null;

export function isValidGoogleClientId(id?: string | null): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  if (trimmed.length < 15) return false;
  if (trimmed.includes('sample.apps.googleusercontent.com')) return false;
  return true;
}

export async function getActiveGoogleClientId(): Promise<string> {
  // 1. Kiểm tra AsyncStorage
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_GOOGLE_CLIENT_ID);
    if (stored && isValidGoogleClientId(stored)) {
      return stored.trim();
    }
  } catch {}

  // 2. Kiểm tra biến môi trường .env
  try {
    const envId =
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
      (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_CLIENT_ID) ||
      ((typeof window !== 'undefined' && (window as any).__GOOGLE_CLIENT_ID__) as string);
    if (envId && isValidGoogleClientId(envId)) {
      return envId.trim();
    }
  } catch {}

  return '621674066400-r42opv2odep9j0nieg5s3n5qacd7b50f.apps.googleusercontent.com';
}

export async function saveGoogleClientId(clientId: string): Promise<void> {
  try {
    if (clientId.trim()) {
      await AsyncStorage.setItem(STORAGE_KEY_GOOGLE_CLIENT_ID, clientId.trim());
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY_GOOGLE_CLIENT_ID);
    }
  } catch (e) {
    console.warn('Failed to save Google Client ID:', e);
  }
}

export async function loadGoogleGsiScript(): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  if (window.google?.accounts?.oauth2) {
    isScriptLoaded = true;
    return true;
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve) => {
    try {
      const existingScript = document.getElementById('google-gsi-client');
      if (existingScript) {
        if (window.google?.accounts?.oauth2) {
          isScriptLoaded = true;
          resolve(true);
          return;
        }
        existingScript.addEventListener('load', () => {
          isScriptLoaded = true;
          resolve(true);
        });
      }

      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        isScriptLoaded = true;
        resolve(true);
      };
      script.onerror = () => {
        console.warn('Google GSI script failed to load from CDN');
        resolve(false);
      };
      document.head.appendChild(script);

      // Fallback timeout sau 4s
      setTimeout(() => {
        if (window.google?.accounts?.oauth2) {
          isScriptLoaded = true;
          resolve(true);
        } else {
          resolve(false);
        }
      }, 4000);
    } catch (e) {
      console.warn('Error appending Google GSI script:', e);
      resolve(false);
    }
  });

  return scriptLoadingPromise;
}

export function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.warn('Failed to parse JWT token:', e);
    return null;
  }
}

/**
 * Universal Cross-Platform Google Sign-In (Web & Native iOS/Android)
 */
export async function launchGoogleOAuth(clientId?: string): Promise<GoogleUserInfo> {
  const activeClientId = clientId || (await getActiveGoogleClientId());

  if (!isValidGoogleClientId(activeClientId)) {
    throw new Error('MISSING_CLIENT_ID');
  }

  // === 1. ON WEB ENVIRONMENT ===
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    await loadGoogleGsiScript();

    if (window.google?.accounts?.oauth2) {
      return new Promise<GoogleUserInfo>((resolve, reject) => {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: activeClientId.trim(),
            scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid',
            callback: async (response: any) => {
              if (response.error) {
                if (response.error === 'popup_closed_by_user' || response.error === 'access_denied') {
                  reject(new Error('Cửa sổ đăng nhập Google đã bị đóng.'));
                } else {
                  reject(new Error(response.error_description || response.error));
                }
                return;
              }

              if (response.access_token) {
                try {
                  const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${response.access_token}` },
                  });
                  if (userinfoRes.ok) {
                    const data = await userinfoRes.json();
                    resolve({
                      id: data.sub,
                      email: data.email,
                      name: data.name || data.given_name || data.email?.split('@')[0],
                      avatarUrl: data.picture,
                      verifiedEmail: data.email_verified,
                      accessToken: response.access_token,
                    });
                    return;
                  }
                } catch (fetchErr) {
                  console.warn('Error fetching Google userinfo:', fetchErr);
                }
              }
              reject(new Error('Không nhận được thông tin người dùng từ Google.'));
            },
            error_callback: (err: any) => {
              reject(new Error(err?.message || 'Cửa sổ đăng nhập Google đã bị đóng.'));
            },
          });

          client.requestAccessToken({ prompt: 'select_account' });
        } catch (e: any) {
          reject(e);
        }
      });
    }

    return fallbackWebPopup(activeClientId);
  }

  // === 2. ON NATIVE MOBILE (iOS / Android Simulator) ===
  try {
    const redirectUri =
      AuthSession.makeRedirectUri({
        preferLocalhost: true,
      }) || 'http://localhost:8081';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      activeClientId.trim()
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token%20id_token&scope=openid%20profile%20email&nonce=${Date.now()}&prompt=select_account`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    if (result.type === 'success' && result.url) {
      const urlPart = result.url.includes('#') ? result.url.split('#')[1] : result.url.split('?')[1] || '';
      const params = new URLSearchParams(urlPart);
      const idToken = params.get('id_token');
      const accessToken = params.get('access_token');

      if (idToken) {
        const decoded = parseJwt(idToken);
        if (decoded) {
          return {
            id: decoded.sub,
            email: decoded.email,
            name: decoded.name || decoded.given_name || decoded.email.split('@')[0],
            avatarUrl: decoded.picture,
            verifiedEmail: decoded.email_verified,
            idToken,
          };
        }
      }

      if (accessToken) {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (infoRes.ok) {
          const data = await infoRes.json();
          return {
            id: data.sub,
            email: data.email,
            name: data.name || data.given_name || data.email.split('@')[0],
            avatarUrl: data.picture,
            verifiedEmail: data.email_verified,
            accessToken,
          };
        }
      }
    }
  } catch (mobileErr: any) {
    console.warn('Native Google AuthSession error:', mobileErr);
    throw new Error(mobileErr?.message || 'Không thể mở phiên đăng nhập Google.');
  }

  throw new Error('Cửa sổ đăng nhập Google đã bị đóng.');
}

function fallbackWebPopup(clientId: string): Promise<GoogleUserInfo> {
  const origin = window.location.origin.replace(/\/$/, '');
  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId.trim()
  )}&redirect_uri=${encodeURIComponent(
    origin
  )}&response_type=token%20id_token&scope=openid%20profile%20email&nonce=${Date.now()}&prompt=select_account`;

  const width = 500;
  const height = 650;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  const popup = window.open(
    oauthUrl,
    'GoogleSignIn',
    `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, width=${width}, height=${height}, top=${top}, left=${left}`
  );

  if (!popup) {
    throw new Error('Trình duyệt đã chặn popup Google. Vui lòng cho phép popup trong cài đặt.');
  }

  return new Promise<GoogleUserInfo>((resolve, reject) => {
    let resolved = false;
    const timer = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(timer);
          if (!resolved) reject(new Error('Cửa sổ đăng nhập Google đã bị đóng.'));
          return;
        }

        if (popup.location.href.indexOf(origin) === 0) {
          const hash = popup.location.hash;
          const search = popup.location.search;
          clearInterval(timer);
          resolved = true;
          popup.close();

          const params = new URLSearchParams((hash || search).replace(/^#/, '').replace(/^\?/, ''));
          const idToken = params.get('id_token');
          const accessToken = params.get('access_token');

          if (idToken) {
            const decoded = parseJwt(idToken);
            if (decoded) {
              resolve({
                id: decoded.sub,
                email: decoded.email,
                name: decoded.name || decoded.given_name || decoded.email.split('@')[0],
                avatarUrl: decoded.picture,
                idToken,
              });
              return;
            }
          }

          if (accessToken) {
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            })
              .then((res) => res.json())
              .then((data) => {
                resolve({
                  id: data.sub,
                  email: data.email,
                  name: data.name || data.given_name || data.email.split('@')[0],
                  avatarUrl: data.picture,
                  accessToken,
                });
              })
              .catch(reject);
            return;
          }

          reject(new Error('Không nhận được token từ Google.'));
        }
      } catch {}
    }, 400);
  });
}
