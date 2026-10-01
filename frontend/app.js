/* ============================================================
   EventHub — app.js  (ES Module)
   Firebase imports MUST stay at the very top of the file.
   ============================================================ */

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirebaseAuth, checkFirebaseConfig } from "./firebase-config.js";

checkFirebaseConfig();
let auth = null;

getFirebaseAuth().then((a) => {
  auth = a;
  onAuthStateChanged(auth, (user) => {
    const navCta = document.querySelector('.nav-cta');
    if (!user) {
      const cached = localStorage.getItem('eventhub_user');
      if (cached && !allowPreview) {
        window.location.replace('dashboard.html');
        return;
      }
      if (cached) return;

      if (navCta) {
        navCta.innerHTML = `
          <a href="login.html?action=login" class="btn btn-ghost" id="login-btn">Log In</a>
          <a href="login.html?action=login" class="btn btn-primary" id="get-started-btn">Get Started Free</a>`;
      }
      return;
    }

    const stored = {
      uid:         user.uid,
      email:       user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'Organizer',
      photoURL:    user.photoURL || null
    };
    localStorage.setItem('eventhub_user', JSON.stringify(stored));

    if (!allowPreview) {
      window.location.replace('dashboard.html');
      return;
    }

    renderUserNav(stored.displayName, stored.photoURL, stored.email);
  });
}).catch(console.error);

/* ── Helpers ─────────────────────────────────────────────────── */

function renderUserNav(displayName, photoURL, email) {
  const navCta = document.querySelector('.nav-cta');
  if (!navCta) return;
  navCta.innerHTML = buildDropdownHTML(displayName, photoURL, email);
  if (window.lucide) window.lucide.createIcons();
  bindDropdownEvents();
}

function buildDropdownHTML(displayName, photoURL, email) {
  const initials = (displayName || '?')
    .split(' ').filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join('');

  const avatar = photoURL
    ? `<img src="${photoURL}" alt="${displayName}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
    : `<div style="width:34px;height:34px;border-radius:50%;background-color:var(--md-sys-color-primary-container);color:var(--md-sys-color-on-primary-container);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.82rem;flex-shrink:0;">${initials}</div>`;

  return `
    <div style="position:relative;" id="eh-user-wrap">
      <button id="eh-menu-btn" style="display:flex;align-items:center;gap:9px;background-color:var(--md-sys-color-surface-container-high);padding:4px 14px 4px 4px;border-radius:var(--md-sys-shape-corner-full);border:1px solid var(--md-sys-color-outline-variant);cursor:pointer;color:var(--md-sys-color-on-surface);transition:var(--transition);">
        ${avatar}
        <div style="text-align:left;line-height:1.2;pointer-events:none;">
          <div style="font-size:.84rem;font-weight:600;max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${displayName}</div>
          <div style="font-size:.68rem;color:var(--md-sys-color-on-surface-variant);">Organizer ▾</div>
        </div>
      </button>

      <div id="eh-dropdown" style="display:none;position:absolute;right:0;top:calc(100% + 10px);width:260px;background-color:var(--md-sys-color-surface-container-high);border:1px solid var(--md-sys-color-outline);border-radius:var(--md-sys-shape-corner-large);padding:8px;box-shadow:0 16px 48px rgba(0,0,0,.65);backdrop-filter:blur(24px);z-index:9999;">
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px 12px;border-bottom:1px solid var(--md-sys-color-outline-variant);margin-bottom:6px;">
          ${avatar}
          <div style="min-width:0;">
            <div style="font-size:.84rem;font-weight:700;color:var(--md-sys-color-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${displayName}</div>
            <div style="font-size:.72rem;color:var(--md-sys-color-on-surface-variant);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${email}</div>
          </div>
        </div>

        <a href="dashboard.html" style="display:flex;align-items:center;gap:9px;padding:10px 12px;font-size:.83rem;color:var(--md-sys-color-on-surface);border-radius:var(--md-sys-shape-corner-small);text-decoration:none;transition:var(--transition);">
          <i data-lucide="layout-dashboard" style="width:16px;height:16px;color:var(--md-sys-color-primary);"></i> Go to Dashboard
        </a>

        <a href="create-event.html" style="display:flex;align-items:center;gap:9px;padding:10px 12px;font-size:.83rem;color:var(--md-sys-color-on-surface);border-radius:var(--md-sys-shape-corner-small);text-decoration:none;transition:var(--transition);">
          <i data-lucide="calendar-plus" style="width:16px;height:16px;color:var(--md-sys-color-primary);"></i> Create Event
        </a>

        <a href="register.html" style="display:flex;align-items:center;gap:9px;padding:10px 12px;font-size:.83rem;color:var(--md-sys-color-on-surface);border-radius:var(--md-sys-shape-corner-small);text-decoration:none;transition:var(--transition);">
          <i data-lucide="user" style="width:16px;height:16px;color:var(--md-sys-color-primary);"></i> My Profile
        </a>

        <div style="height:1px;background-color:var(--md-sys-color-outline-variant);margin:4px 0;"></div>

        <button id="eh-signout" style="width:100%;display:flex;align-items:center;gap:9px;padding:10px 12px;font-size:.83rem;color:var(--md-sys-color-error);background:none;border:none;border-radius:var(--md-sys-shape-corner-small);cursor:pointer;text-align:left;transition:var(--transition);">
          <i data-lucide="log-out" style="width:16px;height:16px;"></i> Sign Out
        </button>
      </div>
    </div>`;
}

function bindDropdownEvents() {
  const btn      = document.getElementById('eh-menu-btn');
  const dropdown = document.getElementById('eh-dropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  });

  document.addEventListener('click', () => { if (dropdown) dropdown.style.display = 'none'; });

  document.getElementById('eh-signout')?.addEventListener('click', async () => {
    localStorage.removeItem('eventhub_user');
    sessionStorage.removeItem('eventhub_user');
    try {
      const a = auth || await getFirebaseAuth();
      await signOut(a);
    } catch (e) { console.warn('signOut error', e); }
    window.location.href = 'login.html?action=login';
  });
}

/* ── Page init ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();
  if (document.getElementById('eh-menu-btn')) bindDropdownEvents();

  // Run lifecycle purge for expired events on registered attendee devices
  if (typeof purgeExpiredEventsFromRegisteredDevices === 'function') {
    try { purgeExpiredEventsFromRegisteredDevices(); } catch (_) {}
  }

  initNavbar();
  initHamburger();
  initScrollAnimations();
  initCounters();
  initFAQ();
  initBackToTop();
  initSmoothScroll();
});

/* ── Navbar scroll ───────────────────────────────────────────── */
function initNavbar() {
  const n = document.getElementById('navbar');
  if (!n) return;
  window.addEventListener('scroll', () => n.classList.toggle('scrolled', window.scrollY > 20), { passive: true });
}

/* ── Hamburger ───────────────────────────────────────────────── */
function initHamburger() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => menu.classList.toggle('open'));
  menu.querySelectorAll('a').forEach(l => l.addEventListener('click', () => menu.classList.remove('open')));
}

/* ── Scroll animations ───────────────────────────────────────── */
function initScrollAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) { setTimeout(() => e.target.classList.add('visible'), i * 80); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('[data-animate]').forEach(el => obs.observe(el));
}

/* ── Counters ────────────────────────────────────────────────── */
function initCounters() {
  const els = document.querySelectorAll('.stat-num[data-target]');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); obs.unobserve(e.target); } });
  }, { threshold: 0.5 });
  els.forEach(el => obs.observe(el));
}
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const isFloat = target % 1 !== 0;
  const step   = target / (1800 / 16);
  let cur = 0;
  const t = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = isFloat ? cur.toFixed(1) : Math.floor(cur).toLocaleString();
    if (cur >= target) { el.textContent = isFloat ? target.toFixed(1) : target.toLocaleString(); clearInterval(t); }
  }, 16);
}

/* ── FAQ ─────────────────────────────────────────────────────── */
function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-question')?.addEventListener('click', () => {
      const open = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });
}

/* ── Back to top ─────────────────────────────────────────────── */
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 500), { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ── Smooth scroll ───────────────────────────────────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const t = document.querySelector(link.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
}
