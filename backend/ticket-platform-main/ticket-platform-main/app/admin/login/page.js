'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function switchMode(newMode) {
    setMode(newMode);
    setErrorMsg('');
    setStatus(null);
    setForm({ email: '', password: '', confirmPassword: '' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    if (mode === 'signup' && form.password !== form.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setStatus('error');
      return;
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (error) { setErrorMsg(error.message); setStatus('error'); }
      else { router.push('/admin'); router.refresh(); }

    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) { setErrorMsg(error.message); setStatus('error'); }
      else { setStatus('check-email'); }

    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin`,
      });
      if (error) { setErrorMsg(error.message); setStatus('error'); }
      else { setStatus('reset-sent'); }
    }
  }

  if (status === 'check-email' || status === 'reset-sent') {
    return (
      <AdminAuthShell>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 20 }}>
            {status === 'reset-sent' ? 'Reset link sent' : 'Check your email'}
          </h2>
          <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.6 }}>
            We sent a link to <strong style={{ color: '#ffffff' }}>{form.email}</strong>. Check your inbox.
          </p>
          <button onClick={() => switchMode('login')}
            style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }}>
            ← Back to sign in
          </button>
        </div>
      </AdminAuthShell>
    );
  }

  return (
    <AdminAuthShell>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
          Admin Portal
        </p>
        <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          {mode === 'login' && 'Sign in to your account'}
          {mode === 'signup' && 'Create an organizer account'}
          {mode === 'forgot' && 'Reset your password'}
        </p>
      </div>

      {status === 'error' && (
        <div style={{ marginBottom: 16, background: 'rgba(204,34,34,0.12)', border: '1px solid rgba(204,34,34,0.3)', padding: '12px 16px', fontFamily: 'Actay, sans-serif', fontSize: 13, color: '#CC2222' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="fomo-label">Email</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required className="input" />
        </div>

        {mode !== 'forgot' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="fomo-label">Password</label>
              {mode === 'login' && (
                <button type="button" onClick={() => switchMode('forgot')}
                  style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Forgot?
                </button>
              )}
            </div>
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" required minLength={6} className="input" />
          </div>
        )}

        {mode === 'signup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="fomo-label">Confirm Password</label>
            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" required minLength={6} className="input" />
          </div>
        )}

        <button type="submit" disabled={status === 'loading'} className="fomo-btn-primary" style={{ marginTop: 8, width: '100%' }}>
          {status === 'loading' ? '…' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 20, fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.35)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {mode === 'login' && (
          <p>Don&apos;t have an account?{' '}
            <button onClick={() => switchMode('signup')} style={{ color: '#CC2222', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Actay, sans-serif', fontSize: 13 }}>Sign up</button>
          </p>
        )}
        {mode === 'signup' && (
          <p>Already have an account?{' '}
            <button onClick={() => switchMode('login')} style={{ color: '#CC2222', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Actay, sans-serif', fontSize: 13 }}>Sign in</button>
          </p>
        )}
        {mode === 'forgot' && (
          <button onClick={() => switchMode('login')} style={{ color: '#CC2222', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Actay, sans-serif', fontSize: 13 }}>
            ← Back to sign in
          </button>
        )}
      </div>
    </AdminAuthShell>
  );
}

function AdminAuthShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ background: '#111111', padding: 32, width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/">
            <Image src="/images/FOMO-LOGO-Vector.svg" alt="FOMO" width={80} height={28} style={{ height: 28, width: 'auto', margin: '0 auto' }} />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
