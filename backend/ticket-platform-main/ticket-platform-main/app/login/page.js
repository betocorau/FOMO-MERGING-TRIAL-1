'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/my-tickets';

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
    } else {
      router.push(redirect);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setStatus('loading');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/my-tickets`,
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  }

  if (status === 'sent') {
    return (
      <AuthShell>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 22 }}>
            Check your email
          </h2>
          <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6 }}>
            We sent a reset link to <strong style={{ color: '#ffffff' }}>{email}</strong>.
          </p>
          <button
            onClick={() => { setMode('login'); setStatus(null); }}
            style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }}
          >
            ← Back to sign in
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 22, marginBottom: 4 }}>
        {mode === 'login' ? 'Sign in' : 'Reset password'}
      </h1>
      <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 24 }}>
        {mode === 'login' ? (
          <>Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: '#CC2222', textDecoration: 'none' }}>Sign up</Link>
          </>
        ) : 'Enter your email to receive a reset link.'}
      </p>

      {status === 'error' && (
        <div style={{ marginBottom: 16, background: 'rgba(204,34,34,0.12)', border: '1px solid rgba(204,34,34,0.3)', padding: '12px 16px', fontFamily: 'Actay, sans-serif', fontSize: 13, color: '#CC2222' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={mode === 'login' ? handleLogin : handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="fomo-label">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" placeholder="you@example.com" />
        </div>

        {mode === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="fomo-label">Password</label>
              <button type="button" onClick={() => { setMode('forgot'); setStatus(null); setErrorMsg(''); }}
                style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}>
                Forgot?
              </button>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input" placeholder="••••••••" />
          </div>
        )}

        <button type="submit" disabled={status === 'loading'} className="fomo-btn-primary" style={{ marginTop: 8, width: '100%' }}>
          {status === 'loading' ? '…' : mode === 'login' ? 'Sign in' : 'Send reset link'}
        </button>
      </form>

      {mode === 'forgot' && (
        <button onClick={() => { setMode('login'); setStatus(null); setErrorMsg(''); }}
          style={{ marginTop: 16, fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center' }}>
          ← Back to sign in
        </button>
      )}
    </AuthShell>
  );
}

function AuthShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ background: '#111111', padding: 32, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <Link href="/" style={{ display: 'block', marginBottom: 32 }}>
          <Image src="/images/FOMO-LOGO-Vector.svg" alt="FOMO" width={100} height={32} style={{ height: 28, width: 'auto' }} />
        </Link>
        {children}
      </div>
    </div>
  );
}
