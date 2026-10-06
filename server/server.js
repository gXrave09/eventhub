import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }
});

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data_store.json');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const JWT_SECRET = process.env.JWT_SECRET || 'eventhub-secure-hmac-secret-key-2026';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(FRONTEND_DIR));

// -----------------------------------------------------------------------------
// Database Schema & In-Memory Store
// Schema:
//   users(user_id, name, email, preferences JSONB)
//   events(event_id, name, details, date, venue, ...)
//   registrations(reg_id, event_id, user_id, registered_at, ticket_id, ...)
// -----------------------------------------------------------------------------
let db = {
  users: [
    {
      user_id: 'usr_bala_01',
      name: 'Bala Aditya',
      email: 'aditya.kxlmn@gmail.com',
      preferences: {
        role: 'Fullstack Developer',
        tshirtSize: 'L',
        dietary: 'Vegetarian',
        track: 'Agentic AI & Robotics',
        notifications: true,
        notes: 'Building autonomous multi-agent systems.'
      }
    },
    {
      user_id: 'usr_priya_02',
      name: 'Priya Sharma',
      email: 'priya.sharma@campus.edu',
      preferences: {
        role: 'ML Engineer',
        tshirtSize: 'M',
        dietary: 'Vegan',
        track: 'Computer Vision',
        notifications: true,
        notes: 'Looking for team members for edge-AI vision project.'
      }
    },
    {
      user_id: 'usr_aarav_03',
      name: 'Aarav Patel',
      email: 'aarav.patel@tech.edu',
      preferences: {
        role: 'UI/UX Designer',
        tshirtSize: 'XL',
        dietary: 'Non-Vegetarian',
        track: 'Product Design',
        notifications: true,
        notes: 'Focusing on low-latency human-computer interactions.'
      }
    }
  ],
  events: [
    {
      event_id: 'evt_demo_01',
      id: 'evt_demo_01',
      name: 'Apex AI & Robotics Hackathon 2026',
      details: 'Join the premier inter-college artificial intelligence and robotics championship. Build high-impact agentic AI pipelines, compete for ₹2,50,000 in grand prizes, and network with leading tech founders.',
      description: 'Join the premier inter-college artificial intelligence and robotics championship. Build high-impact agentic AI pipelines, compete for ₹2,50,000 in grand prizes, and network with leading tech founders.',
      category: 'Hackathon',
      date: '2026-10-24',
      startTime: '09:00',
      endTime: '18:00',
      venue: 'Main Auditorium & Innovation Lab',
      city: 'Pune',
      state: 'Maharashtra',
      maxAttendees: 150,
      organizerEmail: 'organizer@eventhub.io',
      organizerPhone: '+91 98765 43210',
      attendees: 18,
      checkedIn: 4
    }
  ],
  registrations: [
    {
      reg_id: 'reg_init_001',
      event_id: 'evt_demo_01',
      user_id: 'usr_bala_01',
      registered_at: '2026-10-06T09:15:00.000Z',
      ticket_id: 'EH-DEMO01-8842',
      ticketId: 'EH-DEMO01-8842',
      entry_confirmed: false
    }
  ]
};

// Load saved data if exists
if (fs.existsSync(DATA_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (saved.users) db.users = saved.users;
    if (saved.events) db.events = saved.events;
    if (saved.registrations) db.registrations = saved.registrations;
  } catch (err) {
    console.error('Error loading data_store.json:', err);
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing data_store.json:', err);
  }
}

// -----------------------------------------------------------------------------
// Lightweight Native JWT / HMAC Token Helpers (Zero External Dependency)
// -----------------------------------------------------------------------------
function signToken(payload, expiresInSec = 86400 * 7) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const fullPayload = { ...payload, exp };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (expectedSig !== sig) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch (_) {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Core Business Logic: Register Participant
// -----------------------------------------------------------------------------
function performRegistration({ event_id, user_id, user_name, user_email, preferences }) {
  if (!event_id || !user_id) {
    throw new Error('Missing event_id or user_id');
  }

  // 1. Validate / Provision User
  let user = db.users.find(u => u.user_id === user_id);
  if (!user) {
    const formattedName = user_name || user_id.replace(/^usr_/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Participant';
    user = {
      user_id,
      name: formattedName,
      email: user_email || `${user_id.toLowerCase()}@campus.edu`,
      preferences: {
        role: 'Participant',
        tshirtSize: 'L',
        dietary: 'Standard',
        track: 'General Track',
        notifications: true,
        notes: preferences?.notes || 'Registered via QR scan.',
        ...(preferences || {})
      }
    };
    db.users.push(user);
  } else if (preferences) {
    user.preferences = { ...user.preferences, ...preferences };
  }

  // 2. Validate / Provision Event
  let event = db.events.find(e => e.event_id === event_id || e.id === event_id);
  if (!event) {
    event = {
      event_id,
      id: event_id,
      name: 'Event ' + event_id.replace(/^evt_/, '').toUpperCase(),
      details: 'Campus Event Details & Information',
      description: 'Campus Event Details & Information',
      category: 'Campus Event',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '18:00',
      venue: 'Main Auditorium',
      city: 'Campus',
      attendees: 0,
      checkedIn: 0,
      maxAttendees: 200
    };
    db.events.push(event);
  }

  // 3. Check for existing registration
  let reg = db.registrations.find(r => (r.event_id === event_id || r.eventId === event_id) && (r.user_id === user_id || r.userId === user_id));
  let isNew = false;

  if (!reg) {
    isNew = true;
    event.attendees = (event.attendees || 0) + 1;
    const cleanEventId = (event.event_id || event.id || 'EVT').slice(-6).toUpperCase();
    const ticketId = `EH-${cleanEventId}-${Math.floor(1000 + Math.random() * 9000)}`;

    reg = {
      reg_id: `reg_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      event_id: event.event_id || event.id,
      eventId: event.event_id || event.id,
      user_id: user.user_id,
      userId: user.user_id,
      ticket_id: ticketId,
      ticketId: ticketId,
      registered_at: new Date().toISOString(),
      registeredAt: new Date().toISOString(),
      entry_confirmed: false,
      attendeeName: user.name,
      attendeeEmail: user.email
    };
    db.registrations.push(reg);
    saveDb();

    // Broadcast real-time Socket.io update for live organizer counters
    const socketPayload = {
      eventId: event.event_id || event.id,
      attendees: event.attendees,
      maxAttendees: event.maxAttendees,
      newRegistration: {
        userId: user.user_id,
        name: user.name,
        ticketId
      },
      timestamp: new Date().toISOString()
    };

    io.to(`event:${event.event_id || event.id}`).emit('registration:updated', socketPayload);
    io.emit('event:count_updated', socketPayload);
    console.log(`[Registration] User ${user.name} (${user_id}) registered for ${event.name}. Attendees: ${event.attendees}`);
  }

  const token = signToken({ user_id: user.user_id, event_id: event.event_id || event.id, reg_id: reg.reg_id });

  return {
    isNew,
    registration: reg,
    event,
    user,
    token
  };
}

// -----------------------------------------------------------------------------
// Endpoint 1: POST & GET /register (Automated QR Scan Trigger)
// -----------------------------------------------------------------------------
app.all(['/register', '/api/register'], (req, res) => {
  const event_id = req.body?.event_id || req.query?.event_id || req.body?.eventId || req.query?.eventId;
  const user_id = req.body?.user_id || req.query?.user_id || req.body?.userId || req.query?.userId;
  const token = req.body?.token || req.query?.token;
  const user_name = req.body?.name || req.query?.name;
  const user_email = req.body?.email || req.query?.email;
  const preferences = req.body?.preferences;

  // Verify token if passed
  if (token) {
    const verified = verifyToken(token);
    if (verified && (!event_id || !user_id)) {
      req.body.event_id = verified.event_id;
      req.body.user_id = verified.user_id;
    }
  }

  if (!event_id || !user_id) {
    return res.status(400).json({
      success: false,
      error: 'Both event_id and user_id are required parameters.'
    });
  }

  try {
    const result = performRegistration({
      event_id,
      user_id,
      user_name,
      user_email,
      preferences
    });

    const redirectUrl = `/home?user_id=${encodeURIComponent(user_id)}&event_id=${encodeURIComponent(event_id)}${result.isNew ? '&registered=1' : '&already_registered=1'}`;

    // If request comes directly from browser URL navigation (HTML request)
    const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
    if (req.method === 'GET' && acceptsHtml && req.query?.format !== 'json') {
      return res.redirect(redirectUrl);
    }

    return res.json({
      success: true,
      message: result.isNew ? 'Registration confirmed successfully!' : 'Participant is already registered for this event.',
      isNew: result.isNew,
      redirect_url: redirectUrl,
      registration: result.registration,
      event: result.event,
      user: result.user,
      token: result.token
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// Endpoint 2: GET /home and /api/home (Personalized Dashboard)
// -----------------------------------------------------------------------------
app.get(['/home', '/api/home'], (req, res) => {
  const userId = req.query.user_id || req.query.userId;
  const eventId = req.query.event_id || req.query.eventId;

  // If browser requests HTML page, serve home.html
  const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
  if (acceptsHtml && req.query?.format !== 'json' && req.path === '/home') {
    return res.sendFile(path.join(FRONTEND_DIR, 'home.html'));
  }

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'user_id query parameter is required.'
    });
  }

  // 1. Fetch user data & preferences
  const user = db.users.find(u => u.user_id === userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: `User not found with user_id: ${userId}`
    });
  }

  // 2. Fetch all registrations for this user
  const userRegistrations = db.registrations.filter(r => r.user_id === userId || r.userId === userId);

  // 3. Attach matching event data
  const registeredEvents = userRegistrations.map(reg => {
    const evId = reg.event_id || reg.eventId;
    const event = db.events.find(e => e.event_id === evId || e.id === evId) || {};
    return {
      ...event,
      registration: reg
    };
  });

  // 4. Identify active event
  let activeEvent = null;
  if (eventId) {
    activeEvent = registeredEvents.find(e => e.event_id === eventId || e.id === eventId) ||
                  db.events.find(e => e.event_id === eventId || e.id === eventId);
  }
  if (!activeEvent && registeredEvents.length > 0) {
    activeEvent = registeredEvents[0];
  }
  if (!activeEvent && db.events.length > 0) {
    activeEvent = db.events[0];
  }

  return res.json({
    success: true,
    user,
    registrations: userRegistrations,
    events: registeredEvents,
    active_event: activeEvent
  });
});

// -----------------------------------------------------------------------------
// Endpoint 3: POST /api/user/preferences (Update Participant Notes & Preferences)
// -----------------------------------------------------------------------------
app.post(['/api/user/preferences', '/api/users/:userId/preferences'], (req, res) => {
  const userId = req.params?.userId || req.body?.user_id || req.body?.userId;
  const preferences = req.body?.preferences || req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }

  let user = db.users.find(u => u.user_id === userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  user.preferences = {
    ...(user.preferences || {}),
    ...(preferences || {})
  };
  saveDb();

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    preferences: user.preferences,
    user
  });
});

// -----------------------------------------------------------------------------
// Endpoint 4: POST /api/generate-qr (Generate Secure QR Parameters / Token)
// -----------------------------------------------------------------------------
app.post('/api/generate-qr', (req, res) => {
  const { event_id, user_id } = req.body;
  if (!event_id || !user_id) {
    return res.status(400).json({ success: false, error: 'event_id and user_id are required.' });
  }

  const token = signToken({ event_id, user_id });
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol || 'http';
  const qrUrl = `${protocol}://${host}/register?event_id=${encodeURIComponent(event_id)}&user_id=${encodeURIComponent(user_id)}&token=${token}`;

  res.json({
    success: true,
    event_id,
    user_id,
    token,
    qrUrl,
    directDashboardUrl: `${protocol}://${host}/home?user_id=${encodeURIComponent(user_id)}&event_id=${encodeURIComponent(event_id)}`
  });
});

// -----------------------------------------------------------------------------
// Existing Events Endpoints (Preserved & Enhanced)
// -----------------------------------------------------------------------------
app.get('/api/events', (req, res) => {
  res.json({ success: true, events: db.events });
});

app.get('/api/events/:id', (req, res) => {
  const event = db.events.find(e => e.id === req.params.id || e.event_id === req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }
  res.json({ success: true, event });
});

app.post('/api/events', (req, res) => {
  const eventData = req.body;
  const newEvent = {
    event_id: eventData.event_id || eventData.id || `evt_${Date.now()}`,
    id: eventData.event_id || eventData.id || `evt_${Date.now()}`,
    name: eventData.name || 'Untitled Event',
    details: eventData.details || eventData.description || '',
    description: eventData.description || eventData.details || '',
    category: eventData.category || 'General',
    date: eventData.date || new Date().toISOString().split('T')[0],
    startTime: eventData.startTime || '10:00',
    endTime: eventData.endTime || null,
    venue: eventData.venue || 'Campus Hall',
    city: eventData.city || 'Campus',
    state: eventData.state || null,
    maxAttendees: eventData.maxAttendees ? parseInt(eventData.maxAttendees) : 200,
    organizerEmail: eventData.organizerEmail || 'organizer@eventhub.io',
    organizerPhone: eventData.organizerPhone || '',
    attendees: 0,
    checkedIn: 0,
    createdAt: new Date().toISOString()
  };

  db.events.unshift(newEvent);
  saveDb();

  io.emit('event:created', newEvent);
  res.status(201).json({ success: true, event: newEvent });
});

// Real-Time Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on('join:event', (eventId) => {
    socket.join(`event:${eventId}`);
    const event = db.events.find(e => e.id === eventId || e.event_id === eventId);
    if (event) {
      socket.emit('event:sync', {
        eventId,
        attendees: event.attendees || 0,
        maxAttendees: event.maxAttendees
      });
    }
  });

  socket.on('leave:event', (eventId) => {
    socket.leave(`event:${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`⚡ EventHub Real-Time Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket / Socket.io live sync enabled`);
  console.log(`🚀 Automated QR Scan -> /register -> /home endpoints ACTIVE`);
  console.log(`====================================================`);
});
