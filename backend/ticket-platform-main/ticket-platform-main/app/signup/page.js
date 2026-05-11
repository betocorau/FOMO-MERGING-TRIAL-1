'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { first_name: form.firstName, last_name: form.lastName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/my-tickets`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
    } else {
      setStatus('confirm');
    }
  }

  if (status === 'confirm') {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ background: '#111111', padding: 40, width: '100%', maxWidth: 380, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(204,34,34,0.12)', border: '2px solid #CC2222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" fill="none" stroke="#CC2222" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 22 }}>
            Check your email
          </h2>
          <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6 }}>
            We sent a confirmation link to <strong style={{ color: '#ffffff' }}>{form.email}</strong>. Click it to activate your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ background: '#111111', padding: 32, width: '100%', maxWidth: 400 }}>
        <Link href="/" style={{ display: 'block', marginBottom: 32 }}>
          <Image src="/images/FOMO-LOGO-Vector.svg" alt="FOMO" width={100} height={32} style={{ height: 28, width: 'auto' }} />
        </Link>

        <h1 style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 22, marginBottom: 4 }}>
          Create an account
        </h1>
        <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 24 }}>
          Already have one?{' '}
          <Link href="/login" style={{ color: '#CC2222', textDecoration: 'none' }}>Sign in</Link>
        </p>

        {status === 'error' && (
          <div style={{ marginBottom: 16, background: 'rgba(204,34,34,0.12)', border: '1px solid rgba(204,34,34,0.3)', padding: '12px 16px', fontFamily: 'Actay, sans-serif', fontSize: 13, color: '#CC2222' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="fomo-label">First name <span style={{ color: '#CC2222' }}>*</span></label>
              <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required className="input" placeholder="Jane" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="fomo-label">Last name <span style={{ color: '#CC2222' }}>*</span></label>
              <input type="text" name="lastName" value={form.lastName} onChange={handleChange} required className="input" placeholder="Smith" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="fomo-label">Email <span style={{ color: '#CC2222' }}>*</span></label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required className="input" placeholder="you@example.com" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="fomo-label">Password <span style={{ color: '#CC2222' }}>*</span></label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} className="input" placeholder="At least 6 characters" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="fomo-label">Confirm password <span style={{ color: '#CC2222' }}>*</span></label>
            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required className="input" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={status === 'loading'} className="fomo-btn-primary" style={{ marginTop: 8, width: '100%' }}>
            {status === 'loading' ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
