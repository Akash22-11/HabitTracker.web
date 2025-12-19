# HabitTracker.web
# HealthTracker — Exercise / Habits Page

What this contains
- A responsive exercise/habits page with a calendar, daily habit checkboxes, monthly goals, animations, and per-username storage via `localStorage`.
- Export / Import JSON for backup or to move to a server.
- Clean HTML/CSS/JS (vanilla) so you can merge it easily with your site.

How data is stored
- localStorage key: `healthtracker:{username}`
- Structure:
  {
    habits: { id: { id, name, color } },
    entries: { "YYYY-MM-DD": { habitId: boolean, ... }, ... },
    goals: { "YYYY-MM": [ { id, title, target } ] }
  }

How to integrate
- Copy files into a folder in your site.
- Import `styles.css` in head and `app.js` before the closing `</body>`.
- If you have an app wrapper, you can embed the `#app` element or adapt the markup.

Upgrading to a real backend
- Replace localStorage operations in `app.js` with fetch() calls to your REST endpoints.
- Suggested endpoints:
  - GET /users/{username}/data
  - POST /users/{username}/data
  - PATCH /users/{username}/entries
- I left clear helper functions where to swap storage.

If you want, I can:
- Convert to React / Vue
- Add authentication and a server (Node/Express + DB)
- Provide a JSON API spec
