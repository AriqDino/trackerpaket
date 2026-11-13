import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { auth, googleProvider } from '../firebase';

interface FirebaseAuthContextValue {
  user: User | null;
  authReady: boolean;
  isSigningIn: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<User | null>;
  signOutUser: () => Promise<void>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(null);

function mapAuthErrorMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
  if (code === 'auth/popup-blocked') {
    return 'Popup login diblokir oleh browser. Izinkan popup untuk situs ini lalu coba lagi.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Gagal terhubung ke layanan autentikasi Google. Periksa koneksi internet Anda.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Domain ini belum diotorisasi di pengaturan Firebase Authentication.';
  }
  return 'Gagal masuk dengan akun Google. Silakan coba beberapa saat lagi.';
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      return credential.user;
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setAuthError(mapAuthErrorMessage(err));
      }
      return null;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  return (
    <FirebaseAuthContext.Provider
      value={{
        user,
        authReady,
        isSigningIn,
        authError,
        clearAuthError,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth(): FirebaseAuthContextValue {
  const ctx = useContext(FirebaseAuthContext);
  if (!ctx) {
    throw new Error('useFirebaseAuth harus digunakan di dalam FirebaseProvider.');
  }
  return ctx;
}
