document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const message = document.getElementById('message');

  if (isAdminLoggedIn()) {
    location.href = 'dashboard.html';
    return;
  }

  if (!loginForm) return;

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const username = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      message.textContent = 'Please enter both username and password.';
      message.className = 'error';
      return;
    }

    const result = await loginStaff(username, password);
    if (result.ok) {
      location.href = 'dashboard.html';
      return;
    }

    if (result.reason === 'locked_out') {
      const until = new Date(Number(result.lockedUntil)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      message.textContent = `Too many failed attempts. Please try again after ${until}.`;
    } else if (result.attemptsRemaining !== undefined) {
      message.textContent = `Invalid credentials. ${result.attemptsRemaining} attempts remaining.`;
    } else {
      message.textContent = 'Invalid staff credentials.';
    }

    message.className = 'error';
  });
});
