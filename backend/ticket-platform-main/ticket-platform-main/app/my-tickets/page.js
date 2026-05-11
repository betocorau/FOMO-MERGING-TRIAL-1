'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MyTicketsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState(null);
  const [resentId, setResentId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUser(user);

      const { data } = await supabase
        .from('orders')
        .select('*, events(*), tickets(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setOrders(data ?? []);
      setLoading(false);
    });
  }, [router]);

  async function resendTicket(orderId) {
    setResendingId(orderId);
    await fetch('/api/send-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    setResendingId(null);
    setResentId(orderId);
    setTimeout(() => setResentId(null), 3000);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.3)', fontSize: 14, letterSpacing: '0.08em' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: '#000000', borderBottom: '1px solid #222222' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/">
            <Image src="/images/FOMO-LOGO-Vector.svg" alt="FOMO" width={80} height={28} style={{ height: 28, width: 'auto' }} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'none' }}>{user?.email}</span>
            <button onClick={handleSignOut} style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 800, width: '90%', margin: '0 auto', padding: '48px 0 80px' }}>

        {/* Section title */}
        <div style={{ marginBottom: 40 }}>
          <span style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', background: '#CC2222', padding: '8px 20px', fontSize: 20, lineHeight: 1, display: 'inline-block' }}>
            MY TICKETS
          </span>
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.35)', fontSize: 16, letterSpacing: '0.05em' }}>No tickets yet.</p>
            <Link href="/" style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', background: '#CC2222', color: '#ffffff', padding: '12px 28px', borderRadius: 100, textDecoration: 'none' }}>
              Browse Events
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} resendingId={resendingId} resentId={resentId} onResend={resendTicket} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function OrderCard({ order, resendingId, resentId, onResend }) {
  const event = order.events;
  const tickets = order.tickets ?? [];

  return (
    <div style={{ border: '3px solid #222222', background: '#111111' }}>
      {/* Event header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #222222', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 16, margin: 0 }}>
            {event?.title ?? 'Event'}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 4 }}>
            {event?.date && (
              <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>
                {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}
                {new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            {event?.location && (
              <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
                {event.location}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onResend(order.id)}
          disabled={resendingId === order.id}
          style={{
            fontFamily: 'Actay, sans-serif', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: resentId === order.id ? '#CC2222' : 'rgba(255,255,255,0.5)',
            background: 'none', border: '1px solid #333333', padding: '8px 16px', cursor: 'pointer', flexShrink: 0, transition: 'color 0.2s, border-color 0.2s',
            opacity: resendingId === order.id ? 0.5 : 1,
          }}
        >
          {resendingId === order.id ? 'Sending…' : resentId === order.id ? '✓ Sent' : 'Email PDF'}
        </button>
      </div>

      {/* Tickets */}
      <div>
        {tickets.map((ticket) => (
          <TicketRow key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}

function TicketRow({ ticket }) {
  return (
    <div style={{ padding: '20px', borderBottom: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <QRCodeImg code={ticket.ticket_code} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            Ticket code
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#ffffff', letterSpacing: '0.08em', margin: 0 }}>
            {ticket.ticket_code}
          </p>
          <div style={{ marginTop: 12 }}>
            {ticket.is_used ? (
              <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: '#CC2222', background: 'rgba(204,34,34,0.1)', border: '1px solid rgba(204,34,34,0.3)', padding: '4px 10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Used
              </span>
            ) : (
              <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', padding: '4px 10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Valid
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QRCodeImg({ code }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    import('qrcode').then((mod) => {
      const QRCode = mod.default;
      QRCode.toDataURL(code, { width: 120, margin: 1 }).then(setSrc);
    });
  }, [code]);

  if (!src) {
    return <div style={{ width: 120, height: 120, flexShrink: 0, background: '#1a1a1a' }} />;
  }
  return <img src={src} alt="QR code" style={{ width: 120, height: 120, flexShrink: 0, border: '2px solid #333333' }} />;
}
