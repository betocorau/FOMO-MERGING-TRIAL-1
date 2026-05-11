import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import CheckoutForm from './CheckoutForm';
import TierSelector from './TierSelector';
import CustomerHeader from '@/app/components/CustomerHeader';

export const revalidate = 0;

async function getEvent(id) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtPrice(price, currency) {
  const n = parseFloat(price);
  if (n === 0) return 'Free';
  if (currency === 'CRC') return `₡${Math.round(n).toLocaleString('es-CR')}`;
  return `$${n.toFixed(2)}`;
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function getTiers(eventId) {
  const { data } = await supabase
    .from('ticket_tiers')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('price', { ascending: true });
  return data ?? [];
}

export default async function EventPage({ params }) {
  const { id } = await params;
  const [event, tiers] = await Promise.all([getEvent(id), getTiers(id)]);

  if (!event) notFound();

  const hasTiers = tiers.length > 0;
  const isSoldOut = hasTiers
    ? tiers.every((t) => t.quantity_remaining === 0)
    : event.tickets_remaining === 0;

  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', flexDirection: 'column' }}>
      <CustomerHeader backLink={{ href: '/', label: '← All Events' }} />

      <main style={{ flex: 1, width: '90%', maxWidth: 1080, margin: '0 auto', padding: '48px 0 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 40 }}>

          {/* Info column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Date badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#111111', border: '1px solid #333333', padding: '8px 16px', alignSelf: 'flex-start' }}>
              <CalendarIcon />
              <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
                {formatDate(event.date)} · {formatTime(event.date)}
              </span>
            </div>

            {/* Title */}
            <h1 style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 'clamp(28px, 5vw, 56px)', lineHeight: 1, margin: 0 }}>
              {event.title}
            </h1>

            {/* Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <MetaRow icon={<LocationIcon />} text={event.location} />
              <MetaRow icon={<TicketIcon />} text={
                isSoldOut ? <span style={{ color: '#CC2222' }}>Sold out</span>
                : event.show_tickets_remaining !== false
                  ? `${event.tickets_remaining} of ${event.total_tickets} tickets remaining`
                  : 'Tickets available'
              } />
              <MetaRow icon={<PriceIcon />} text={
                <strong style={{ color: '#ffffff' }}>
                  {event.price === 0 || event.price === '0.00' ? 'Free' : `${fmtPrice(event.price, event.currency)} per ticket`}
                </strong>
              } />
            </div>

            <div style={{ borderTop: '1px solid #222222' }} />

            {/* Description */}
            {event.description && (
              <div>
                <h2 style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 20, marginBottom: 12 }}>
                  About this event
                </h2>
                <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, whiteSpace: 'pre-line', fontSize: 15 }}>
                  {event.description}
                </p>
              </div>
            )}
          </div>

          {/* Checkout card */}
          <div>
            <div style={{ background: '#111111', border: '3px solid #ffffff', padding: 24, position: 'sticky', top: 24 }}>
              {hasTiers ? (
                <TierSelector event={event} tiers={tiers} />
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
                    <span style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', fontSize: 32, color: '#ffffff' }}>
                      {fmtPrice(event.price, event.currency)}
                    </span>
                    {event.price > 0 && (
                      <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>per ticket</span>
                    )}
                  </div>
                  {isSoldOut ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <p style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#CC2222', fontSize: 20 }}>Sold Out</p>
                      <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 4 }}>No tickets available</p>
                    </div>
                  ) : (
                    <CheckoutForm event={event} />
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function MetaRow({ icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, background: '#111111', border: '1px solid #333333', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{text}</span>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.5)" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.5)" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.5)" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}

function PriceIcon() {
  return (
    <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.5)" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
