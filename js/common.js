const MONEYQUEST_STORAGE_KEY = 'moneyquest_local_data_v1';
const MONEYQUEST_SESSION_KEY = 'moneyquest_staff_session';
const MONEYQUEST_ADMIN_KEY = 'moneyquest_admin_profiles_v1';
const MONEYQUEST_AUTH_LOCK_KEY = 'moneyquest_auth_lockout_v1';
const MONEYQUEST_AUTH_LIMIT = { maxAttempts: 5, lockoutMs: 10 * 60 * 1000 };
const DEFAULT_ADMIN_USERNAME = 'AshrithMeda';
const DEFAULT_ADMIN_PASSWORD = 'meda8961*';
const DEFAULT_ADMIN_SALT = 'moneyquest-default-admin-salt-v1';

const defaultData = {
  events: [
    {
      id: 'island-survival',
      title: 'Survive the Island',
      emoji: '🏝️',
      date: '2026-09-12T10:00:00',
      location: 'Southside Community Center',
      capacity: 24,
      description: 'Teams make budget decisions, respond to unexpected events, and help each other escape a stranded-island challenge with real tradeoffs and limited resources.',
      financial_concepts: ['Budgeting', 'Emergency planning', 'Decision-making'],
      published: true
    },
    {
      id: 'startup-lab',
      title: 'Build a Business',
      emoji: '🚀',
      date: '2026-09-19T10:00:00',
      location: 'Downtown Learning Lab',
      capacity: 20,
      description: 'Students create a tiny product, price it, pitch it, and learn what actually makes a business sustainable.',
      financial_concepts: ['Pricing', 'Marketing', 'Profit'],
      published: true
    },
    {
      id: 'money-escape-room',
      title: 'Financial Escape Room',
      emoji: '🔐',
      date: '2026-10-03T11:00:00',
      location: 'North Campus Studio',
      capacity: 16,
      description: 'A timed puzzle challenge where students unlock each stage by solving money problems around saving, debt, investing, and values.',
      financial_concepts: ['Saving', 'Debt', 'Investing'],
      published: true
    }
  ],
  registrations: []
};

function loadAppData() {
  try {
    const raw = localStorage.getItem(MONEYQUEST_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MONEYQUEST_STORAGE_KEY, JSON.stringify(defaultData));
      return structuredClone(defaultData);
    }
    const parsed = JSON.parse(raw);
    return {
      events: Array.isArray(parsed.events) ? parsed.events : defaultData.events,
      registrations: Array.isArray(parsed.registrations) ? parsed.registrations : []
    };
  } catch (error) {
    localStorage.setItem(MONEYQUEST_STORAGE_KEY, JSON.stringify(defaultData));
    return structuredClone(defaultData);
  }
}

function saveAppData(data) {
  localStorage.setItem(MONEYQUEST_STORAGE_KEY, JSON.stringify(data));
}

function getEventById(id) {
  const { events } = loadAppData();
  return events.find(event => event.id === id) || null;
}

function getEventRegistrations(eventId) {
  const { registrations } = loadAppData();
  return registrations.filter(item => item.eventId === eventId && item.status !== 'cancelled');
}

function getCurrentStaffSession() {
  try {
    return JSON.parse(localStorage.getItem(MONEYQUEST_SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function setCurrentStaffSession(value) {
  if (value) {
    localStorage.setItem(MONEYQUEST_SESSION_KEY, JSON.stringify(value));
  } else {
    localStorage.removeItem(MONEYQUEST_SESSION_KEY);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const navItems = [
    { label: 'Home', href: 'index.html' },
    { label: 'About Us', href: 'about.html' },
    { label: 'Events', href: 'events.html' },
    { label: 'Get Involved', href: 'about.html' },
    { label: 'Admin Login', href: 'login.html', login: true },
    { label: 'Donate', href: '#', primary: true }
  ];

  const currentPage = location.pathname.split('/').pop() || 'index.html';
  const navMarkup = navItems.map(item => {
    const isActive = (item.href === 'index.html' && currentPage === 'index.html') || currentPage === item.href;
    const classes = ['nav-pill'];
    if (item.primary) classes.push('nav-pill--primary');
    if (item.login) classes.push('nav-pill--login');
    if (isActive && !item.primary && !item.login) classes.push('nav-pill--active');
    return `<a class="${classes.join(' ')}" href="${item.href}">${item.label}</a>`;
  }).join('');

  document.getElementById('nav').innerHTML = `
    <header class="nav">
      <div class="container nav-inner">
        <a class="brand" href="index.html">MoneyQuest</a>
        <nav class="navlinks" aria-label="Main navigation">${navMarkup}</nav>
      </div>
    </header>
  `;

  document.getElementById('footer').innerHTML = `
    <footer>
      <div class="container footer-inner">
        <b>MoneyQuest</b>
        <span>Financial literacy, turned into an adventure.</span>
        <span>© ${new Date().getFullYear()} MoneyQuest</span>
      </div>
    </footer>
  `;
});

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, x => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[x]));
}

function formatDate(value) {
  return new Date(value).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getId() {
  return new URLSearchParams(location.search).get('id');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'event';
}

function getRegistrationSummary(eventId) {
  const registrations = getEventRegistrations(eventId);
  const confirmed = registrations.filter(item => item.status === 'confirmed').length;
  const waitlist = registrations.filter(item => item.status === 'waitlist').length;
  return { confirmed, waitlist };
}

function getEventCapacityStatus(eventId) {
  const event = getEventById(eventId);
  if (!event) return { full: false, spotsLeft: 0, waitlist: 0 };
  const { confirmed, waitlist } = getRegistrationSummary(eventId);
  const spotsLeft = Math.max(0, Number(event.capacity) - confirmed);
  return {
    full: confirmed >= Number(event.capacity),
    spotsLeft,
    waitlist
  };
}

function addRegistration(payload) {
  const data = loadAppData();
  const event = getEventById(payload.eventId);
  if (!event) return { ok: false, message: 'Workshop not found.' };

  const { confirmed } = getRegistrationSummary(payload.eventId);
  const status = confirmed >= Number(event.capacity) ? 'waitlist' : 'confirmed';

  data.registrations.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `reg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    eventId: payload.eventId,
    studentName: payload.studentName,
    age: payload.age,
    parentName: payload.parentName,
    parentEmail: payload.parentEmail,
    parentPhone: payload.parentPhone || '',
    consent: !!payload.consent,
    status,
    createdAt: new Date().toISOString()
  });

  saveAppData(data);

  return {
    ok: true,
    status,
    message: status === 'confirmed'
      ? 'Registration confirmed. A parent confirmation email is ready to send.'
      : 'This workshop is full, so you have been added to the waitlist.'
  };
}

function deleteEvent(eventId) {
  const data = loadAppData();
  data.events = data.events.filter(event => event.id !== eventId);
  data.registrations = data.registrations.filter(reg => reg.eventId !== eventId);
  saveAppData(data);
}

function createEvent(payload) {
  const data = loadAppData();
  const id = slugify(payload.title) + '-' + Date.now().toString().slice(-5);

  data.events.push({
    id,
    title: payload.title,
    emoji: payload.emoji || '🌟',
    date: payload.date,
    location: payload.location,
    capacity: Number(payload.capacity) || 20,
    description: payload.description,
    financial_concepts: Array.isArray(payload.financial_concepts) ? payload.financial_concepts : [],
    published: true,
    photos: Array.isArray(payload.photos) ? payload.photos.filter(Boolean) : [],
    reflection: payload.reflection || '',
    highlights: payload.highlights || ''
  });

  saveAppData(data);
  return id;
}

function isEventPast(event) {
  if (!event || !event.date) return false;
  return new Date(event.date).getTime() < Date.now();
}

function updateEvent(eventId, payload) {
  const data = loadAppData();
  const event = data.events.find(item => item.id === eventId);
  if (!event) return null;

  Object.assign(event, {
    title: payload.title || event.title,
    emoji: payload.emoji || event.emoji || '🌟',
    date: payload.date || event.date,
    location: payload.location || event.location,
    capacity: Number(payload.capacity) || Number(event.capacity) || 20,
    description: payload.description || event.description,
    financial_concepts: Array.isArray(payload.financial_concepts) ? payload.financial_concepts : (event.financial_concepts || []),
    published: payload.published !== undefined ? !!payload.published : event.published,
    photos: Array.isArray(payload.photos) ? payload.photos.filter(Boolean) : (Array.isArray(event.photos) ? event.photos : []),
    reflection: payload.reflection !== undefined ? payload.reflection : (event.reflection || ''),
    highlights: payload.highlights !== undefined ? payload.highlights : (event.highlights || '')
  });

  saveAppData(data);
  return event;
}

function getAdminProfiles() {
  try {
    const raw = localStorage.getItem(MONEYQUEST_ADMIN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) return parsed;
    if (parsed && parsed.usernameHash && parsed.passwordHash) return [parsed];
    return [];
  } catch {
    return [];
  }
}

function saveAdminProfiles(profiles) {
  localStorage.setItem(MONEYQUEST_ADMIN_KEY, JSON.stringify(profiles));
}

async function ensureDefaultAdminProfile() {
  const profiles = getAdminProfiles();
  if (profiles.length) return profiles;

  const profile = {
    username: DEFAULT_ADMIN_USERNAME,
    usernameHash: await secureHash(DEFAULT_ADMIN_USERNAME.toLowerCase(), DEFAULT_ADMIN_SALT),
    passwordHash: await secureHash(DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_SALT),
    salt: DEFAULT_ADMIN_SALT,
    createdAt: new Date().toISOString(),
    isDefault: true
  };

  saveAdminProfiles([profile]);
  return [profile];
}

function getAdminProfile() {
  const profiles = getAdminProfiles();
  return profiles[0] || null;
}

function getAuthLockState() {
  try {
    return JSON.parse(localStorage.getItem(MONEYQUEST_AUTH_LOCK_KEY) || '{"attempts":0,"lockedUntil":null}');
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

function setAuthLockState(state) {
  localStorage.setItem(MONEYQUEST_AUTH_LOCK_KEY, JSON.stringify(state));
}

function resetAuthLockState() {
  setAuthLockState({ attempts: 0, lockedUntil: null });
}

async function secureHash(value, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(value),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 120000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return Array.from(new Uint8Array(derivedBits)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function createAdminProfile(username, password) {
  const trimmedUser = String(username || '').trim();
  const passwordValue = String(password || '');

  if (!trimmedUser || trimmedUser.length < 3 || passwordValue.length < 8) {
    throw new Error('Choose a username with at least 3 characters and a password with at least 8 characters.');
  }

  const existingProfiles = getAdminProfiles();
  const duplicate = existingProfiles.some(profile => profile.username.toLowerCase() === trimmedUser.toLowerCase());
  if (duplicate) {
    throw new Error('That admin username already exists. Please choose another one.');
  }

  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  const profile = {
    username: trimmedUser,
    usernameHash: await secureHash(trimmedUser.toLowerCase(), salt),
    passwordHash: await secureHash(passwordValue, salt),
    salt,
    createdAt: new Date().toISOString()
  };

  const updatedProfiles = [...existingProfiles, profile];
  saveAdminProfiles(updatedProfiles);
  resetAuthLockState();
  return profile;
}

function deleteAdminProfile(username) {
  const trimmedUser = String(username || '').trim();
  const profiles = getAdminProfiles().filter(profile => profile.username.toLowerCase() !== trimmedUser.toLowerCase());
  saveAdminProfiles(profiles);

  const currentSession = getCurrentStaffSession();
  if (currentSession && currentSession.username && currentSession.username.toLowerCase() === trimmedUser.toLowerCase()) {
    logoutStaff();
  }

  return profiles;
}

function isAdminLoggedIn() {
  return !!getCurrentStaffSession();
}

async function loginStaff(username, password) {
  let profiles = getAdminProfiles();
  if (!profiles.length) {
    profiles = await ensureDefaultAdminProfile();
  }

  const lockState = getAuthLockState();
  const now = Date.now();
  if (lockState.lockedUntil && now < Number(lockState.lockedUntil)) {
    return { ok: false, reason: 'locked_out', lockedUntil: Number(lockState.lockedUntil) };
  }

  const submittedUsername = String(username || '').trim().toLowerCase();
  const submittedPassword = String(password || '');

  for (const profile of profiles) {
    const usernameHash = await secureHash(submittedUsername, profile.salt);
    const passwordHash = await secureHash(submittedPassword, profile.salt);

    if (usernameHash === profile.usernameHash && passwordHash === profile.passwordHash) {
      resetAuthLockState();
      setCurrentStaffSession({ username: profile.username, loggedInAt: new Date().toISOString() });
      return { ok: true };
    }
  }

  const attempts = (Number(lockState.attempts) || 0) + 1;
  const lockedUntil = attempts >= MONEYQUEST_AUTH_LIMIT.maxAttempts ? now + MONEYQUEST_AUTH_LIMIT.lockoutMs : null;
  setAuthLockState({ attempts, lockedUntil });

  return {
    ok: false,
    reason: lockedUntil ? 'locked_out' : 'invalid',
    attemptsRemaining: Math.max(0, MONEYQUEST_AUTH_LIMIT.maxAttempts - attempts),
    lockedUntil
  };
}

function logoutStaff() {
  setCurrentStaffSession(null);
}
