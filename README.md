# MoneyQuest

A simple static website for a youth financial literacy nonprofit. Events and registrations are shared through Supabase so updates are available across devices.

## Files
- `index.html` — homepage
- `events.html` — public workshops
- `event.html?id=EVENT_ID` — workshop detail page
- `about.html` — about page
- `login.html` — staff access placeholder
- `dashboard.html` — admin placeholder
- `css/style.css` — all styling
- `js/*.js` — static site behavior and content
- `supabase/schema.sql` — database tables and policies

## Run locally
1. Open the folder in a browser, or use a simple local static server such as VS Code Live Server.
2. Navigate to `index.html`.
3. If needed, preview `events.html` or `event.html` directly in the browser.

## Supabase setup
1. Open the Supabase project connected in `js/config.js`.
2. Open the SQL Editor and run `supabase/schema.sql` once.
3. Host the site over `http://localhost` or HTTPS so browser requests to Supabase are allowed.

Run `supabase/schema.sql` again after dashboard upgrades. It creates the analytics and global reload-signal tables used by the staff dashboard.

The same migration creates the shared owner login: username `admin`, password `Moneymind1234*`. New admin accounts created from the dashboard are stored in Supabase and work across devices.

## Hosting
This folder can be hosted on any static host such as GitHub Pages, Netlify, Cloudflare Pages, or a traditional web host.
