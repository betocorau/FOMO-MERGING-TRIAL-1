'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const DEFAULT_EXCHANGE_RATE = parseFloat(process.env.NEXT_PUBLIC_USD_TO_CRC_RATE ?? '515');

const emptyForm = {
  firstName: '',
  lastName: '',
  idNumber: '',
  email: '',
  confirmEmail: '',
  quantity: 1,
};

function generateRef() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function formatPhone(n) {
  const d = n.replace(/\D/g, '');
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4)}` : n;
}

const label = { fontFamily: 'Actay, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, display: 'block' };

export default function CheckoutForm({ event, selectedTier }) {
  const [form, setForm] = useState(emptyForm);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [step, setStep] = useState('info');
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountStatus, setDiscountStatus] = useState(null);
  const [discountError, setDiscountError] = useState('');

  const [sinpeRef] = useState(() => generateRef());
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [sinpeNumber, setSinpeNumber] = useState('');
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);

  useEffect(() => {
    fetch('/api/sinpe-config')
      .then((r) => r.json())
      .then((d) => {
        if (d.sinpeNumber) setSinpeNumber(d.sinpeNumber);
        if (d.exchangeRate) setExchangeRate(d.exchangeRate);
      })
      .catch(() => {});
  }, []);

  const currency = event.currency ?? 'USD';
  const isCRC = currency === 'CRC';
  const requireId = selectedTier
    ? (selectedTier.require_id ?? event.require_id ?? true)
    : (event.require_id ?? true);
  const fmtAmt = (n) => isCRC
    ? `₡${Math.round(n).toLocaleString('es-CR')}`
    : `$${parseFloat(n).toFixed(2)}`;

  const price = selectedTier ? parseFloat(selectedTier.effective_price ?? selectedTier.price) : parseFloat(event.price);
  const maxQty = selectedTier ? selectedTier.quantity_remaining : event.tickets_remaining;
  const baseTotal = price * form.quantity;
  const discountAmount = appliedDiscount?.amount ?? 0;
  const finalTotal = Math.max(0, baseTotal - discountAmount);
  const total = finalTotal.toFixed(2);
  const isFree = finalTotal === 0;
  const crcAmount = isCRC ? Math.round(finalTotal) : Math.round(finalTotal * exchangeRate);
  const emailMismatch = form.confirmEmail && form.confirmEmail !== form.email;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setLoggedInUser(user);
      const meta = user.user_metadata ?? {};
      setForm((prev) => ({
        ...prev,
        firstName: meta.first_name ?? '',
        lastName: meta.last_name ?? '',
        email: user.email ?? '',
        confirmEmail: user.email ?? '',
      }));
    });
  }, []);

  useEffect(() => {
    if (step !== 'payment' || qrDataUrl) return;
    import('qrcode').then((QRCode) => {
      const text = `SINPE Movil\nNum: ${formatPhone(sinpeNumber)}\nMonto: CRC ${crcAmount.toLocaleString('es-CR')}\nRef: ${sinpeRef}`;
      QRCode.default.toDataURL(text, { width: 200, margin: 2 }).then(setQrDataUrl);
    });
  }, [step, qrDataUrl, crcAmount, sinpeRef, sinpeNumber]);

  function handleChange(e) {
    const value = e.target.name === 'quantity' ? parseInt(e.target.value, 10) : e.target.value;
    setForm((prev) => ({ ...prev, [e.target.name]: value }));
  }

  async function applyDiscount() {
    if (!discountInput.trim()) return;
    setDiscountStatus('loading');
    setDiscountError('');
    const res = await fetch('/api/validate-discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: discountInput, eventId: event.id, subtotal: baseTotal }),
    });
    const data = await res.json();
    if (data.valid) {
      setAppliedDiscount(data);
      setDiscountStatus('valid');
    } else {
      setAppliedDiscount(null);
      setDiscountStatus('invalid');
      setDiscountError(data.error);
    }
  }

  const completeOrder = useCallback(async () => {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        event_id: event.id,
        buyer_name: `${form.firstName} ${form.lastName}`,
        buyer_email: form.email,
        first_name: form.firstName,
        last_name: form.lastName,
        id_number: form.idNumber,
        quantity: form.quantity,
        total_price: parseFloat(total),
        user_id: loggedInUser?.id ?? null,
        tier_id: selectedTier?.id ?? null,
        tier_name: selectedTier?.name ?? null,
        discount_code_id: appliedDiscount?.codeId ?? null,
        discount_code: appliedDiscount?.code ?? null,
        discount_amount: appliedDiscount?.amount ?? 0,
        is_early_bird: selectedTier?.is_early_bird ?? false,
        payment_method: 'free',
        payment_status: 'confirmed',
      })
      .select('id')
      .single();

    if (orderError) throw new Error(orderError.message);

    await supabase
      .from('events')
      .update({ tickets_remaining: event.tickets_remaining - form.quantity })
      .eq('id', event.id);

    if (selectedTier) {
      const tierUpdate = { quantity_remaining: selectedTier.quantity_remaining - form.quantity };
      if (selectedTier.is_early_bird) {
        tierUpdate.early_bird_sold = (selectedTier.early_bird_sold ?? 0) + form.quantity;
      }
      await supabase.from('ticket_tiers').update(tierUpdate).eq('id', selectedTier.id);
    }

    if (appliedDiscount) {
      await supabase
        .from('discount_codes')
        .update({ times_used: appliedDiscount.currentUses + 1 })
        .eq('id', appliedDiscount.codeId);
    }

    try {
      await fetch('/api/send-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
    } catch (err) {
      console.error('[checkout] send-ticket error:', err);
    }
  }, [event, form, total, loggedInUser, selectedTier, appliedDiscount]);

  function handleInfoSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    if (form.email !== form.confirmEmail) { setErrorMsg('Email addresses do not match.'); return; }
    if (form.quantity > maxQty) { setErrorMsg(`Only ${maxQty} tickets are available.`); return; }

    if (isFree) {
      setPaymentProcessing(true);
      completeOrder()
        .then(() => setStep('success'))
        .catch((err) => setErrorMsg(err.message))
        .finally(() => setPaymentProcessing(false));
    } else {
      setStep('payment');
    }
  }

  async function handleSinpeSubmit() {
    setPaymentProcessing(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/sinpe-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          firstName: form.firstName,
          lastName: form.lastName,
          idNumber: form.idNumber,
          email: form.email,
          quantity: form.quantity,
          totalUsd: total,
          crcAmount,
          sinpeReference: sinpeRef,
          userId: loggedInUser?.id ?? null,
          tierId: selectedTier?.id ?? null,
          tierName: selectedTier?.name ?? null,
          isEarlyBird: selectedTier?.is_early_bird ?? false,
          discountCodeId: appliedDiscount?.codeId ?? null,
          discountCode: appliedDiscount?.code ?? null,
          discountAmount: appliedDiscount?.amount ?? 0,
          ticketsRemaining: event.tickets_remaining,
          tierRemaining: selectedTier?.quantity_remaining ?? null,
          earlyBirdSold: selectedTier?.early_bird_sold ?? null,
          discountCurrentUses: appliedDiscount?.currentUses ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Submission failed');
      setStep('sinpe-pending');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setPaymentProcessing(false);
    }
  }

  /* ── SINPE PENDING ── */
  if (step === 'sinpe-pending') {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', border: '2px solid rgba(59,130,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" fill="none" stroke="#60a5fa" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 18 }}>Payment submitted!</p>
        <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.6 }}>
          We&apos;ll confirm your SINPE transfer and send your ticket to{' '}
          <strong style={{ color: '#ffffff' }}>{form.email}</strong> shortly.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', padding: '8px 16px' }}>
          <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(96,165,250,0.8)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Reference:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#93c5fd', fontSize: 14 }}>{sinpeRef}</span>
        </div>
        <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>Keep this reference in case you need to follow up.</p>
      </div>
    );
  }

  /* ── SUCCESS ── */
  if (step === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '2px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 18 }}>You&apos;re registered!</p>
        {selectedTier && <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{selectedTier.name} ticket</p>}
        <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.6 }}>
          Your ticket is on its way to <strong style={{ color: '#ffffff' }}>{form.email}</strong>.
        </p>
        {loggedInUser ? (
          <Link href="/my-tickets" style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: '#CC2222', textDecoration: 'none', marginTop: 4 }}>
            View my tickets →
          </Link>
        ) : (
          <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
            <Link href="/signup" style={{ color: '#CC2222', textDecoration: 'none' }}>Create an account</Link>
            {' '}to view your tickets anytime.
          </p>
        )}
      </div>
    );
  }

  /* ── PAYMENT STEP ── */
  if (step === 'payment') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Order summary */}
        <div style={{ background: '#0d0d0d', border: '1px solid #333333', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Order summary</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            <span>{form.firstName} {form.lastName} · {form.quantity} ticket{form.quantity > 1 ? 's' : ''}</span>
            <span>{fmtAmt(baseTotal)}</span>
          </div>
          {appliedDiscount && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Actay, sans-serif', fontSize: 13, color: '#4ade80' }}>
              <span>Discount ({appliedDiscount.code})</span>
              <span>−{fmtAmt(discountAmount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', fontSize: 16, color: '#ffffff', borderTop: '1px solid #222222', paddingTop: 8, marginTop: 4 }}>
            <span>Total</span>
            <span>{fmtAmt(finalTotal)}</span>
          </div>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(204,34,34,0.1)', border: '1px solid rgba(204,34,34,0.3)', padding: '12px 16px', fontFamily: 'Actay, sans-serif', fontSize: 13, color: '#CC2222' }}>
            {errorMsg}
          </div>
        )}

        {/* SINPE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 10, color: '#60a5fa', letterSpacing: '0.12em', textTransform: 'uppercase' }}>SINPE Móvil</span>
              {qrDataUrl && <img src={qrDataUrl} alt="QR SINPE" style={{ width: 64, height: 64 }} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Número', <span key="num" style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 18, color: '#93c5fd' }}>{formatPhone(sinpeNumber)}</span>],
                ['Monto exacto', <div key="amt" style={{ textAlign: 'right' }}><span style={{ fontWeight: 'bold', fontSize: 18, color: '#93c5fd' }}>₡{crcAmount.toLocaleString('es-CR')}</span>{!isCRC && <p style={{ fontSize: 11, color: 'rgba(147,197,253,0.6)', marginTop: 2 }}>= ${finalTotal.toFixed(2)} USD</p>}</div>],
                ['Referencia', <span key="ref" style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#93c5fd' }}>{sinpeRef}</span>],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(147,197,253,0.7)' }}>{k}</span>
                  {v}
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.05)', padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 10, color: 'rgba(251,191,36,0.8)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Instrucciones</p>
            {[
              'Abre SINPE Móvil en tu teléfono',
              `Transfiere ₡${crcAmount.toLocaleString('es-CR')}${!isCRC ? ` (= $${finalTotal.toFixed(2)} USD)` : ''} al número ${formatPhone(sinpeNumber)}`,
              `Escribe ${sinpeRef} en el campo de descripción/referencia`,
              'Haz clic en "Ya pagué"',
            ].map((s, i) => (
              <p key={i} style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(251,191,36,0.7)' }}>{i + 1}. {s}</p>
            ))}
          </div>

          <button type="button" onClick={handleSinpeSubmit} disabled={paymentProcessing} className="fomo-btn-primary" style={{ width: '100%' }}>
            {paymentProcessing ? 'Enviando…' : 'Ya pagué — enviar comprobante'}
          </button>
          <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', letterSpacing: '0.04em' }}>
            Tu entrada llegará por email una vez confirmemos la transferencia.
          </p>
        </div>

        <button type="button" onClick={() => { setStep('info'); setErrorMsg(''); }}
          style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center' }}>
          ← Back
        </button>
      </div>
    );
  }

  /* ── INFO STEP ── */
  return (
    <form onSubmit={handleInfoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!loggedInUser && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #333333', padding: '10px 14px', fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href={`/login?redirect=${encodeURIComponent(`/events/${event.id}`)}`} style={{ color: '#CC2222', textDecoration: 'none' }}>Sign in</Link>
          {' '}to save your tickets to your profile.
        </div>
      )}
      {loggedInUser && (
        <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', padding: '10px 14px', fontFamily: 'Actay, sans-serif', fontSize: 13, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 8 }}>
          ✓ Signed in — your ticket will be saved to your account.
        </div>
      )}

      {errorMsg && (
        <div style={{ background: 'rgba(204,34,34,0.1)', border: '1px solid rgba(204,34,34,0.3)', padding: '10px 14px', fontFamily: 'Actay, sans-serif', fontSize: 13, color: '#CC2222' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={label}>First Name</label><input type="text" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Jane" required className="input" /></div>
        <div><label style={label}>Last Name</label><input type="text" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Smith" required className="input" /></div>
      </div>

      {requireId && (
        <div><label style={label}>ID Number (Cédula)</label><input type="text" name="idNumber" value={form.idNumber} onChange={handleChange} placeholder="0000000000" required className="input" /></div>
      )}

      <div><label style={label}>Email</label><input type="email" name="email" value={form.email} onChange={handleChange} placeholder="jane@example.com" required className="input" /></div>

      <div>
        <label style={label}>Confirm Email</label>
        <input type="email" name="confirmEmail" value={form.confirmEmail} onChange={handleChange} placeholder="jane@example.com" required className="input" style={{ borderColor: emailMismatch ? '#CC2222' : undefined }} />
        {emailMismatch && <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: '#CC2222', marginTop: 4 }}>Email addresses do not match.</p>}
      </div>

      <div>
        <label style={label}>Quantity</label>
        <select name="quantity" value={form.quantity} onChange={handleChange} className="input">
          {Array.from({ length: Math.min(10, maxQty) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {/* Discount code */}
      <div>
        <label style={label}>Discount Code</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={discountInput}
            onChange={(e) => { setDiscountInput(e.target.value.toUpperCase()); if (appliedDiscount) { setAppliedDiscount(null); setDiscountStatus(null); } }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyDiscount(); } }}
            placeholder="Enter code"
            className="input"
            style={{ flex: 1, fontFamily: 'monospace', textTransform: 'uppercase' }}
            disabled={!!appliedDiscount}
          />
          <button
            type="button"
            onClick={appliedDiscount ? () => { setAppliedDiscount(null); setDiscountStatus(null); setDiscountInput(''); } : applyDiscount}
            disabled={discountStatus === 'loading'}
            style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', background: 'none', border: '1px solid #444444', padding: '0 14px', cursor: 'pointer', flexShrink: 0, opacity: discountStatus === 'loading' ? 0.5 : 1 }}
          >
            {discountStatus === 'loading' ? '…' : appliedDiscount ? 'Remove' : 'Apply'}
          </button>
        </div>
        {discountStatus === 'valid' && appliedDiscount && (
          <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: '#4ade80', marginTop: 4 }}>
            ✓ {appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}%` : fmtAmt(appliedDiscount.value)} off applied — you save {fmtAmt(appliedDiscount.amount)}
          </p>
        )}
        {discountStatus === 'invalid' && <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: '#CC2222', marginTop: 4 }}>{discountError}</p>}
      </div>

      {/* Totals */}
      <div style={{ borderTop: '1px solid #222222', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          <span>{fmtAmt(price)} × {form.quantity}</span>
          <span>{fmtAmt(baseTotal)}</span>
        </div>
        {appliedDiscount && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Actay, sans-serif', fontSize: 13, color: '#4ade80' }}>
            <span>Discount ({appliedDiscount.code})</span>
            <span>−{fmtAmt(discountAmount)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', fontSize: 18, color: '#ffffff' }}>
          <span>Total</span>
          <span>{isFree ? 'Free' : fmtAmt(finalTotal)}</span>
        </div>
      </div>

      <button type="submit" disabled={paymentProcessing || emailMismatch} className="fomo-btn-primary" style={{ width: '100%' }}>
        {paymentProcessing ? 'Processing…' : isFree ? 'Register for Free' : 'Continue to Payment →'}
      </button>
    </form>
  );
}
