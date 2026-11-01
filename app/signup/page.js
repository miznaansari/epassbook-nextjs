'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { Mail, Lock, UserPlus } from 'lucide-react';
import AuthShell, { AuthField, AuthError, AuthLoading, Divider, GoogleButton } from '@/components/auth/AuthShell';
import Button from '@/components/ui/Button';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingState, setLoadingState] = useState(false);
  const { user, loading, login } = useAuth();
  const router = useRouter();

  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    let timer;
    if (loading || user) {
      timer = setTimeout(() => {
        setShowRetry(true);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [loading, user]);

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoadingState(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Failed to create account.');
        setLoadingState(false);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Failed to create account. Please try again.');
      setLoadingState(false);
    }
  };

  const handleGoogleSignup = async () => {
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
      title="Create your account"
      subtitle="Free forever. Start tracking in under a minute."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></>}
    >
      <form onSubmit={handleSignupSubmit} className="space-y-4" noValidate>
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          required
        />
        <AuthField
          id="confirm-password"
          label="Confirm password"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Type it again"
          required
        />
        <AuthError message={error} />
        <Button type="submit" variant="secondary" size="lg" loading={loadingState} className="w-full">
          {!loadingState && <UserPlus className="h-4 w-4" aria-hidden="true" />}
          Create account
        </Button>
      </form>
      <Divider />
      <GoogleButton onClick={handleGoogleSignup} disabled={loadingState}>Sign up with Google</GoogleButton>
    </AuthShell>
  );
}
