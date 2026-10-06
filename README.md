<div align="center">

# ⚡ EventHub

### Campus Event Platform — Registrations, QR Tickets & Check-In

[![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](LICENSE)

**EventHub** is a premium, fully responsive event management landing page built for college fests, hackathons, and campus events. Features a stunning dark UI with glassmorphism, animated QR check-in spotlight, real-time analytics section, and a two-panel login page.

[🚀 Live Demo / Website](https://eventhub-g-xrave.vercel.app/) · [🐛 Report Bug](https://github.com/gauravkumar-ops/eventhub/issues) · [✨ Request Feature](https://github.com/gauravkumar-ops/eventhub/issues)

</div>

---

## ✨ Features

- 🎨 **Premium Dark UI** — Deep purple/indigo theme with glassmorphism cards and neon accents
- ⚡ **Animated Hero** — Floating particle system, animated orbs, and scroll-triggered stat counters
- 🏛️ **Infinite Marquee** — Auto-scrolling college name strip
- 🧩 **Bento Feature Grid** — 8-card responsive layout showcasing platform capabilities
- 📧 **SendGrid & Twilio Automated Reminders** — Instant event summary dispatches to registered organizer email & automated SMS broadcast alerts for attendees
- ⚡ **Ultra-Fast Optical QR Scanner** — Hardware-accelerated GPU BarcodeDetector + ROI cropped jsQR for sub-millisecond decoding (< 5ms)
- 🚀 **Automated Participant Registration** — Instant QR decoding triggers `/register` endpoint, auto-provisions user profile, logs registration, and redirects to personalized dashboard
- 🎯 **Personalized Participant Dashboard (`/home`)** — Live attendee counter, kickoff countdown timer, saved preferences editor, and dynamic digital entry pass with confirmation QR
- 📡 **Real-Time WebSocket & Socket.io Sync** — Organizers and participants see instant attendee counter updates in real time
- 📱 **QR Check-In Spotlight** — Split-layout section with feature checklist
- 📊 **Analytics Dashboard** — Real dashboard preview with animated stats
- 🪗 **FAQ Accordion** — Smooth animated expand/collapse
- 🔐 **Login Page** — Two-panel layout with Google/GitHub social buttons, form validation, password toggle, and loading states
- 📱 **Fully Responsive** — Works beautifully from 480px to 4K
- ♿ **Accessible** — Unique IDs on all interactive elements, ARIA labels, semantic HTML

---

## 🗂️ Project Structure

```
eventhub/
├── frontend/                     # Client-side UI & Web pages
│   ├── assets/
│   │   └── images/               # High-res UI showcases & feature assets
│   ├── index.html                # Main landing page
│   ├── login.html                # Auth / sign-in portal
│   ├── signup.html               # Onboarding & registration
│   ├── dashboard.html            # Organizer management dashboard
│   ├── create-event.html         # Event creation & ticket designer
│   ├── event.html                # Public event view & registration
│   ├── register.html             # Academic user profile configuration
│   ├── ticket.html               # Dynamic QR pass viewer
│   ├── scanner.html              # Ultra-fast optical QR scanner & auto-registration trigger
│   ├── home.html                 # Personalized participant dashboard (/home)
│   ├── style.css                 # Material Design 3 design system & stylesheet
│   ├── app.js                    # Client-side routing & core UI interactions
│   ├── firebase-config.js        # Dynamic Firebase auth credentials loader
│   ├── supabaseClient.js         # Supabase client connector
│   └── src/components/           # React & Next.js components (FastQRScanner.jsx, PersonalizedDashboard.jsx)
├── database/
│   └── schema.sql                # PostgreSQL / Supabase DDL (users, events, registrations with JSONB)
├── backend/                      # Backend APIs & Serverless handlers
│   └── api/
│       ├── config.js             # Environment config resolver API
│       ├── cron/                 # Automated cron jobs (send-reminders.js)
│       └── notifications/        # Email (Nodemailer) & SMS (Twilio/Fast2SMS) dispatch APIs
├── server/                       # Standalone local servers & real-time socket gateway
│   ├── server.js                 # Express + Socket.io real-time server with /register & /home
│   ├── server_native.js          # Zero-dependency Node.js HTTP + SSE live stream server
│   ├── server.py                 # Zero-dependency Python 3 HTTP server with /register & /home
│   └── data_store.json           # Local development JSON persistence store
├── vercel.json                   # Cloud deployment routing & cron configuration
├── package.json                  # Node.js project & dependency management
├── .env.example                  # Environment variable reference template
├── .gitignore                    # Git exclusions
└── README.md                     # Root project documentation
```

---

## ⚡ Automated QR Scanning & Registration Workflow

1. **Ultra-Fast Optical Scan (< 5ms)**:
   - Uses native GPU-accelerated `BarcodeDetector` (1-2ms decode) with fallback to ROI-cropped `jsQR` (3-5ms decode).
   - Scans QR containing secure URL `https://.../register?event_id=evt_demo_01&user_id=usr_bala_01&token=...`.
2. **Backend Registration (`/register`)**:
   - Validates `user_id` and `event_id`.
   - Inserts registration into `registrations(reg_id, event_id, user_id, registered_at, ticket_id)`.
   - Emits real-time WebSocket update for organizer dashboards.
   - Responds with event details + participant data + redirect URL.
3. **Personalized Dashboard (`/home`)**:
   - Participant is redirected to `/home?user_id=XYZ&event_id=ABC`.
   - Displays event name, countdown, venue, and live attendee meter.
   - Shows user's saved preferences (role, track, t-shirt size, dietary) with in-place notes editor.
   - Generates verified gate entry pass with digital confirmation QR code.

---

## 🚀 Getting Started

### Run Locally

**Option 1 — Run with Python Server:**
```bash
python server/server.py
```
Then open **[http://localhost:3000](http://localhost:3000)**

**Option 2 — Run with Node.js & Socket.io Real-Time Server:**
```bash
npm start
```
or
```bash
node server/server.js
```
Then open **[http://localhost:3000](http://localhost:3000)**

---

## ⚙️ Environment Variables & Vercel Configuration

EventHub uses [`firebase-config.js`](file:///c:/Users/gaura/OneDrive/Desktop/eventhub/firebase-config.js) to dynamically resolve environment keys at runtime.

### Local Development
Create a `.env` file from the provided [`.env.example`](file:///c:/Users/gaura/OneDrive/Desktop/eventhub/.env.example):
```env
FIREBASE_API_KEY="your-firebase-api-key"
VITE_FIREBASE_API_KEY="your-firebase-api-key"
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
```

### Vercel Deployment
1. Import your repository on **[Vercel](https://vercel.com/)**.
2. Navigate to **Project Settings > Environment Variables**.
3. Add the following key:
   - Key: `FIREBASE_API_KEY` (or `NEXT_PUBLIC_FIREBASE_API_KEY` / `VITE_FIREBASE_API_KEY`)
   - Value: `<Your Firebase API Key>`
4. Redeploy project. EventHub will automatically load the environment key without exposing credentials in code commits.

---

## 📄 Pages

### `index.html` — Landing Page

| Section | Description |
|---|---|
| **Navbar** | Sticky frosted-glass nav with mobile hamburger menu |
| **Hero** | Animated headline, floating stat cards, particle effects, CTA buttons |
| **Marquee** | Infinite scroll strip of trusted college names |
| **Features** | 8-card bento grid (QR tickets, forms, analytics, check-in, etc.) |
| **QR Spotlight** | Left/right split layout with feature checklist |
| **How It Works** | 3-step visual flow with icons |
| **Analytics Spotlight** | Dashboard image with animated stat cards |
| **FAQ** | Animated accordion with 6 questions |
| **CTA Banner** | Full-width conversion section |
| **Footer** | 5-column footer with social links |

### `login.html` — Login Page

| Feature | Detail |
|---|---|
| Left branding panel | Animated orbs, particles, feature pills |
| Social login | Google + GitHub sign-in buttons |
| Email/Password form | Full client-side validation |
| Password visibility toggle | Show/hide with eye icon |
| Loading state | Spinner animation on submit |
| Error handling | Inline error messages |
| Demo login | `demo@eventhub.in` / `demo123` |

---

## 🎨 Design System

| Token | Value |
|---|---|
| **Background** | `#0a0818` (deep) · `#0f0c29` (dark) |
| **Primary Gradient** | `135deg, #7c3aed → #a855f7 → #ec4899` |
| **Text Gradient** | `#a78bfa → #f472b6 → #60a5fa` |
| **Accent Purple** | `#a78bfa` |
| **Heading Font** | Outfit (800–900 weight) |
| **Body Font** | Inter (400–600 weight) |
| **Border Radius** | `8px / 14px / 20px / 28px / 999px` |

---

## 🛠️ Built With

| Technology | Purpose |
|---|---|
| **HTML5** | Semantic page structure |
| **Vanilla CSS3** | Styling, animations, glassmorphism, responsive layout |
| **Vanilla JavaScript** | Interactivity — scroll animations, counters, FAQ, navbar |
| **[Lucide Icons](https://lucide.dev/)** | Icon library (CDN) |
| **[Google Fonts](https://fonts.google.com/)** | Inter + Outfit typefaces |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. **Fork** the repo
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a **Pull Request**

---

## 📝 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

## 👤 Author

**Gaurav Kumar**
- GitHub: [@gauravkumar-ops](https://github.com/gauravkumar-ops)
- Email: gauravkumarmgm@gmail.com

---

<div align="center">

Made with ❤️ for student organisers across India

⭐ **Star this repo if you found it helpful!** ⭐

</div>
