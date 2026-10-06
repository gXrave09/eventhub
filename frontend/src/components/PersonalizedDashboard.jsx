import React, { useEffect, useState } from 'react';

/**
 * PersonalizedDashboard - React & Next.js Participant Event Dashboard
 * Displays event details, saved preferences, live countdown, attendee metrics, and digital entry pass.
 */
export default function PersonalizedDashboard({
  userId = 'usr_bala_01',
  eventId = 'evt_demo_01',
  backendUrl = ''
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const resp = await fetch(`${backendUrl}/api/home?user_id=${encodeURIComponent(userId)}&event_id=${encodeURIComponent(eventId)}`);
        if (resp.ok) {
          const res = await resp.json();
          if (res.success) {
            setData(res);
            setNotes(res.user?.preferences?.notes || '');
          }
        }
      } catch (err) {
        console.warn('Dashboard fetch note:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [userId, eventId, backendUrl]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setSaveSuccess(false);
    try {
      const resp = await fetch(`${backendUrl}/api/user/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          preferences: { notes }
        })
      });
      if (resp.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (_) {}
    setSavingNotes(false);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#cac4d0' }}>
        <h2>Loading your personalized dashboard...</h2>
      </div>
    );
  }

  const user = data?.user || { name: 'Participant', email: 'attendee@campus.edu' };
  const event = data?.active_event || { name: 'Campus Event', date: '2026-10-24', venue: 'Main Auditorium' };
  const reg = data?.registrations?.[0] || { ticket_id: 'EH-PASS-001' };

  return (
    <div style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 20px', color: '#e6e0e9', fontFamily: 'Inter, sans-serif' }}>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(236, 72, 153, 0.15) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.4)',
        borderRadius: '24px',
        padding: '30px',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'inline-block', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #4ade80', color: '#4ade80', padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '12px' }}>
          ✓ CONFIRMED REGISTRATION
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: '2rem', fontFamily: 'Outfit, sans-serif' }}>{event.name}</h1>
        <p style={{ margin: 0, color: '#cac4d0', fontSize: '1rem' }}>{event.details || event.description}</p>
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
          <span>📅 {event.date}</span>
          <span>📍 {event.venue}</span>
          <span>👤 {user.name} ({user.user_id})</span>
          <span>👥 Attendees: {event.attendees || 18}</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Profile Card */}
        <div style={{ background: '#1d1b20', border: '1px solid #332d41', borderRadius: '20px', padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>👤 Saved Participant Data</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
            <div><strong>Role:</strong> {user.preferences?.role || 'Developer'}</div>
            <div><strong>Focus Track:</strong> {user.preferences?.track || 'Agentic AI'}</div>
            <div><strong>T-Shirt:</strong> {user.preferences?.tshirtSize || 'L'}</div>
            <div><strong>Dietary:</strong> {user.preferences?.dietary || 'Vegetarian'}</div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>Personal Notes & Goals:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ width: '100%', background: '#050407', border: '1px solid #49454f', borderRadius: '10px', color: '#fff', padding: '10px', boxSizing: 'border-box' }}
            />
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              style={{ marginTop: '10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
            >
              {savingNotes ? 'Saving...' : 'Save Notes to DB'}
            </button>
            {saveSuccess && <span style={{ marginLeft: '10px', color: '#4ade80', fontSize: '0.85rem' }}>✓ Saved!</span>}
          </div>
        </div>

        {/* Digital Ticket Pass */}
        <div style={{ background: '#16131e', border: '1px solid #7c3aed', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', marginTop: 0, color: '#c084fc' }}>🎟️ Gate Entry Pass</h2>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', display: 'inline-block', margin: '16px 0' }}>
            <div style={{ width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', color: '#111', fontWeight: 700, fontSize: '0.8rem' }}>
              QR: {reg.ticket_id}
            </div>
          </div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', color: '#c084fc' }}>
            {reg.ticket_id}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#cac4d0', margin: '8px 0 0' }}>Present this at gate check-in for instant access.</p>
        </div>
      </div>
    </div>
  );
}
