const MONEYQUEST_SESSION_KEY = 'moneyquest_staff_session';
const MONEYQUEST_ADMIN_KEY = 'moneyquest_admin_profiles_v1';
const MONEYQUEST_AUTH_LOCK_KEY = 'moneyquest_auth_lockout_v1';
const MONEYQUEST_AUTH_LIMIT = { maxAttempts: 5, lockoutMs: 10 * 60 * 1000 };
const DEFAULT_ADMIN_USERNAME = 'AshrithMeda';
const DEFAULT_ADMIN_PASSWORD = 'meda8961*';
const DEFAULT_ADMIN_SALT = 'moneyquest-default-admin-salt-v1';
const ANALYTICS_VISITOR_KEY = 'moneyquest_analytics_visitor_v1';
const RELOAD_POLL_MS = 10000;
const pageStartedAt = new Date().toISOString();

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }

  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

function getAnalyticsVisitorId() {
  let visitorId = localStorage.getItem(ANALYTICS_VISITOR_KEY);
  if (!visitorId) {
    visitorId = crypto.randomUUID ? crypto.randomUUID() : `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(ANALYTICS_VISITOR_KEY, visitorId);
  }
  return visitorId;
}

async function trackPageView() {
  try {
    await supabaseRequest('site_analytics', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        visitor_id: getAnalyticsVisitorId(),
        path: `${location.pathname.split('/').pop() || 'index.html'}${location.search}`,
        referrer: document.referrer || null
      })
    });
  } catch (error) {
    console.warn('Analytics unavailable:', error.message);
  }
}

async function getSiteAnalytics() {
  return supabaseRequest('site_analytics?select=visitor_id,path,created_at&order=created_at.desc');
}

async function publishGlobalReload() {
  await supabaseRequest('site_reload_signals', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ requested_by: getCurrentStaffSession()?.username || 'admin' })
  });
}

function watchForGlobalReload() {
  let initialSignalId = null;
  let ready = false;

  const checkForReload = async () => {
    try {
      const signals = await supabaseRequest('site_reload_signals?select=id&order=created_at.desc&limit=1');
      const latestSignalId = signals?.[0]?.id || null;
      if (!ready) {
        initialSignalId = latestSignalId;
        ready = true;
        return;
      }
      if (latestSignalId && latestSignalId !== initialSignalId) location.reload();
    } catch (error) {
      console.warn('Global reload watcher unavailable:', error.message);
    }
  };

  checkForReload();
  window.setInterval(checkForReload, RELOAD_POLL_MS);
}

async function loadAppData() {
  const [events, registrations] = await Promise.all([
    supabaseRequest('events?select=*&order=date.asc'),
    supabaseRequest('registrations?select=*')
  ]);
  return { events, registrations: normalizeRegistrations(registrations) };
}

function normalizeRegistrations(registrations) {
  return registrations.map(registration => ({
    ...registration,
    eventId: registration.event_id,
    studentName: registration.student_name,
    parentName: registration.parent_name,
    parentEmail: registration.parent_email,
    parentPhone: registration.parent_phone,
    createdAt: registration.created_at
  }));
}

async function getEventById(id) {
  if (!id) return null;
  const events = await supabaseRequest(`events?id=eq.${encodeURIComponent(id)}&select=*`);
  return events[0] || null;
}

async function getEventRegistrations(eventId) {
  const registrations = await supabaseRequest(`registrations?event_id=eq.${encodeURIComponent(eventId)}&status=neq.cancelled&select=*`);
  return normalizeRegistrations(registrations);
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
  trackPageView();
  watchForGlobalReload();
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

async function getRegistrationSummary(eventId) {
  const registrations = await getEventRegistrations(eventId);
  const confirmed = registrations.filter(item => item.status === 'confirmed').length;
  const waitlist = registrations.filter(item => item.status === 'waitlist').length;
  return { confirmed, waitlist };
}

async function getEventCapacityStatus(eventId) {
  const event = await getEventById(eventId);
  if (!event) return { full: false, spotsLeft: 0, waitlist: 0 };
  const { confirmed, waitlist } = await getRegistrationSummary(eventId);
  const spotsLeft = Math.max(0, Number(event.capacity) - confirmed);
  return {
    full: confirmed >= Number(event.capacity),
    spotsLeft,
    waitlist
  };
}

async function addRegistration(payload) {
  const event = await getEventById(payload.eventId);
  if (!event) return { ok: false, message: 'Workshop not found.' };

  const { confirmed } = await getRegistrationSummary(payload.eventId);
  if (confirmed >= Number(event.capacity) && !event.waitlist_enabled) {
    return { ok: false, message: 'This workshop is currently full and the waitlist is not open.' };
  }

  const status = confirmed >= Number(event.capacity) ? 'waitlist' : 'confirmed';

  await supabaseRequest('registrations', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
    id: crypto.randomUUID ? crypto.randomUUID() : `reg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    event_id: payload.eventId,
    student_name: payload.studentName,
    age: payload.age,
    parent_name: payload.parentName,
    parent_email: payload.parentEmail,
    parent_phone: payload.parentPhone || '',
    consent: !!payload.consent,
    status,
    created_at: new Date().toISOString()
    })
  });

  return {
    ok: true,
    status,
    message: status === 'confirmed'
      ? 'Registration confirmed. A parent confirmation email is ready to send.'
      : 'This workshop is full, so you have been added to the waitlist.'
  };
}

async function deleteEvent(eventId) {
  await supabaseRequest(`events?id=eq.${encodeURIComponent(eventId)}`, { method: 'DELETE' });
}

async function deleteRegistration(registrationId) {
  const registrations = await supabaseRequest(`registrations?id=eq.${encodeURIComponent(registrationId)}&select=event_id`);
  await supabaseRequest(`registrations?id=eq.${encodeURIComponent(registrationId)}`, { method: 'DELETE' });
  if (registrations?.[0]?.event_id) await promoteWaitlistedRegistration(registrations[0].event_id);
}

async function updateRegistrationStatus(registrationId, status) {
  const existing = await supabaseRequest(`registrations?id=eq.${encodeURIComponent(registrationId)}&select=event_id,status`);
  const updated = await supabaseRequest(`registrations?id=eq.${encodeURIComponent(registrationId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status })
  });
  if (existing?.[0]?.event_id && existing[0].status === 'confirmed' && status !== 'confirmed') {
    await promoteWaitlistedRegistration(existing[0].event_id);
  }
  return normalizeRegistrations(updated || [])[0] || null;
}

async function promoteWaitlistedRegistration(eventId) {
  const event = await getEventById(eventId);
  if (!event?.waitlist_enabled) return null;

  const registrations = await getEventRegistrations(eventId);
  const confirmed = registrations.filter(item => item.status === 'confirmed').length;
  const next = registrations
    .filter(item => item.status === 'waitlist')
    .sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt))[0];

  if (confirmed >= Number(event.capacity) || !next) return null;
  return updateRegistrationStatusWithoutPromotion(next.id, 'confirmed');
}

async function updateRegistrationStatusWithoutPromotion(registrationId, status) {
  const updated = await supabaseRequest(`registrations?id=eq.${encodeURIComponent(registrationId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status })
  });
  return normalizeRegistrations(updated || [])[0] || null;
}

async function createEvent(payload) {
  const id = slugify(payload.title) + '-' + Date.now().toString().slice(-5);

  await supabaseRequest('events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
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
    highlights: payload.highlights || '',
    waitlist_enabled: !!payload.waitlist_enabled
    })
  });
  return id;
}

function isEventPast(event) {
  if (!event || !event.date) return false;
  return new Date(event.date).getTime() < Date.now();
}

async function updateEvent(eventId, payload) {
  const event = await getEventById(eventId);
  if (!event) return null;

  const updatedEvent = {
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
    highlights: payload.highlights !== undefined ? payload.highlights : (event.highlights || ''),
    waitlist_enabled: payload.waitlist_enabled !== undefined ? !!payload.waitlist_enabled : !!event.waitlist_enabled
  };

  const updated = await supabaseRequest(`events?id=eq.${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      title: updatedEvent.title,
      emoji: updatedEvent.emoji,
      date: updatedEvent.date,
      location: updatedEvent.location,
      capacity: updatedEvent.capacity,
      description: updatedEvent.description,
      financial_concepts: updatedEvent.financial_concepts,
      published: updatedEvent.published,
      photos: updatedEvent.photos,
      reflection: updatedEvent.reflection,
      highlights: updatedEvent.highlights,
      waitlist_enabled: updatedEvent.waitlist_enabled
    })
  });
  return updated[0] || updatedEvent;
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
    isDefault: true,
    role: 'owner'
  };

  saveAdminProfiles([profile]);
  return [profile];
}

function getAdminProfile() {
  const profiles = getAdminProfiles();
  const session = getCurrentStaffSession();
  return profiles.find(profile => profile.username === session?.username) || profiles[0] || null;
}

function getCurrentAdminRole() {
  return getAdminProfile()?.role || 'owner';
}

function hasAdminPermission(permission) {
  const role = getCurrentAdminRole();
  if (role === 'owner') return true;
  if (role === 'manager') return permission !== 'manageAdmins';
  return permission === 'view';
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

async function createAdminProfile(username, password, role = 'manager') {
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
    createdAt: new Date().toISOString(),
    role: ['manager', 'viewer'].includes(role) ? role : 'manager'
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
      setCurrentStaffSession({ username: profile.username, role: profile.role || 'owner', loggedInAt: new Date().toISOString() });
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
