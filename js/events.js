const box = document.getElementById('events');
const tabs = Array.from(document.querySelectorAll('[data-event-tab]'));
let activeTab = 'upcoming';

async function renderEventCards() {
  if (!box) return;

  const data = await loadAppData();
  const publishedEvents = data.events.filter(event => event.published !== false);
  const filtered = publishedEvents.filter(event => activeTab === 'past' ? isEventPast(event) : !isEventPast(event));

  if (!filtered.length) {
    const emptyText = activeTab === 'past'
      ? 'No past events have been archived yet.'
      : 'No workshops are scheduled yet. Check back soon for the next challenge.';

    box.innerHTML = `<article class="card event-banner-card"><h2>${activeTab === 'past' ? 'Past events' : 'No workshops yet.'}</h2><p class="muted">${emptyText}</p></article>`;
    return;
  }

  const summaries = await Promise.all(filtered.map(event => getRegistrationSummary(event.id)));
  box.innerHTML = filtered.map((event, index) => {
    const { confirmed, waitlist } = summaries[index];
    const spotsRemaining = Math.max(0, Number(event.capacity) - confirmed);
    const full = confirmed >= Number(event.capacity);
    const waitlistEnabled = !!event.waitlist_enabled;
    const isPast = isEventPast(event);

    return `
      <article class="card event-banner-card ${isPast ? 'event-banner-card--past' : ''}">
        <div class="event-banner-card__content">
          <div class="event-banner-card__icon">${esc(event.emoji || '🌟')}</div>
          <div class="event-banner-card__body">
            <div class="event-banner-card__topline">
              <span class="tag ${isPast ? 'full' : 'open'}">${isPast ? 'Past event' : 'Upcoming'}</span>
              <span class="muted">${formatDate(event.date)}</span>
            </div>
            <h2>${esc(event.title)}</h2>
            <p class="muted">${esc(event.location)}</p>
            <p>${esc(event.description)}</p>
            <div class="event-banner-card__tags">${(event.financial_concepts || []).map(item => `<span class="tag">${esc(item)}</span>`).join('')}</div>
          </div>
        </div>
        <div class="event-banner-card__footer">
          <strong>${isPast ? 'Archived event' : `${spotsRemaining} spots left`}</strong>
          ${isPast
            ? `<span class="btn disabled">View archive</span>`
            : (full
              ? (waitlistEnabled
                ? `<a class="btn primary" href="event.html?id=${encodeURIComponent(event.id)}">Join waitlist${waitlist ? ` (${waitlist} waiting)` : ''}</a>`
                : '<span class="btn disabled">Registration Full</span>')
              : `<a class="btn primary" href="event.html?id=${encodeURIComponent(event.id)}">View & sign up</a>`)}
        </div>
      </article>
    `;
  }).join('');
}

if (box) {
  const syncTabs = () => {
    tabs.forEach(tab => {
      const selected = tab.dataset.eventTab === activeTab;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    renderEventCards().catch(error => {
      box.innerHTML = `<div class="error">Unable to load workshops: ${esc(error.message)}</div>`;
    });
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.eventTab;
      syncTabs();
    });
  });

  syncTabs();
}
