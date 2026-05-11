'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import CreateEventForm from './CreateEventForm';
import EditEventModal from './EditEventModal';
import DiscountCodesTab from './DiscountCodesTab';
import SinpeTab from './SinpeTab';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState('Overview');
  const [events, setEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [rejectingEvent, setRejectingEvent] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [sinpePendingCount, setSinpePendingCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/admin/login'); return; }
      setUser(user);
      setIsAdmin(user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL);
    });
  }, [router]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const eventsQuery = supabase.from('events').select('*').order('date', { ascending: true });
    const ordersQuery = supabase.from('orders').select('*, events(title, currency)').order('created_at', { ascending: false });

    if (!isAdmin) {
      eventsQuery.eq('user_id', user.id);
      ordersQuery.eq('events.user_id', user.id);
    }

    const promises = [eventsQuery, ordersQuery];

    if (isAdmin) {
      promises.push(
        supabase.from('events').select('*').eq('status', 'pending').order('created_at', { ascending: true })
      );
      promises.push(
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_method', 'sinpe').eq('payment_status', 'pending_sinpe')
      );
    }

    const results = await Promise.all(promises);
    const [{ data: eventsData }, { data: ordersData }] = results;

    setEvents(eventsData ?? []);
    setOrders((ordersData ?? []).filter((o) => o.events !== null));

    if (isAdmin && results[2]) {
      setPendingEvents(results[2].data ?? []);
    }
    if (isAdmin && results[3]) {
      setSinpePendingCount(results[3].count ?? 0);
    }

    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  async function deleteEvent(id) {
    if (!confirm('Delete this event? This will also delete all related orders and tickets.')) return;
    setDeletingId(id);
    await supabase.from('events').delete().eq('id', id);
    setDeletingId(null);
    fetchData();
  }

  async function approveEvent(eventId) {
    setApprovingId(eventId);
    await fetch('/api/event-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, status: 'approved' }),
    });
    setApprovingId(null);
    fetchData();
  }

  async function rejectEvent() {
    if (!rejectingEvent) return;
    setApprovingId(rejectingEvent.id);
    await fetch('/api/event-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: rejectingEvent.id, status: 'rejected', reason: rejectReason }),
    });
    setRejectingEvent(null);
    setRejectReason('');
    setApprovingId(null);
    fetchData();
  }

  const tabs = isAdmin ? ['Overview', 'Approvals', 'SINPE', 'Events', 'Orders', 'Discounts', 'New Event'] : ['Overview', 'Events', 'Orders', 'New Event'];
  const usdRevenue = orders.filter((o) => (o.events?.currency ?? 'USD') !== 'CRC').reduce((s, o) => s + parseFloat(o.total_price ?? 0), 0);
  const crcRevenue = orders.filter((o) => o.events?.currency === 'CRC').reduce((s, o) => s + parseFloat(o.total_price ?? 0), 0);
  const ticketsSold = orders.reduce((sum, o) => sum + (o.quantity ?? 0), 0);

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      {/* Header */}
      <header style={{ background: '#000000', borderBottom: '1px solid #222222' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/">
              <Image src="/images/FOMO-LOGO-Vector.svg" alt="FOMO" width={72} height={24} style={{ height: 24, width: 'auto' }} />
            </Link>
            <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Admin</span>
            {isAdmin && (
              <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 9, background: '#CC2222', color: '#ffffff', padding: '3px 10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Super Admin
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>{user.email}</span>
            <Link href="/admin/analytics" style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em', textDecoration: 'none' }}>
              Analytics
            </Link>
            <Link href="/scan" style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', background: '#CC2222', color: '#ffffff', padding: '8px 18px', borderRadius: 100, textDecoration: 'none' }}>
              Scan Tickets
            </Link>
            <button onClick={handleSignOut} style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}>
              Sign out
            </button>
          </div>
        </div>

        {/* Tab Nav */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 0, borderTop: '1px solid #1a1a1a' }}>
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                position: 'relative',
                padding: '12px 16px',
                fontFamily: 'Actay, sans-serif',
                fontSize: 12,
                letterSpacing: '0.05em',
                color: tab === t ? '#ffffff' : 'rgba(255,255,255,0.35)',
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? '2px solid #CC2222' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              {t}
              {t === 'Approvals' && pendingEvents.length > 0 && (
                <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, fontSize: 9, fontWeight: 'bold', background: '#f97316', color: '#ffffff', borderRadius: '50%' }}>
                  {pendingEvents.length}
                </span>
              )}
              {t === 'SINPE' && sinpePendingCount > 0 && (
                <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, fontSize: 9, fontWeight: 'bold', background: '#3b82f6', color: '#ffffff', borderRadius: '50%' }}>
                  {sinpePendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.3)', fontSize: 14, letterSpacing: '0.08em' }}>Loading…</div>
        ) : (
          <>
            {tab === 'Overview' && (
              <OverviewTab events={events} orders={orders} usdRevenue={usdRevenue} crcRevenue={crcRevenue} ticketsSold={ticketsSold} isAdmin={isAdmin} />
            )}
            {tab === 'Approvals' && isAdmin && (
              <ApprovalsTab
                pendingEvents={pendingEvents}
                approvingId={approvingId}
                onApprove={approveEvent}
                onReject={setRejectingEvent}
              />
            )}
            {tab === 'Events' && (
              <EventsTab
                events={events}
                orders={orders}
                isAdmin={isAdmin}
                deletingId={deletingId}
                onEdit={setEditingEvent}
                onDelete={deleteEvent}
              />
            )}
            {tab === 'Orders' && <OrdersTab orders={orders} isAdmin={isAdmin} />}
            {tab === 'SINPE' && isAdmin && <SinpeTab />}
            {tab === 'Discounts' && isAdmin && <DiscountCodesTab events={events} />}
            {tab === 'New Event' && (
              <div style={{ maxWidth: 640 }}>
                <CreateEventForm
                  userId={user.id}
                  userEmail={user.email}
                  onCreated={() => { fetchData(); setTab('Events'); }}
                />
              </div>
            )}
          </>
        )}
      </main>

      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={fetchData}
        />
      )}

      {/* Reject reason modal */}
      {rejectingEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '0 16px' }}>
          <div style={{ background: '#111111', border: '2px solid #333333', padding: 24, width: '100%', maxWidth: 420 }}>
            <h3 style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 18, marginBottom: 8 }}>Reject event</h3>
            <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              Rejecting <strong style={{ color: '#ffffff' }}>{rejectingEvent.title}</strong>. Optionally provide a reason for the organizer.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional)…"
              rows={3}
              className="input"
              style={{ resize: 'none', marginBottom: 16, width: '100%' }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => { setRejectingEvent(null); setRejectReason(''); }}
                style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'none', border: '1px solid #333333', padding: '10px 20px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={rejectEvent} disabled={!!approvingId}
                style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, background: '#CC2222', color: '#ffffff', border: 'none', padding: '10px 20px', cursor: 'pointer', opacity: approvingId ? 0.5 : 1 }}>
                {approvingId ? 'Rejecting…' : 'Reject Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CSV Export ── */
function csvEsc(val) {
  if (val == null) return '""';
  return `"${String(val).replace(/"/g, '""')}"`;
}

function triggerDownload(csvStr, filename) {
  const blob = new Blob(['﻿' + csvStr], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildCSV(orders, ticketsByOrder) {
  const COLS = [
    'First Name', 'Last Name', 'Email', 'ID Number', 'Ticket Tier',
    'Quantity', 'Amount Paid', 'Payment Method', 'Payment Status',
    'Order Date', 'Ticket Code(s)', 'Is Used',
  ];
  const header = COLS.map(csvEsc).join(',');
  const rows = orders.map((o) => {
    const tickets = ticketsByOrder[o.id] ?? [];
    const currency = o.events?.currency ?? 'USD';
    const amt = currency === 'CRC'
      ? `CRC ${Math.round(parseFloat(o.total_price ?? 0))}`
      : `USD ${parseFloat(o.total_price ?? 0).toFixed(2)}`;
    const codes = tickets.map((t) => t.ticket_code).join('; ');
    const isUsed = tickets.length === 0 ? '' : tickets.some((t) => t.is_used) ? 'Yes' : 'No';
    return [
      o.first_name ?? '', o.last_name ?? '', o.buyer_email ?? '',
      o.id_number ?? '', o.tier_name ?? '', o.quantity ?? 1,
      amt, o.payment_method ?? '', o.payment_status ?? '',
      new Date(o.created_at).toLocaleDateString('en-US'),
      codes, isUsed,
    ].map(csvEsc).join(',');
  });
  return [header, ...rows].join('\n');
}

function slugDate() {
  return new Date().toISOString().slice(0, 10);
}

async function exportEventAttendees(event, allOrders) {
  const orders = allOrders.filter((o) => o.event_id === event.id);
  if (orders.length === 0) { alert('No orders for this event.'); return; }
  const orderIds = orders.map((o) => o.id);
  const { data: tickets } = await supabase.from('tickets').select('*').in('order_id', orderIds);
  const byOrder = {};
  for (const t of tickets ?? []) {
    if (!byOrder[t.order_id]) byOrder[t.order_id] = [];
    byOrder[t.order_id].push(t);
  }
  const csv = buildCSV(orders, byOrder);
  const safe = event.title.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-');
  triggerDownload(csv, `FOMO-${safe}-Attendees-${slugDate()}.csv`);
}

async function exportAllAttendees(allOrders) {
  if (allOrders.length === 0) { alert('No orders to export.'); return; }
  const orderIds = allOrders.map((o) => o.id);
  const { data: tickets } = await supabase.from('tickets').select('*').in('order_id', orderIds);
  const byOrder = {};
  for (const t of tickets ?? []) {
    if (!byOrder[t.order_id]) byOrder[t.order_id] = [];
    byOrder[t.order_id].push(t);
  }
  const csv = buildCSV(allOrders, byOrder);
  triggerDownload(csv, `FOMO-All-Attendees-${slugDate()}.csv`);
}

function fmtOrderPrice(amount, currency) {
  const n = parseFloat(amount ?? 0);
  return currency === 'CRC'
    ? `₡${Math.round(n).toLocaleString('es-CR')}`
    : `$${n.toFixed(2)}`;
}

function fmtEventPrice(price, currency) {
  const n = parseFloat(price ?? 0);
  if (n === 0) return 'Free';
  return currency === 'CRC'
    ? `₡${Math.round(n).toLocaleString('es-CR')}`
    : `$${n.toFixed(2)}`;
}

/* ── Overview ── */
function OverviewTab({ events, orders, usdRevenue, crcRevenue, ticketsSold, isAdmin }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard label={isAdmin ? 'Total Orders' : 'Your Orders'} value={orders.length} icon="🧾" />
        <RevenueStatCard label={isAdmin ? 'Total Revenue' : 'Your Revenue'} usdRevenue={usdRevenue} crcRevenue={crcRevenue} />
        <StatCard label="Tickets Sold" value={ticketsSold} icon="🎟️" />
      </div>
      {isAdmin && orders.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => exportAllAttendees(orders)}
            style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', background: 'none', border: '1px solid #333333', padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export All Attendees
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div style={{ background: '#111111', border: '1px solid #222222', padding: 24 }}>
          <h3 style={{ fontFamily: 'Actay, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Recent Orders</h3>
          {orders.length === 0 ? (
            <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>No orders yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.slice(0, 5).map((o) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: '#ffffff', marginBottom: 2 }}>{o.buyer_name}</p>
                    <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{o.events?.title}</p>
                  </div>
                  <span style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', fontSize: 14, color: '#CC2222' }}>{fmtOrderPrice(o.total_price, o.events?.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#111111', border: '1px solid #222222', padding: 24 }}>
          <h3 style={{ fontFamily: 'Actay, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>
            {isAdmin ? 'All Events' : 'Your Events'}
          </h3>
          {events.length === 0 ? (
            <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>No events yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.slice(0, 5).map((e) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 13, color: '#ffffff', marginBottom: 2 }}>{e.title}</p>
                    <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{e.tickets_remaining}/{e.total_tickets} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div style={{ background: '#111111', border: '1px solid #222222', padding: 24 }}>
      <div style={{ fontSize: 22, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 32, margin: 0 }}>{value}</p>
      <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6 }}>{label}</p>
    </div>
  );
}

function RevenueStatCard({ label, usdRevenue, crcRevenue }) {
  const hasUsd = usdRevenue > 0;
  const hasCrc = crcRevenue > 0;
  const neither = !hasUsd && !hasCrc;
  return (
    <div style={{ background: '#111111', border: '1px solid #222222', padding: 24 }}>
      <div style={{ fontSize: 22, marginBottom: 12 }}>💰</div>
      {neither && <p style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 32, margin: 0 }}>$0.00</p>}
      {hasUsd && <p style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: hasCrc ? 24 : 32, margin: 0 }}>${usdRevenue.toFixed(2)} <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, fontStyle: 'normal', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>USD</span></p>}
      {hasCrc && <p style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: hasUsd ? 24 : 32, margin: hasUsd ? '4px 0 0' : 0 }}>₡{Math.round(crcRevenue).toLocaleString('es-CR')} <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, fontStyle: 'normal', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>CRC</span></p>}
      <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6 }}>{label}</p>
    </div>
  );
}

/* ── Approvals ── */
function ApprovalsTab({ pendingEvents, approvingId, onApprove, onReject }) {
  if (pendingEvents.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.25)', fontSize: 14, letterSpacing: '0.05em' }}>No pending events. You&apos;re all caught up.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>{pendingEvents.length} event{pendingEvents.length !== 1 ? 's' : ''} awaiting review</p>
      {pendingEvents.map((event) => (
        <div key={event.id} style={{ background: '#111111', border: '1px solid #333333', padding: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontFamily: 'ActayWide, sans-serif', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', fontSize: 16, margin: 0 }}>{event.title}</h3>
              {event.description && (
                <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 6, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{event.description}</p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 10 }}>
                {[
                  `${new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
                  event.location,
                  fmtEventPrice(event.price, event.currency),
                  `${event.total_tickets} tickets`,
                  event.organizer_email ? `by ${event.organizer_email}` : null,
                ].filter(Boolean).map((t, i) => (
                  <span key={i} style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => onReject(event)} disabled={!!approvingId}
                style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, color: '#CC2222', background: 'none', border: '1px solid rgba(204,34,34,0.4)', padding: '8px 16px', cursor: 'pointer', opacity: approvingId ? 0.5 : 1 }}>
                Reject
              </button>
              <button onClick={() => onApprove(event.id)} disabled={!!approvingId}
                style={{ fontFamily: 'Actay, sans-serif', fontSize: 12, background: '#CC2222', color: '#ffffff', border: 'none', padding: '8px 16px', cursor: 'pointer', opacity: approvingId ? 0.5 : 1 }}>
                {approvingId === event.id ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }) {
  const styles = {
    approved: { color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' },
    pending: { color: '#fb923c', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)' },
    rejected: { color: '#CC2222', background: 'rgba(204,34,34,0.08)', border: '1px solid rgba(204,34,34,0.25)' },
  };
  const labels = { approved: 'Live', pending: 'Pending', rejected: 'Rejected' };
  const s = styles[status] ?? { color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' };
  return (
    <span style={{ fontFamily: 'Actay, sans-serif', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', ...s }}>
      {labels[status] ?? status}
    </span>
  );
}

const thCell = { fontFamily: 'Actay, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #1a1a1a', fontWeight: 400 };
const tdCell = { fontFamily: 'Actay, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.75)', padding: '14px 16px', verticalAlign: 'middle', borderBottom: '1px solid #1a1a1a' };

/* ── Events ── */
function EventsTab({ events, orders, isAdmin, deletingId, onEdit, onDelete }) {
  if (events.length === 0) {
    return <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.25)', fontSize: 14, padding: '48px 0', textAlign: 'center' }}>No events yet.</p>;
  }

  return (
    <div style={{ background: '#111111', border: '1px solid #222222', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#0d0d0d' }}>
            <th style={thCell}>Event</th>
            <th style={thCell}>Date</th>
            <th style={thCell}>Price</th>
            <th style={thCell}>Tickets</th>
            <th style={thCell}>Status</th>
            <th style={{ ...thCell, textAlign: 'right' }} />
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td style={tdCell}>
                <p style={{ color: '#ffffff', marginBottom: 2, fontWeight: 400 }}>{event.title}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{event.location}</p>
              </td>
              <td style={tdCell}>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
              <td style={tdCell}>{fmtEventPrice(event.price, event.currency)}</td>
              <td style={tdCell}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 64, height: 3, background: '#222222', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#CC2222', width: `${Math.round(((event.total_tickets - event.tickets_remaining) / event.total_tickets) * 100)}%` }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{event.tickets_remaining}/{event.total_tickets}</span>
                </div>
              </td>
              <td style={tdCell}>
                <StatusBadge status={event.status ?? 'pending'} />
                {event.status === 'rejected' && event.rejection_reason && (
                  <p style={{ fontFamily: 'Actay, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={event.rejection_reason}>
                    {event.rejection_reason}
                  </p>
                )}
              </td>
              <td style={{ ...tdCell, textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => exportEventAttendees(event, orders)} title="Download CSV"
                    style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', background: 'none', border: '1px solid #333333', padding: '6px 12px', cursor: 'pointer' }}>
                    Export
                  </button>
                  <button onClick={() => onEdit(event)}
                    style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', background: 'none', border: '1px solid #333333', padding: '6px 12px', cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => onDelete(event.id)} disabled={deletingId === event.id}
                    style={{ fontFamily: 'Actay, sans-serif', fontSize: 11, letterSpacing: '0.05em', color: '#CC2222', background: 'none', border: '1px solid rgba(204,34,34,0.3)', padding: '6px 12px', cursor: 'pointer', opacity: deletingId === event.id ? 0.5 : 1 }}>
                    {deletingId === event.id ? '…' : 'Delete'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Orders ── */
function OrdersTab({ orders, isAdmin }) {
  if (orders.length === 0) {
    return <p style={{ fontFamily: 'Actay, sans-serif', color: 'rgba(255,255,255,0.25)', fontSize: 14, padding: '48px 0', textAlign: 'center' }}>No orders yet.</p>;
  }

  return (
    <div style={{ background: '#111111', border: '1px solid #222222', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#0d0d0d' }}>
            <th style={thCell}>Buyer</th>
            <th style={thCell}>Event</th>
            <th style={thCell}>Qty</th>
            <th style={thCell}>Total</th>
            <th style={thCell}>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td style={tdCell}>
                <p style={{ color: '#ffffff', marginBottom: 2 }}>{order.buyer_name}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{order.buyer_email}</p>
              </td>
              <td style={tdCell}>{order.events?.title ?? '—'}</td>
              <td style={tdCell}>{order.quantity}</td>
              <td style={{ ...tdCell, color: '#CC2222', fontFamily: 'ActayWide, sans-serif', fontStyle: 'italic' }}>{fmtOrderPrice(order.total_price, order.events?.currency)}</td>
              <td style={{ ...tdCell, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
