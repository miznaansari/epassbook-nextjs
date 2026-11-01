'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { Mail, Lock, LogIn } from 'lucide-react';
import AuthShell, { AuthField, AuthError, AuthLoading, Divider, GoogleButton } from '@/components/auth/AuthShell';
import Button from '@/components/ui/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingState, setLoadingState] = useState(false);
  const { user, loading, login } = useAuth();
  const router = useRouter();

  const [showRetry, setShowRetry] = useState(false);

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Show manual PWA refresh triggers if auth sync hangs beyond 4 seconds
  useEffect(() => {
    let timer;
    if (loading || user) {
      timer = setTimeout(() => {
        setShowRetry(true);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [loading, user]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoadingState(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        router.push('/dashboard');
      } else {
        if (result.passwordNotSet) {
          setError('Password not set. We have sent an email with a setup link.');
        } else {
          setError(result.error || 'Invalid email or password.');
        }
        setLoadingState(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to log in. Please try again.');
      setLoadingState(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoadingState(true);

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName,
        }),
      });

      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError('Failed to sync session. Please try again.');
        setLoadingState(false);
      }
    } catch (err) {
      console.error('Google Auth Error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google Authentication failed. Please try again.');
      }
      setLoadingState(false);
    }
  };

  if (loading || user) {
    return <AuthLoading showRetry={showRetry} />;
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see where your money went this cycle."
      footer={<>New here? <Link href="/signup" className="font-semibold text-primary hover:underline">Create an account</Link></>}
    >
      <form onSubmit={handleEmailLogin} className="space-y-4" noValidate>
        <AuthField
          id="email"
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <AuthField
          id="password"
          label="Password"
          icon={Lock}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          required
        />
        <AuthError message={error} />
        <Button type="submit" size="lg" loading={loadingState} className="w-full">
          {!loadingState && <LogIn className="h-4 w-4" aria-hidden="true" />}
          Sign in
        </Button>
      </form>
      <Divider />
      <GoogleButton onClick={handleGoogleLogin} disabled={loadingState} />
    </AuthShell>
  );
}
