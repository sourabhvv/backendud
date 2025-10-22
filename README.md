# B2B Platform Backend (Express + MongoDB)

## Setup
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and set values
4. Start: `npm run dev`

## Endpoints (prefix: /api)
- `POST /api/auth/register` {name, email, password}
- `POST /api/auth/login` {email, password}
- `GET /api/plans`
- `POST /api/plans/subscribe` (auth) {planId}
- `POST /api/org` (auth) -> create/update org
- `GET /api/org/mine` (auth)
- `GET /api/org/search?q=&category=`
- `GET/POST/DELETE /api/products` (auth)
- `GET/POST/DELETE /api/services` (auth)
- `POST /api/connect/request/:toOrgId` (auth)
- `POST /api/connect/respond/:id` (auth) {action: 'accepted'|'rejected'}
- `GET /api/connect/mine` (auth)
- `GET /api/chat/:withOrgId` (auth)
- `POST /api/chat/:withOrgId` (auth)

## Socket.io
- Connect to same server; emit `online` with userId, listen `receive-message`.
