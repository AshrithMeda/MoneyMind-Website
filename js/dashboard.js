document.addEventListener('DOMContentLoaded', () => {
  if (!isAdminLoggedIn()) {
    location.href = 'login.html';
    return;
  }

  const refreshBtn = document.getElementById('refresh');
  const logoutBtn = document.getElementById('logout');
  const eventForm = document.getElementById('event-form');
  const adminForm = document.getElementById('admin-form');
  const eventList = document.getElementById('event-list');
  const stats = document.getElementById('stats');
  const adminList = document.getElementById('admin-list');
  const editEventSelect = document.getElementById('edit-event-id');
  const editEventTitle = document.getElementById('edit-event-title');
  const editEventDate = document.getElementById('edit-event-date');
  const editEventLocation = document.getElementById('edit-event-location');
  const editEventDescription = document.getElementById('edit-event-description');
  const editEventPhotos = document.getElementById('edit-event-photos');
  const editEventReflection = document.getElementById('edit-event-reflection');
  const editEventHighlights = document.getElementById('edit-event-highlights');
  const editEventForm = document.getElementById('event-editor-form');
  const archiveMessage = document.getElementById('archive-message');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logoutStaff();
      location.href = 'index.html';
    });
  }

  if (refreshBtn) refreshBtn.addEventListener('click', renderDashboard);

  if (eventForm) {
    eventForm.addEventListener('submit', event => {
      event.preventDefault();
      const message = document.getElementById('event-message');
      const title = document.getElementById('title').value.trim();
      const description = document.getElementById('description').value.trim();
      const date = document.getElementById('date').value;
      const location = document.getElementById('location').value.trim();
      const capacity = Number(document.getElementById('capacity').value);
      const emoji = document.getElementById('emoji').value.trim() || '🌟';
      const concepts = document.getElementById('concepts').value.split(',').map(item => item.trim()).filter(Boolean);

      if (!title || !description || !date || !location || !Number.isFinite(capacity) || capacity < 1) {
        message.textContent = 'Please complete the event form with valid details.';
        message.className = 'error';
        return;
      }

      createEvent({ title, description, date, location, capacity, emoji, financial_concepts: concepts });
      message.textContent = 'Event created successfully.';
      message.className = 'notice';
      eventForm.reset();
      document.getElementById('capacity').value = '20';
      document.getElementById('emoji').value = '🌟';
      document.getElementById('concepts').value = 'Budgeting, Teamwork';
      renderDashboard();
    });
  }

  if (adminForm) {
    adminForm.addEventListener('submit', async event => {
      event.preventDefault();
      const message = document.getElementById('admin-message');
      const username = document.getElementById('new-admin-username').value.trim();
      const password = document.getElementById('new-admin-password').value;

      try {
        await createAdminProfile(username, password);
        message.textContent = 'New admin account created successfully.';
        message.className = 'notice';
        adminForm.reset();
        renderAdminList();
      } catch (error) {
        message.textContent = error.message;
        message.className = 'error';
      }
    });
  }

  renderAdminList();
  renderDashboard();
  populateArchiveEditor();

  function populateArchiveEditor() {
    if (!editEventSelect) return;

    const { events } = loadAppData();
    const pastEvents = events.filter(event => isEventPast(event));

    if (!pastEvents.length) {
      editEventSelect.innerHTML = '<option value="">No past events yet</option>';
      return;
    }

    editEventSelect.innerHTML = pastEvents.map(event => `<option value="${event.id}">${esc(event.title)}</option>`).join('');

    const selectedId = editEventSelect.value || pastEvents[0].id;
    const selectedEvent = pastEvents.find(event => event.id === selectedId) || pastEvents[0];
    if (!selectedEvent) return;

    editEventSelect.value = selectedEvent.id;
    editEventTitle.value = selectedEvent.title || '';
    editEventDate.value = selectedEvent.date ? new Date(selectedEvent.date).toISOString().slice(0, 16) : '';
    editEventLocation.value = selectedEvent.location || '';
    editEventDescription.value = selectedEvent.description || '';
    editEventPhotos.value = Array.isArray(selectedEvent.photos) ? selectedEvent.photos.join('\n') : '';
    editEventReflection.value = selectedEvent.reflection || '';
    editEventHighlights.value = selectedEvent.highlights || '';
  }

  if (editEventSelect) {
    editEventSelect.addEventListener('change', () => {
      const { events } = loadAppData();
      const selected = events.find(event => event.id === editEventSelect.value);
      if (!selected) return;
      editEventTitle.value = selected.title || '';
      editEventDate.value = selected.date ? new Date(selected.date).toISOString().slice(0, 16) : '';
      editEventLocation.value = selected.location || '';
      editEventDescription.value = selected.description || '';
      editEventPhotos.value = Array.isArray(selected.photos) ? selected.photos.join('\n') : '';
      editEventReflection.value = selected.reflection || '';
      editEventHighlights.value = selected.highlights || '';
    });
  }

  if (editEventForm) {
    editEventForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!editEventSelect.value) {
        archiveMessage.textContent = 'There are no past events to update yet.';
        archiveMessage.className = 'error';
        return;
      }

      const photos = editEventPhotos.value
        .split(/\n|,/)
        .map(item => item.trim())
        .filter(Boolean);

      updateEvent(editEventSelect.value, {
        title: editEventTitle.value.trim(),
        date: editEventDate.value,
        location: editEventLocation.value.trim(),
        description: editEventDescription.value.trim(),
        photos,
        reflection: editEventReflection.value.trim(),
        highlights: editEventHighlights.value.trim()
      });

      archiveMessage.textContent = 'Past event details saved successfully.';
      archiveMessage.className = 'notice';
      renderDashboard();
      populateArchiveEditor();
    });
  }

  function renderAdminList() {
    if (!adminList) return;

    const profiles = getAdminProfiles();
    if (!profiles.length) {
      adminList.innerHTML = '<p class="muted">No other admin logins yet.</p>';
      return;
    }

    adminList.innerHTML = profiles.map(profile => `
      <div class="admin-item">
        <div class="admin-item__meta">
          <strong>${esc(profile.username || 'Admin')}</strong>
          <span class="muted">${profile.isDefault ? 'Default admin' : 'Custom admin'}</span>
        </div>
        <button class="btn danger small" data-remove-admin="${esc(profile.username)}">Remove</button>
      </div>
    `).join('');

    adminList.querySelectorAll('[data-remove-admin]').forEach(button => {
      button.addEventListener('click', () => {
        const username = button.dataset.removeAdmin;
        if (!confirm(`Remove admin ${username}? This will delete their login access.`)) return;
        deleteAdminProfile(username);
        renderAdminList();
      });
    });
  }

  function renderDashboard() {
    const { events, registrations } = loadAppData();
    const totalRegistrations = registrations.filter(item => item.status !== 'cancelled').length;
    const totalCapacity = events.reduce((sum, event) => sum + Number(event.capacity || 0), 0);
    const fullEvents = events.filter(event => getEventRegistrations(event.id).filter(item => item.status === 'confirmed').length >= Number(event.capacity || 0)).length;

    stats.innerHTML = `
      <div class="card"><div class="stat">${events.length}</div><div class="muted">Events</div></div>
      <div class="card"><div class="stat">${totalRegistrations}</div><div class="muted">Registrations</div></div>
      <div class="card"><div class="stat">${Math.max(0, totalCapacity - totalRegistrations)}</div><div class="muted">Open spots</div></div>
      <div class="card"><div class="stat">${fullEvents}</div><div class="muted">Full events</div></div>
    `;

    if (!events.length) {
      eventList.innerHTML = '<p class="muted">No events yet.</p>';
      return;
    }

    eventList.innerHTML = events.map(event => {
      const regs = getEventRegistrations(event.id);
      const confirmed = regs.filter(item => item.status === 'confirmed').length;
      const waitlist = regs.filter(item => item.status === 'waitlist').length;
      const full = confirmed >= Number(event.capacity || 0);
      const registrationMarkup = regs.length
        ? regs.map(reg => `
            <div class="registration-item">
              <div><strong>${esc(reg.studentName || 'Student')}</strong> · Age ${esc(reg.age || '—')}</div>
              <div class="muted">Parent/guardian: ${esc(reg.parentName || '—')}</div>
              <div class="muted">Email: ${esc(reg.parentEmail || '—')}</div>
              <div class="muted">Phone: ${esc(reg.parentPhone || '—')}</div>
              <span class="tag ${reg.status === 'waitlist' ? 'waitlist' : 'open'}">${esc(reg.status.toUpperCase())}</span>
            </div>
          `).join('')
        : '<p class="muted">No registrations yet.</p>';

      return `
        <div class="eventrow">
          <div>
            <b>${esc(event.emoji || '🌟')} ${esc(event.title)}</b>
            <div class="muted">${formatDate(event.date)} • ${esc(event.location)}</div>
          </div>
          <div>
            <b>${confirmed}/${event.capacity}</b>
            <div class="muted">registered</div>
          </div>
          <div>
            <span class="tag ${full ? 'full' : 'open'}">${full ? 'FULL' : 'OPEN'}</span>
            ${waitlist ? `<span class="tag waitlist">WAITLIST ${waitlist}</span>` : ''}
          </div>
          <button class="btn danger small" data-delete="${event.id}">Delete</button>
        </div>
        <div class="registration-panel">${registrationMarkup}</div>
      `;
    }).join('');

    eventList.querySelectorAll('[data-delete]').forEach(button => {
      button.addEventListener('click', () => {
        const eventId = button.dataset.delete;
        if (!confirm('Delete this event and all related registrations?')) return;
        deleteEvent(eventId);
        renderDashboard();
      });
    });
  }
});
