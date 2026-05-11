'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CustomerHeader({ backLink }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header style={{ background: '#000000', borderBottom: '1px solid #222222' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <Image
            src="/images/FOMO-LOGO-Vector.svg"
            alt="FOMO"
            width={80}
            height={28}
            priority
            style={{ height: 28, width: 'auto' }}
          />
        </Link>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {backLink && (
            <Link
              href={backLink.href}
              style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#ffffff'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
            >
              {backLink.label}
            </Link>
          )}

          {ready && (
            user ? (
              <>
                <Link
                  href="/my-tickets"
                  style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em', textDecoration: 'none' }}
                >
                  My Tickets
                </Link>
                <button
                  onClick={handleSignOut}
                  style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em', textDecoration: 'none' }}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, background: '#CC2222', color: '#ffffff', padding: '10px 22px', borderRadius: 100, letterSpacing: '0.05em', textDecoration: 'none', transition: 'background 0.2s' }}
                >
                  Sign up
                </Link>
              </>
            )
          )}

          <Link
            href="/admin"
            style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
