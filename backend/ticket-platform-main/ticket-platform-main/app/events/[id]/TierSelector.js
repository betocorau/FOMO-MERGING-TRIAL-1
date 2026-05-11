'use client';

import { useState, useEffect } from 'react';
import CheckoutForm from './CheckoutForm';

function getTimeLeft(deadline) {
  const diff = new Date(deadline) - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function checkEarlyBird(tier) {
  if (!tier.early_bird_price) return false;
  const deadlineOk = !tier.early_bird_deadline || new Date(tier.early_bird_deadline) > new Date();
  const qtyOk = !tier.early_bird_quantity || (tier.early_bird_sold ?? 0) < tier.early_bird_quantity;
  return deadlineOk && qtyOk;
}

function Countdown({ deadline }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(deadline));

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!timeLeft) return <span style={{ color: '#CC2222' }}>Ended</span>;
  const { days, hours, minutes, seconds } = timeLeft;
  return (
    <span style={{ fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
      {days > 0 && `${days}d `}{String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s
    </span>
  );
}

function fmtTierPrice(price, currency) {
  const n = parseFloat(price);
  if (n === 0) return 'Free';
  if (currency === 'CRC') return `₡${Math.round(n).toLocaleString('es-CR')}`;
  return `$${n.toFixed(2)}`;
}

export default function TierSelector({ event, tiers }) {
  const [selectedTier, setSelectedTier] = useState(null);
  const currency = event.currency ?? 'USD';

  const allSoldOut = tiers.every((t) => t.quantity_remaining === 0);

  if (allSoldOut) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <p style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#CC2222', fontSize: 20 }}>Sold Out</p>
        <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 4 }}>All ticket tiers are sold out.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Select a Tier</p>

      {tiers.map((tier) => {
        const isSoldOut = tier.quantity_remaining === 0;
        const isSelected = selectedTier?.id === tier.id;
        const isEarlyBird = checkEarlyBird(tier);
        const displayPrice = isEarlyBird ? tier.early_bird_price : tier.price;
        const benefits = Array.isArray(tier.benefits) ? tier.benefits : [];
        const ebRemaining = tier.early_bird_quantity
          ? tier.early_bird_quantity - (tier.early_bird_sold ?? 0)
          : null;

        return (
          <div
            key={tier.id}
            onClick={() => !isSoldOut && setSelectedTier(isSelected ? null : {
              ...tier,
              effective_price: displayPrice,
              is_early_bird: isEarlyBird,
            })}
            style={{
              border: isSelected ? '2px solid #CC2222' : '2px solid #333333',
              background: isSelected ? 'rgba(204,34,34,0.06)' : '#0d0d0d',
              cursor: isSoldOut ? 'default' : 'pointer',
              opacity: isSoldOut ? 0.45 : 1,
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            {/* Color stripe */}
            <div style={{ height: 3, background: isSelected ? '#CC2222' : '#333333' }} />

            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 14 }}>
                    {tier.name}
                  </span>
                  {isEarlyBird && (
                    <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', padding: '2px 8px' }}>
                      ⚡ Early Bird
                    </span>
                  )}
                  {isSoldOut && (
                    <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#CC2222', background: 'rgba(204,34,34,0.1)', border: '1px solid rgba(204,34,34,0.3)', padding: '2px 8px' }}>
                      Sold Out
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {isEarlyBird ? (
                    <>
                      <span style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 22, display: 'block' }}>
                        {fmtTierPrice(tier.early_bird_price, currency)}
                      </span>
                      <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.25)', textDecoration: 'line-through', display: 'block' }}>
                        {fmtTierPrice(tier.price, currency)}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 22 }}>
                      {fmtTierPrice(tier.price, currency)}
                    </span>
                  )}
                </div>
              </div>

              {tier.description && (
                <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 8, lineHeight: 1.5 }}>{tier.description}</p>
              )}

              {isEarlyBird && tier.early_bird_deadline && (
                <div style={{ marginBottom: 8, fontFamily: 'Actay, sans-serif', fontSize: 12, color: '#fbbf24', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span>Ends in</span>
                  <Countdown deadline={tier.early_bird_deadline} />
                </div>
              )}

              {benefits.length > 0 && (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12, listStyle: 'none', padding: 0 }}>
                  {benefits.map((b, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                      <svg width="12" height="12" fill="none" stroke={isSelected ? '#CC2222' : 'rgba(255,255,255,0.3)'} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
                  {(() => {
                    if (isSoldOut) return 'No tickets left';
                    const showCount = tier.show_tickets_remaining ?? event.show_tickets_remaining ?? true;
                    if (!showCount) return 'Available';
                    if (isEarlyBird && ebRemaining != null) return `${ebRemaining} early bird left`;
                    return `${tier.quantity_remaining} left`;
                  })()}
                </span>
                {!isSoldOut && (
                  <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: isSelected ? '#CC2222' : 'rgba(255,255,255,0.4)', border: `1px solid ${isSelected ? '#CC2222' : '#444444'}`, padding: '5px 12px' }}>
                    {isSelected ? '✓ Selected' : 'Select'}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {selectedTier && (
        <div style={{ paddingTop: 16, borderTop: '1px solid #222222' }}>
          <CheckoutForm event={event} selectedTier={selectedTier} />
        </div>
      )}
    </div>
  );
}
