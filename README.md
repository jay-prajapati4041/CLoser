# Closer — Lead & Follow-up Tracker

The client uses React, and the API uses native JavaScript ES modules. Module 1 sets up private user accounts and the authentication foundation for the lead tracker.

## Run locally

Requirements: Node.js 20.19+ and MongoDB 7+ (local or hosted).

1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` to your database connection string.
2. In one terminal, run `cd server`, `npm install`, then `npm run dev`.
3. In another terminal, run `cd client`, `npm install`, then `npm run dev`.
4. Open the Vite URL (usually `http://localhost:5173`).

The client proxies `/api` requests to `http://localhost:5000`. Set `API_PROXY_TARGET` if your API runs elsewhere. Set `CLIENT_ORIGIN` on the server to the exact client origin; multiple allowed origins can be comma-separated.

## Authentication foundation

- Register, sign in, and sign out are backed by MongoDB.
- Passwords are hashed with bcrypt; the password hash is excluded from normal user queries.
- Sessions use random opaque tokens in `HttpOnly`, `SameSite=Lax` cookies. Only a SHA-256 hash of each token is stored in MongoDB; sessions expire after seven days and are invalidated on sign out.
- Authentication endpoints have an attempt limit, and state-changing requests require an allowed browser origin.
- `GET /api/auth/me` and `GET /api/leads` are protected. Leads are queried by their required `owner` field so one account cannot read another account's records.
- Client components and server modules include short comments describing their purpose.

Set `NODE_ENV=production` when serving over HTTPS so session cookies are marked `Secure`. The API does not start without `MONGODB_URI`.

## Module 2: Lead management

- Add, list, view, edit, and delete leads with company, contact, phone, email, city, status, and next follow-up date.
- Lead create, list, detail, update, and delete endpoints all require a valid session and scope database queries to the signed-in user.
- Client forms and server validation enforce required company names, valid email addresses, allowed statuses, date format, and field limits. The client cannot set a lead owner.
- Run `cd server && npm test` to run the lead CRUD and ownership checks without connecting to MongoDB.

## Module 3: Follow-up management

- `GET /api/leads/follow-ups` returns only the signed-in user's scheduled leads that are not Won or Lost.
- The dashboard calculates Overdue, Due Today, and Upcoming from the saved date and the user's current local calendar day; the calculated category is never stored in MongoDB.
- Use Reschedule to update the saved follow-up date, or Mark contacted to change the lead status to Contacted. Won/Lost leads are removed from active reminders.
- Run `cd client && npm test` for date-boundary and terminal-status classification tests.
