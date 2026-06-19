'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async (email, password) => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load and sync user profile from Prisma database (Firebase flow)
  const syncUserProfile = async (firebaseUser) => {
    if (!firebaseUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
        }),
      });

      if (res.ok) {
        const dbUser = await res.json();
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || dbUser.name || '',
          photoURL: firebaseUser.photoURL || '',
          ...dbUser,
        });
      } else {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
        });
      }
    } catch (err) {
      console.error('Error syncing user profile:', err);
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || '',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    // Try to refresh via custom session first
    try {
      const res = await fetch('/api/auth/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.valid) {
          setUser({
            uid: data.user.id,
            email: data.user.email,
            displayName: data.user.name || '',
            ...data.user,
          });
          return;
        }
      }
    } catch (e) {
      console.error('Error refreshing custom session:', e);
    }

    // Fallback to Firebase
    if (auth.currentUser) {
      await syncUserProfile(auth.currentUser);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser({
          uid: data.user.id,
          email: data.user.email,
          displayName: data.user.name || '',
          ...data.user,
        });
        setLoading(false);
        return { success: true };
      } else {
        setLoading(false);
        return { success: false, error: data.error, passwordNotSet: data.passwordNotSet };
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoading(false);
      return { success: false, error: 'A network error occurred.' };
    }
  };

  useEffect(() => {
    let active = true;

    async function checkCustomSession() {
      try {
        const res = await fetch('/api/auth/verify-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.valid && active) {
            setUser({
              uid: data.user.id,
              email: data.user.email,
              displayName: data.user.name || '',
              ...data.user,
            });
            setLoading(false);
            return true;
          }
        }
      } catch (e) {
        console.error('Error checking custom session:', e);
      }
      return false;
    }

    async function initAuth() {
      const isCustomValid = await checkCustomSession();
      if (isCustomValid) return () => {};

      // Fallback to Firebase onAuthStateChanged if no custom session active
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!active) return;
        setLoading(true);
        if (firebaseUser) {
          await syncUserProfile(firebaseUser);
        } else {
          setUser(null);
          setLoading(false);
        }
      });

      return unsubscribe;
    }

    let unsubPromise = initAuth();

    return () => {
      active = false;
      unsubPromise.then((unsub) => {
        if (unsub) unsub();
      });
    };
  }, []);

  const logout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Error logging out from server session:', e);
    }
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Error signing out from Firebase:', e);
    }
    setUser(null);
    setLoading(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
