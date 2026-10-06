import http.server
import socketserver
import json
import os
import urllib.parse
import urllib.request
import base64
import mimetypes
import smtplib
import hmac
import hashlib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# Load .env manually without external dependencies
ENV_FILE = os.path.join(os.path.dirname(__file__), '..', '.env')
if not os.path.exists(ENV_FILE):
    ENV_FILE = os.path.join(os.path.dirname(__file__), '.env')

if os.path.exists(ENV_FILE):
    try:
        with open(ENV_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ[key.strip()] = val.strip().strip('"').strip("'")
    except Exception as e:
        print("Note reading .env:", e)

PORT = int(os.environ.get('PORT', 3000))
DATA_FILE = os.path.join(os.path.dirname(__file__), 'data_store.json')
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
JWT_SECRET = os.environ.get('JWT_SECRET', 'eventhub-secure-hmac-secret-key-2026').encode('utf-8')

# Database in-memory structure matching Postgres schema
db = {
    "users": [
        {
            "user_id": "usr_bala_01",
            "name": "Bala Aditya",
            "email": "aditya.kxlmn@gmail.com",
            "preferences": {
                "role": "Fullstack Developer",
                "tshirtSize": "L",
                "dietary": "Vegetarian",
                "track": "Agentic AI & Robotics",
                "notifications": True,
                "notes": "Building autonomous multi-agent systems."
            }
        },
        {
            "user_id": "usr_priya_02",
            "name": "Priya Sharma",
            "email": "priya.sharma@campus.edu",
            "preferences": {
                "role": "ML Engineer",
                "tshirtSize": "M",
                "dietary": "Vegan",
                "track": "Computer Vision",
                "notifications": True,
                "notes": "Looking for team members for edge-AI vision project."
            }
        },
        {
            "user_id": "usr_aarav_03",
            "name": "Aarav Patel",
            "email": "aarav.patel@tech.edu",
            "preferences": {
                "role": "UI/UX Designer",
                "tshirtSize": "XL",
                "dietary": "Non-Vegetarian",
                "track": "Product Design",
                "notifications": True,
                "notes": "Focusing on low-latency human-computer interactions."
            }
        }
    ],
    "events": [
        {
            "event_id": "evt_demo_01",
            "id": "evt_demo_01",
            "name": "Apex AI & Robotics Hackathon 2026",
            "details": "Join the premier inter-college artificial intelligence and robotics championship. Build high-impact agentic AI pipelines, compete for ₹2,50,000 in grand prizes, and network with leading tech founders.",
            "description": "Join the premier inter-college artificial intelligence and robotics championship. Build high-impact agentic AI pipelines, compete for ₹2,50,000 in grand prizes, and network with leading tech founders.",
            "category": "Hackathon",
            "date": "2026-10-24",
            "startTime": "09:00",
            "endTime": "18:00",
            "venue": "Main Auditorium & Innovation Lab",
            "city": "Pune",
            "state": "Maharashtra",
            "maxAttendees": 150,
            "organizerEmail": "organizer@eventhub.io",
            "organizerPhone": "+91 98765 43210",
            "attendees": 18,
            "checkedIn": 4
        }
    ],
    "registrations": [
        {
            "reg_id": "reg_init_001",
            "event_id": "evt_demo_01",
            "user_id": "usr_bala_01",
            "registered_at": "2026-10-06T09:15:00.000Z",
            "ticket_id": "EH-DEMO01-8842",
            "ticketId": "EH-DEMO01-8842",
            "entry_confirmed": False
        }
    ]
}

if os.path.exists(DATA_FILE):
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            saved = json.load(f)
            if 'users' in saved: db['users'] = saved['users']
            if 'events' in saved: db['events'] = saved['events']
            if 'registrations' in saved: db['registrations'] = saved['registrations']
    except Exception as e:
        print("Error loading data_store.json:", e)

def save_db():
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(db, f, indent=2)
    except Exception as e:
        print("Error saving data_store.json:", e)

def b64url_encode(data_bytes):
    return base64.urlsafe_b64encode(data_bytes).rstrip(b'=').decode('utf-8')

def b64url_decode(s):
    padding = 4 - (len(s) % 4)
    if padding and padding < 4:
        s += '=' * padding
    return base64.urlsafe_b64decode(s.encode('utf-8'))

def sign_token(payload, expires_in=86400 * 7):
    header = {"alg": "HS256", "typ": "JWT"}
    full_payload = dict(payload)
    full_payload["exp"] = int(time.time()) + expires_in
    
    header_b64 = b64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = b64url_encode(json.dumps(full_payload).encode('utf-8'))
    to_sign = f"{header_b64}.{payload_b64}".encode('utf-8')
    sig = b64url_encode(hmac.new(JWT_SECRET, to_sign, hashlib.sha256).digest())
    return f"{header_b64}.{payload_b64}.{sig}"

def verify_token(token):
    try:
        if not token: return None
        parts = token.split('.')
        if len(parts) != 3: return None
        header_b64, payload_b64, sig = parts
        to_sign = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = b64url_encode(hmac.new(JWT_SECRET, to_sign, hashlib.sha256).digest())
        if expected_sig != sig: return None
        payload = json.loads(b64url_decode(payload_b64).decode('utf-8'))
        if payload.get("exp") and payload["exp"] < int(time.time()):
            return None
        return payload
    except Exception:
        return None

def perform_registration(event_id, user_id, user_name=None, user_email=None, preferences=None):
    if not event_id or not user_id:
        raise ValueError("Missing event_id or user_id")

    # 1. User
    user = next((u for u in db["users"] if u.get("user_id") == user_id), None)
    if not user:
        clean_name = user_name or user_id.replace('usr_', '').replace('_', ' ').title() or 'Participant'
        user = {
            "user_id": user_id,
            "name": clean_name,
            "email": user_email or f"{user_id.lower()}@campus.edu",
            "preferences": {
                "role": "Participant",
                "tshirtSize": "L",
                "dietary": "Standard",
                "track": "General Track",
                "notifications": True,
                "notes": (preferences.get("notes") if isinstance(preferences, dict) else "") or "Registered via QR scan."
            }
        }
        if isinstance(preferences, dict):
            user["preferences"].update(preferences)
        db["users"].append(user)
    elif isinstance(preferences, dict):
        user["preferences"].update(preferences)

    # 2. Event
    event = next((e for e in db["events"] if e.get("event_id") == event_id or e.get("id") == event_id), None)
    if not event:
        event = {
            "event_id": event_id,
            "id": event_id,
            "name": "Event " + event_id.replace('evt_', '').upper(),
            "details": "Campus Event Details & Information",
            "description": "Campus Event Details & Information",
            "category": "Campus Event",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "startTime": "10:00",
            "endTime": "18:00",
            "venue": "Main Auditorium",
            "city": "Campus",
            "attendees": 0,
            "checkedIn": 0,
            "maxAttendees": 200
        }
        db["events"].append(event)

    # 3. Registration
    reg = next((r for r in db["registrations"] if (r.get("event_id") == event_id or r.get("eventId") == event_id) and (r.get("user_id") == user_id or r.get("userId") == user_id)), None)
    is_new = False

    if not reg:
        is_new = True
        event["attendees"] = event.get("attendees", 0) + 1
        clean_ev = (event.get("event_id") or event.get("id") or "EVT")[-6:].upper()
        ticket_id = f"EH-{clean_ev}-{abs(hash(user_id + event_id + str(time.time()))) % 9000 + 1000}"
        reg = {
            "reg_id": f"reg_{int(time.time()*1000)}",
            "event_id": event.get("event_id") or event.get("id"),
            "eventId": event.get("event_id") or event.get("id"),
            "user_id": user["user_id"],
            "userId": user["user_id"],
            "ticket_id": ticket_id,
            "ticketId": ticket_id,
            "registered_at": datetime.now().isoformat(),
            "registeredAt": datetime.now().isoformat(),
            "entry_confirmed": False,
            "attendeeName": user["name"],
            "attendeeEmail": user["email"]
        }
        db["registrations"].append(reg)
        save_db()
        print(f"[Registration Python] User {user['name']} ({user_id}) registered for {event['name']}. Total attendees: {event['attendees']}")

    token = sign_token({"user_id": user["user_id"], "event_id": event.get("event_id") or event.get("id"), "reg_id": reg.get("reg_id")})
    return is_new, reg, event, user, token


class EventHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # -------------------------------------------------------------
        # Endpoint: /register (via browser scan redirect or API query)
        # -------------------------------------------------------------
        if path in ['/register', '/api/register']:
            event_id = query.get('event_id', [None])[0] or query.get('eventId', [None])[0]
            user_id = query.get('user_id', [None])[0] or query.get('userId', [None])[0]
            token = query.get('token', [None])[0]

            if token:
                verified = verify_token(token)
                if verified:
                    if not event_id: event_id = verified.get('event_id')
                    if not user_id: user_id = verified.get('user_id')

            if not event_id or not user_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Both event_id and user_id are required"}).encode('utf-8'))
                return

            try:
                is_new, reg, event, user, token = perform_registration(event_id, user_id)
                redirect_target = f"/home.html?user_id={urllib.parse.quote(user_id)}&event_id={urllib.parse.quote(event_id)}{'&registered=1' if is_new else '&already_registered=1'}"

                accept_header = self.headers.get('Accept', '')
                if 'text/html' in accept_header and query.get('format', [None])[0] != 'json':
                    self.send_response(302)
                    self.send_header('Location', redirect_target)
                    self.end_headers()
                    return

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "message": "Registration confirmed" if is_new else "Already registered",
                    "isNew": is_new,
                    "redirect_url": redirect_target,
                    "registration": reg,
                    "event": event,
                    "user": user,
                    "token": token
                }).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        # -------------------------------------------------------------
        # Endpoint: /home (serves home.html or returns user JSON)
        # -------------------------------------------------------------
        if path in ['/home', '/home.html', '/api/home']:
            user_id = query.get('user_id', [None])[0] or query.get('userId', [None])[0]
            event_id = query.get('event_id', [None])[0] or query.get('eventId', [None])[0]
            accept_header = self.headers.get('Accept', '')

            # Browser navigation to /home without json format query
            if (path == '/home' or path == '/home.html') and 'text/html' in accept_header and query.get('format', [None])[0] != 'json':
                home_file = os.path.join(FRONTEND_DIR, 'home.html')
                if os.path.exists(home_file):
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    self.end_headers()
                    with open(home_file, 'rb') as f:
                        self.wfile.write(f.read())
                    return

            if not user_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "user_id query parameter is required"}).encode('utf-8'))
                return

            user = next((u for u in db["users"] if u.get("user_id") == user_id), None)
            if not user:
                # Auto-create lightweight profile if missing so user is never blocked
                clean_name = user_id.replace('usr_', '').replace('_', ' ').title()
                user = {
                    "user_id": user_id,
                    "name": clean_name,
                    "email": f"{user_id.lower()}@campus.edu",
                    "preferences": {
                        "role": "Participant",
                        "tshirtSize": "L",
                        "dietary": "Standard",
                        "track": "General",
                        "notifications": True,
                        "notes": ""
                    }
                }
                db["users"].append(user)
                save_db()

            user_regs = [r for r in db["registrations"] if r.get("user_id") == user_id or r.get("userId") == user_id]
            user_events = []
            for r in user_regs:
                ev_id = r.get("event_id") or r.get("eventId")
                matched_ev = next((e for e in db["events"] if e.get("event_id") == ev_id or e.get("id") == ev_id), None)
                if matched_ev:
                    merged = dict(matched_ev)
                    merged["registration"] = r
                    user_events.append(merged)

            active_event = None
            if event_id:
                active_event = next((e for e in user_events if e.get("event_id") == event_id or e.get("id") == event_id), None)
                if not active_event:
                    active_event = next((e for e in db["events"] if e.get("event_id") == event_id or e.get("id") == event_id), None)
            if not active_event and user_events:
                active_event = user_events[0]
            if not active_event and db["events"]:
                active_event = db["events"][0]

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "user": user,
                "registrations": user_regs,
                "events": user_events,
                "active_event": active_event
            }).encode('utf-8'))
            return

        # Events list API
        if path == '/api/events':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "events": db["events"]}).encode('utf-8'))
            return

        if path.startswith('/api/events/'):
            event_id = path.replace('/api/events/', '').strip('/')
            event = next((e for e in db["events"] if e.get("id") == event_id or e.get("event_id") == event_id), None)
            if event:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "event": event}).encode('utf-8'))
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Event not found"}).encode('utf-8'))
            return

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        body_str = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        try:
            body = json.loads(body_str or '{}')
        except:
            body = {}

        # -------------------------------------------------------------
        # Endpoint: POST /register & /api/register
        # -------------------------------------------------------------
        if path in ['/register', '/api/register']:
            event_id = body.get('event_id') or body.get('eventId')
            user_id = body.get('user_id') or body.get('userId')
            token = body.get('token')
            user_name = body.get('name')
            user_email = body.get('email')
            preferences = body.get('preferences')

            if token:
                verified = verify_token(token)
                if verified:
                    if not event_id: event_id = verified.get('event_id')
                    if not user_id: user_id = verified.get('user_id')

            if not event_id or not user_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Both event_id and user_id are required"}).encode('utf-8'))
                return

            try:
                is_new, reg, event, user, signed_tok = perform_registration(event_id, user_id, user_name, user_email, preferences)
                redirect_target = f"/home.html?user_id={urllib.parse.quote(user_id)}&event_id={urllib.parse.quote(event_id)}{'&registered=1' if is_new else '&already_registered=1'}"

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "message": "Registration confirmed" if is_new else "Already registered",
                    "isNew": is_new,
                    "redirect_url": redirect_target,
                    "registration": reg,
                    "event": event,
                    "user": user,
                    "token": signed_tok
                }).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        # -------------------------------------------------------------
        # Endpoint: POST /api/user/preferences
        # -------------------------------------------------------------
        if path in ['/api/user/preferences', '/api/users/preferences'] or path.startswith('/api/users/') and path.endswith('/preferences'):
            user_id = body.get('user_id') or body.get('userId')
            if not user_id and path.startswith('/api/users/'):
                user_id = path.split('/')[3]
            prefs = body.get('preferences') or body

            if not user_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "user_id is required"}).encode('utf-8'))
                return

            user = next((u for u in db["users"] if u.get("user_id") == user_id), None)
            if not user:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "User not found"}).encode('utf-8'))
                return

            if "preferences" not in user:
                user["preferences"] = {}
            user["preferences"].update(prefs)
            save_db()

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "preferences": user["preferences"], "user": user}).encode('utf-8'))
            return

        # -------------------------------------------------------------
        # Endpoint: POST /api/generate-qr
        # -------------------------------------------------------------
        if path == '/api/generate-qr':
            ev_id = body.get('event_id')
            u_id = body.get('user_id')
            if not ev_id or not u_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "event_id and user_id required"}).encode('utf-8'))
                return

            tok = sign_token({"event_id": ev_id, "user_id": u_id})
            host = self.headers.get('Host', f'localhost:{PORT}')
            qr_url = f"http://{host}/register?event_id={urllib.parse.quote(ev_id)}&user_id={urllib.parse.quote(u_id)}&token={tok}"
            dash_url = f"http://{host}/home.html?user_id={urllib.parse.quote(u_id)}&event_id={urllib.parse.quote(ev_id)}"

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "event_id": ev_id,
                "user_id": u_id,
                "token": tok,
                "qrUrl": qr_url,
                "directDashboardUrl": dash_url
            }).encode('utf-8'))
            return

        # Legacy notification route
        if path == '/api/notifications/send':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "Notification dispatched"}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()


if __name__ == '__main__':
    print(f"====================================================")
    print(f"⚡ EventHub Real-Time Server running on http://localhost:{PORT}")
    print(f"🚀 Automated QR Scan -> /register -> /home endpoints ACTIVE")
    print(f"====================================================")
    with socketserver.TCPServer(("", PORT), EventHandler) as httpd:
        httpd.serve_forever()
