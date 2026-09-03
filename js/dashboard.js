document.addEventListener('DOMContentLoaded', async () => {
  if (!isAdminLoggedIn()) {
    location.href = 'login.html';
    return;
  }

  const refreshBtn = document.getElementById('refresh');
  const reloadAllBtn = document.getElementById('reload-all');
  const logoutBtn = document.getElementById('logout');
  const eventForm = document.getElementById('event-form');
  const adminForm = document.getElementById('admin-form');
  const eventList = document.getElementById('event-list');
  const stats = document.getElementById('stats');
  const adminList = document.getElementById('admin-list');
  const eventDialog = document.getElementById('event-dialog');
  const registrationDialog = document.getElementById('registration-dialog');
  const registrationTable = document.getElementById('registration-table');
  const registrationFilter = document.getElementById('registration-event-filter');
  const registrationCount = document.getElementById('registration-count');
  const analyticsSummary = document.getElementById('analytics-summary');
  const currentRole = document.getElementById('current-role');
  const canManageEvents = hasAdminPermission('manageEvents');
  const canManageRegistrations = hasAdminPermission('manageRegistrations');
  const canManageAdmins = hasAdminPermission('manageAdmins');
  let dashboardData = { events: [], registrations: [] };

  currentRole.textContent = `${getCurrentAdminRole()} access`;
  if (!canManageEvents) eventForm?.closest('section')?.remove();
  if (!canManageAdmins) adminForm?.closest('section')?.remove();
  if (!canManageEvents) reloadAllBtn?.remove();

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logoutStaff();
      location.href = 'index.html';
    });
  }

  refreshBtn?.addEventListener('click', loadDashboard);

  reloadAllBtn?.addEventListener('click', async () => {
    if (!confirm('Reload the site for everyone currently visiting?')) return;
    reloadAllBtn.disabled = true;
    try {
      await publishGlobalReload();
      reloadAllBtn.textContent = 'Reload signal sent';
      setTimeout(() => {
        reloadAllBtn.textContent = 'Reload site for everyone';
        reloadAllBtn.disabled = false;
      }, 2500);
    } catch (error) {
      alert(`Unable to send reload signal: ${error.message}`);
      reloadAllBtn.disabled = false;
    }
  });

  eventForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.getElementById('event-message');
    try {
      await createEvent({
        title: document.getElementById('title').value.trim(),
        description: document.getElementById('description').value.trim(),
        date: document.getElementById('date').value,
        location: document.getElementById('location').value.trim(),
        capacity: Number(document.getElementById('capacity').value),
        emoji: document.getElementById('emoji').value.trim() || '🌟',
        financial_concepts: document.getElementById('concepts').value.split(',').map(item => item.trim()).filter(Boolean),
        waitlist_enabled: document.getElementById('waitlist-enabled').checked
      });
      message.textContent = 'Event created successfully.';
      message.className = 'notice';
      eventForm.reset();
      document.getElementById('capacity').value = '20';
      document.getElementById('emoji').value = '🌟';
      document.getElementById('concepts').value = 'Budgeting, Teamwork';
      await loadDashboard();
    } catch (error) {
      message.textContent = error.message;
      message.className = 'error';
    }
  });

  adminForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.getElementById('admin-message');
    try {
      await createAdminProfile(document.getElementById('new-admin-username').value.trim(), document.getElementById('new-admin-password').value, document.getElementById('new-admin-role').value);
      message.textContent = 'New admin account created successfully.';
      message.className = 'notice';
      adminForm.reset();
      await renderAdminList();
    } catch (error) {
      message.textContent = error.message;
      message.className = 'error';
    }
  });

  document.querySelectorAll('[data-close-dialog]').forEach(button => {
    button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog)?.close());
  });

  document.getElementById('event-editor-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!canManageEvents) return;
    const message = document.getElementById('archive-message');
    try {
      await updateEvent(document.getElementById('edit-event-id').value, {
        title: document.getElementById('edit-event-title').value.trim(),
        emoji: document.getElementById('edit-event-emoji').value.trim(),
        description: document.getElementById('edit-event-description').value.trim(),
        date: document.getElementById('edit-event-date').value,
        location: document.getElementById('edit-event-location').value.trim(),
        capacity: Number(document.getElementById('edit-event-capacity').value),
        financial_concepts: document.getElementById('edit-event-concepts').value.split(',').map(item => item.trim()).filter(Boolean),
        photos: document.getElementById('edit-event-photos').value.split(/[\n,]/).map(item => item.trim()).filter(Boolean),
        reflection: document.getElementById('edit-event-reflection').value.trim(),
        highlights: document.getElementById('edit-event-highlights').value.trim(),
        waitlist_enabled: document.getElementById('edit-event-waitlist').checked,
        published: document.getElementById('edit-event-published').checked
      });
      eventDialog.close();
      await loadDashboard();
    } catch (error) {
      message.textContent = error.message;
      message.className = 'error';
    }
  });

  registrationFilter?.addEventListener('change', renderRegistrations);

  async function loadDashboard() {
    try {
      const [appData, analytics] = await Promise.all([
        loadAppData(),
        getSiteAnalytics().catch(() => [])
      ]);
      dashboardData = appData;
      renderStats();
      renderAnalytics(analytics);
      renderEvents();
      populateRegistrationFilter();
      if (registrationDialog?.open) renderRegistrations();
    } catch (error) {
      eventList.innerHTML = `<div class="error">Unable to load dashboard data: ${esc(error.message)}</div>`;
    }
  }

  function renderAnalytics(analytics) {
    const today = Date.now() - 24 * 60 * 60 * 1000;
    const recentViews = analytics.filter(item => new Date(item.created_at).getTime() >= today);
    const visitors = new Set(analytics.map(item => item.visitor_id));
    const pageCounts = analytics.reduce((counts, item) => {
      const page = item.path.split('?')[0] || 'index.html';
      counts[page] = (counts[page] || 0) + 1;
      return counts;
    }, {});
    const topPage = Object.entries(pageCounts).sort((first, second) => second[1] - first[1])[0];
    analyticsSummary.innerHTML = `
      <div class="analytics-stat"><span>Page views</span><strong>${analytics.length}</strong><small>All recorded visits</small></div>
      <div class="analytics-stat"><span>Approx. visitors</span><strong>${visitors.size}</strong><small>Unique browser IDs</small></div>
      <div class="analytics-stat"><span>Last 24 hours</span><strong>${recentViews.length}</strong><small>Recent page views</small></div>
      <div class="analytics-stat"><span>Top page</span><strong>${esc(topPage?.[0] || 'No data')}</strong><small>${topPage?.[1] || 0} views</small></div>
    `;
  }

  function renderStats() {
    const activeRegistrations = dashboardData.registrations.filter(item => item.status !== 'cancelled');
    const confirmed = activeRegistrations.filter(item => item.status === 'confirmed').length;
    const waitlisted = activeRegistrations.filter(item => item.status === 'waitlist').length;
    const capacity = dashboardData.events.reduce((sum, event) => sum + Number(event.capacity || 0), 0);
    const upcoming = dashboardData.events.filter(event => !isEventPast(event)).length;
    stats.innerHTML = `
      <div class="stat-card stat-card--blue"><span class="stat-card__label">Total events</span><strong>${dashboardData.events.length}</strong><span class="stat-card__detail">${upcoming} upcoming</span></div>
      <div class="stat-card stat-card--yellow"><span class="stat-card__label">Registrations</span><strong>${confirmed}</strong><span class="stat-card__detail">${waitlisted} on waitlist</span></div>
      <div class="stat-card stat-card--green"><span class="stat-card__label">Open spots</span><strong>${Math.max(0, capacity - confirmed)}</strong><span class="stat-card__detail">Across all events</span></div>
      <div class="stat-card stat-card--pink"><span class="stat-card__label">Waitlist-ready</span><strong>${dashboardData.events.filter(event => event.waitlist_enabled).length}</strong><span class="stat-card__detail">Events accepting overflow</span></div>
    `;
  }

  function renderEvents() {
    if (!dashboardData.events.length) {
      eventList.innerHTML = '<div class="empty-dashboard"><strong>No events yet</strong><span>Create the first workshop to start building your schedule.</span></div>';
      return;
    }

    eventList.innerHTML = `
      <div class="event-table-wrap"><table class="event-table"><thead><tr><th>Event</th><th>Schedule</th><th>Attendance</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        ${dashboardData.events.map(event => {
          const registrations = dashboardData.registrations.filter(item => item.eventId === event.id && item.status !== 'cancelled');
          const confirmed = registrations.filter(item => item.status === 'confirmed').length;
          const waitlist = registrations.filter(item => item.status === 'waitlist').length;
          const full = confirmed >= Number(event.capacity || 0);
          return `<tr>
            <td><div class="event-table__name"><span class="event-table__emoji">${esc(event.emoji || '🌟')}</span><span><strong>${esc(event.title)}</strong><small>${esc(event.location)}</small></span></div></td>
            <td><strong>${formatDate(event.date)}</strong><small>${isEventPast(event) ? 'Past event' : 'Upcoming'}</small></td>
            <td><strong>${confirmed} / ${esc(event.capacity)}</strong><small>${waitlist} waitlisted</small></td>
            <td><span class="status-dot ${full ? 'status-dot--full' : 'status-dot--open'}">${full ? 'Full' : 'Open'}</span><small>${event.published === false ? 'Hidden' : 'Published'}</small></td>
            <td><div class="event-actions"><button class="btn secondary small" data-details="${esc(event.id)}">Registration Details</button>${canManageEvents ? `<button class="btn secondary small" data-edit="${esc(event.id)}">Edit details</button><button class="btn ${event.waitlist_enabled ? 'waitlist-on' : 'secondary'} small" data-waitlist="${esc(event.id)}">${event.waitlist_enabled ? 'Disable waitlist' : 'Enable waitlist'}</button><button class="icon-button danger" data-delete="${esc(event.id)}" aria-label="Delete event">×</button>` : ''}</div></td>
          </tr>`;
        }).join('')}
      </tbody></table></div>`;

    eventList.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => openEventEditor(button.dataset.edit)));
    eventList.querySelectorAll('[data-details]').forEach(button => button.addEventListener('click', () => openRegistrationDetails(button.dataset.details)));
    eventList.querySelectorAll('[data-waitlist]').forEach(button => button.addEventListener('click', async () => {
      const event = dashboardData.events.find(item => item.id === button.dataset.waitlist);
      await updateEvent(event.id, { waitlist_enabled: !event.waitlist_enabled });
      await loadDashboard();
    }));
    eventList.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', async () => {
      if (!confirm('Delete this event and all related registrations?')) return;
      await deleteEvent(button.dataset.delete);
      await loadDashboard();
    }));
  }

  function openEventEditor(eventId) {
    const event = dashboardData.events.find(item => item.id === eventId);
    if (!event) return;
    document.getElementById('edit-event-id').value = event.id;
    document.getElementById('edit-event-title').value = event.title || '';
    document.getElementById('edit-event-emoji').value = event.emoji || '🌟';
    document.getElementById('edit-event-description').value = event.description || '';
    document.getElementById('edit-event-date').value = event.date ? new Date(event.date).toISOString().slice(0, 16) : '';
    document.getElementById('edit-event-location').value = event.location || '';
    document.getElementById('edit-event-capacity').value = event.capacity || 20;
    document.getElementById('edit-event-concepts').value = (event.financial_concepts || []).join(', ');
    document.getElementById('edit-event-photos').value = (event.photos || []).join('\n');
    document.getElementById('edit-event-reflection').value = event.reflection || '';
    document.getElementById('edit-event-highlights').value = event.highlights || '';
    document.getElementById('edit-event-waitlist').checked = !!event.waitlist_enabled;
    document.getElementById('edit-event-published').checked = event.published !== false;
    eventDialog.showModal();
  }

  function populateRegistrationFilter() {
    const selected = registrationFilter.value;
    registrationFilter.innerHTML = '<option value="all">All events</option>' + dashboardData.events.map(event => `<option value="${esc(event.id)}">${esc(event.title)}</option>`).join('');
    registrationFilter.value = dashboardData.events.some(event => event.id === selected) ? selected : 'all';
  }

  function openRegistrationDetails(eventId) {
    registrationFilter.value = eventId;
    renderRegistrations();
    registrationDialog.showModal();
  }

  function renderRegistrations() {
    const selectedEvent = registrationFilter.value;
    const eventNames = Object.fromEntries(dashboardData.events.map(event => [event.id, event.title]));
    const rows = dashboardData.registrations.filter(registration => selectedEvent === 'all' || registration.eventId === selectedEvent);
    registrationCount.textContent = `${rows.length} registration${rows.length === 1 ? '' : 's'}`;
    if (!rows.length) {
      registrationTable.innerHTML = '<div class="empty-dashboard"><strong>No registrations found</strong><span>New sign-ups will appear here automatically.</span></div>';
      return;
    }
    registrationTable.innerHTML = `<table class="registration-table"><thead><tr><th>Event</th><th>Student</th><th>Parent / guardian</th><th>Contact</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(registration => `<tr><td>${esc(eventNames[registration.eventId] || 'Unknown event')}</td><td><strong>${esc(registration.studentName)}</strong><small>Age ${esc(registration.age)}</small></td><td>${esc(registration.parentName)}</td><td>${esc(registration.parentEmail)}<small>${esc(registration.parentPhone)}</small></td><td><select class="status-select" data-registration-status="${esc(registration.id)}" ${canManageRegistrations ? '' : 'disabled'}><option value="confirmed" ${registration.status === 'confirmed' ? 'selected' : ''}>Confirmed</option><option value="waitlist" ${registration.status === 'waitlist' ? 'selected' : ''}>Waitlist</option><option value="cancelled" ${registration.status === 'cancelled' ? 'selected' : ''}>Cancelled</option></select></td><td>${canManageRegistrations ? `<button class="btn danger small" data-registration-delete="${esc(registration.id)}">Remove</button>` : '<span class="muted">Read only</span>'}</td></tr>`).join('')}</tbody></table>`;
    registrationTable.querySelectorAll('[data-registration-status]').forEach(select => select.addEventListener('change', async () => {
      if (!canManageRegistrations) return;
      await updateRegistrationStatus(select.dataset.registrationStatus, select.value);
      await loadDashboard();
    }));
    registrationTable.querySelectorAll('[data-registration-delete]').forEach(button => button.addEventListener('click', async () => {
      if (!canManageRegistrations) return;
      if (!confirm('Remove this registration permanently?')) return;
      await deleteRegistration(button.dataset.registrationDelete);
      await loadDashboard();
    }));
  }

  async function renderAdminList() {
    if (!adminList) return;
    const profiles = await getAdminProfiles();
    adminList.innerHTML = profiles.length ? profiles.map(profile => `<div class="admin-item"><div class="admin-item__meta"><strong>${esc(profile.username || 'Admin')}</strong><span class="muted">${profile.username === 'admin' ? 'Owner account' : 'Shared admin'} · ${esc(profile.role || 'viewer')}</span></div>${profile.username === 'admin' ? '' : `<button class="btn danger small" data-remove-admin="${esc(profile.username)}">Remove</button>`}</div>`).join('') : '<p class="muted">No other admin logins yet.</p>';
    adminList.querySelectorAll('[data-remove-admin]').forEach(button => button.addEventListener('click', async () => {
      if (!confirm(`Remove admin ${button.dataset.removeAdmin}? This will delete their login access.`)) return;
      await deleteAdminProfile(button.dataset.removeAdmin);
      await renderAdminList();
    }));
  }

  await renderAdminList();
  await loadDashboard();
});
