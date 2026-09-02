const box = document.getElementById('event');
const workshopId = getId();

if (box) (async () => {
  const workshop = await getEventById(workshopId);

  if (!workshop) {
    box.innerHTML = '<div class="error">No workshop selected.</div>';
  } else {
    const { confirmed } = await getRegistrationSummary(workshop.id);
    const full = confirmed >= Number(workshop.capacity);
    const waitlistEnabled = !!workshop.waitlist_enabled;

    box.innerHTML = `
      <div class="emoji hero-emoji">${esc(workshop.emoji || '🌟')}</div>
      <h1>${esc(workshop.title)}</h1>
      <p class="muted"><strong>${formatDate(workshop.date)}</strong> • ${esc(workshop.location)}</p>
      <p class="lead">${esc(workshop.description)}</p>
      <h3>What you’ll learn</h3>
      <div>${(workshop.financial_concepts || []).map(item => `<span class="tag">${esc(item)}</span>`).join('')}</div>
      <hr>
      <p class="muted"><strong>${confirmed}</strong> registered • <strong>${Math.max(0, Number(workshop.capacity) - confirmed)}</strong> spots left</p>
      ${full ? `<div class="${waitlistEnabled ? 'notice' : 'error'}">${waitlistEnabled ? 'This workshop is currently full. You can join the waitlist.' : 'This workshop is currently full and the waitlist is not open.'}</div>` : ''}
      <form id="registration-form" class="form-inner">
        <h2>Sign up</h2>
        <div class="row">
          <div class="field">
            <label>Student name</label>
            <input id="student_name" required>
          </div>
          <div class="field">
            <label>Student age</label>
            <input id="age" type="number" min="8" max="18" required>
          </div>
        </div>
        <div class="field">
          <label>Parent/guardian name</label>
          <input id="parent_name" required>
        </div>
        <div class="field">
          <label>Parent/guardian email</label>
          <input id="parent_email" type="email" required>
        </div>
        <div class="field">
          <label>Parent/guardian phone number</label>
          <input id="parent_phone" type="tel" inputmode="tel" required>
        </div>
        <label class="check">
          <input id="consent" type="checkbox" required>
          Parent/guardian confirms the information is accurate and agrees to the workshop registration.
        </label>
        <button class="btn primary" type="submit" ${full && !waitlistEnabled ? 'disabled' : ''}>${full ? 'Join Waitlist' : 'Reserve My Spot'}</button>
        <p id="reg-message"></p>
      </form>
    `;

    const form = document.getElementById('registration-form');
    if (form) {
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const studentName = document.getElementById('student_name').value.trim();
        const age = document.getElementById('age').value.trim();
        const parentName = document.getElementById('parent_name').value.trim();
        const parentEmail = document.getElementById('parent_email').value.trim();
        const parentPhone = document.getElementById('parent_phone').value.trim();
        const consent = document.getElementById('consent').checked;
        const message = document.getElementById('reg-message');

        if (!studentName || !age || !parentName || !parentEmail || !parentPhone || !consent) {
          message.className = 'error';
          message.textContent = 'Please complete all required fields and consent before submitting.';
          return;
        }

        const result = await addRegistration({
          eventId: workshop.id,
          studentName,
          age: Number(age),
          parentName,
          parentEmail,
          parentPhone,
          consent
        });

        if (!result.ok) {
          message.className = 'error';
          message.textContent = result.message;
          return;
        }

        alert(`Thank you for registering for our ${workshop.title} workshop! We hope to see you at ${workshop.location} on ${formatDate(workshop.date)}! If you have any questions regarding the event, please don't hesitate to contact us at moneyminds@gmail.com`);
        message.textContent = '';
        form.reset();
      });
    }
  }
})().catch(error => {
  box.innerHTML = `<div class="error">Unable to load this workshop: ${esc(error.message)}</div>`;
});
