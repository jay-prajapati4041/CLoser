# Closer

Closer is a full-stack lead and follow-up tracker. It provides private account workspaces, lead management, search and filtering, follow-up reminders, and CSV import/export.

## Tech stack

- **Frontend:** React 19, Vite 8
- **Backend:** Node.js, Express 5
- **Database:** MongoDB with Mongoose 9
- **Authentication:** bcrypt password hashes and opaque HttpOnly session cookies

## Features

- Register and sign in with account-specific sessions
- Create, view, edit, and delete leads
- Search leads by company, contact person, or phone
- Filter by status or city and sort by follow-up date or creation date
- Track overdue, due-today, and upcoming follow-ups
- Mark a lead as contacted or reschedule its next follow-up
- Import leads from CSV and export the current filtered list
- Keep lead records isolated to the signed-in account

## Lead fields

| Field | Notes |
|---|---|
| `company` | Required; up to 160 characters |
| `contactPerson` | Optional; up to 120 characters |
| `phone` | Optional; up to 40 characters |
| `email` | Optional; must be a valid email; up to 254 characters |
| `city` | Optional; up to 100 characters |
| `status` | `New`, `Contacted`, `Meeting`, `Won`, or `Lost` |
| `nextFollowUpDate` | Optional date in `YYYY-MM-DD` format |

## Prerequisites

- Node.js 20.19 or later
- npm
- MongoDB 7 or later, locally or from a hosted provider

## Local setup

1. Configure the API:

   ```powershell
   cd server
   Copy-Item .env.example .env
   npm install
   ```

2. Edit `server/.env` if needed:

   ```dotenv
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://127.0.0.1:27017/closer
   CLIENT_ORIGIN=http://localhost:5173
   ```

   `MONGODB_URI` is required. The API will not start without it.

3. Install and start the client:

   ```powershell
   cd ..\client
   npm install
   npm run dev
   ```

4. In a separate terminal, start the API:

   ```powershell
   cd server
   npm run dev
   ```

Open the Vite URL, normally `http://localhost:5173`. The Vite development server proxies `/api` requests to `http://localhost:5000`.

### Environment variables

**Server**

| Variable | Purpose | Default |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | Required |
| `PORT` | API listening port | `5000` |
| `NODE_ENV` | Set to `production` for secure HTTPS cookies | `development` |
| `CLIENT_ORIGIN` | Allowed browser origin(s), separated by commas | `http://localhost:5173` |

**Client/Vite**

| Variable | Purpose | Default |
|---|---|---|
| `API_PROXY_TARGET` | API target for the Vite `/api` proxy | `http://localhost:5000` |

Set `NODE_ENV=production` when the application is served over HTTPS. For multiple allowed client origins, use a comma-separated value for `CLIENT_ORIGIN`.

## CSV import and export

The import supports these column names:

```csv
companyName,contactPerson,phone,email,city,status,nextFollowUpDate
Acme Inc,Avery Morgan,+1 555 0100,avery@acme.example,Chicago,New,2026-12-01
```

The header may use `companyName` or `company`; `contactPerson`, `phone`, `email`, `city`, `status`, and `nextFollowUpDate` are optional. Valid rows are created for the signed-in user. Existing and in-file duplicates are reported as failed rows. CSV text is limited to 5 MB.

CSV export downloads the signed-in user's leads with the active search, status, city, and sort filters applied.

## API routes

### Authentication

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create an account and session |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/logout` | Invalidate the current session |
| `GET` | `/api/auth/me` | Return the signed-in user |

Authentication state is stored in the `closer_session` HttpOnly cookie. Session tokens are random 32-byte values; only their SHA-256 hashes are saved in MongoDB. Sessions expire after seven days.

### Leads

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/leads` | List filtered leads owned by the signed-in user |
| `POST` | `/api/leads` | Create a lead |
| `GET` | `/api/leads/follow-ups` | List scheduled, non-terminal follow-ups |
| `GET` | `/api/leads/:id` | Return one owned lead |
| `PATCH` | `/api/leads/:id` | Update one owned lead |
| `DELETE` | `/api/leads/:id` | Delete one owned lead |
| `POST` | `/api/leads/import` | Import CSV text |
| `GET` | `/api/leads/export.csv` | Download leads as CSV |

List requests accept `search`, `status`, `city`, and `sort` query parameters. Sort values are `followUpAsc`, `followUpDesc`, `newest`, and `oldest`.

## Tests

Run the server tests:

```powershell
cd server
npm test
```

The server test suite mocks the database and verifies lead CRUD behavior and user ownership isolation without a live MongoDB instance.

Run the client tests:

```powershell
cd client
npm test
```

The client test suite verifies local-calendar follow-up classification and terminal lead statuses.

## Production build

Build the frontend:

```powershell
cd client
npm run build
```

Start the API:

```powershell
cd server
npm start
```

The API exposes `/api/health` for health checks and `/` as a basic API status response.

## Vercel deployment

The repository root includes `api/index.js`, which adapts the Express application to Vercel's Node.js serverless runtime, and `vercel.json`, which routes requests to it.

Deploy from the repository root and configure these environment variables for both Production and Preview:

```dotenv
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=production
CLIENT_ORIGIN=https://your-client-domain.vercel.app
```

Use a comma-separated `CLIENT_ORIGIN` value if separate preview or production client domains are allowed. MongoDB Atlas must also allow Vercel connections under Network Access.
