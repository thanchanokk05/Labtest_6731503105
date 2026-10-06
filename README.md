# Campus Equipment Booking API

Backend-only REST API for reserving shared university equipment. It uses TypeScript, Hono, Cloudflare Workers, Cloudflare D1, and parameterized SQL. There is no frontend.

## Installation and Startup

Requirements: Node.js, npm, and a Cloudflare account for deployment.

```bash
npm install
npm run dev
```

`npm run dev` starts the Worker locally with Wrangler and its local D1 database. Apply the local migration with:

```bash
npm run db:migrate
```

For production, apply the migration to the remote D1 database and deploy the Worker:

```bash
npm run db:migrate:remote
npx wrangler deploy
```

Local API base URL: `http://localhost:8787/api`  
Deployed API base URL: `https://campus-equipment-booking-api.thanchanok-task-manager.workers.dev/api`

## Database Design

- Database: Cloudflare D1, named `campus-bookings`.
- Worker binding: `DB`.
- `equipment(id, name, location)` stores reservable resources.
- `bookings(id, equipmentId, borrowerName, startAt, endAt, purpose)` stores reservations.
- `bookings.equipmentId` is a foreign key to `equipment.id`.
- The D1 migration seeds `eq-1` (`Projector A`, `Building 1`) and `eq-2` (`Camera A`, `Building 2`).

```text
 equipment (1) -------- (N) bookings
```

## Endpoints

| Method | Path | Success |
| --- | --- | --- |
| GET | `/equipment` | 200 |
| GET | `/bookings` | 200 |
| GET | `/bookings/:id` | 200, or 404 |
| POST | `/bookings` | 201, or 400/404/409 |
| PATCH | `/bookings/:id` | 200, or 400/404/409 |
| DELETE | `/bookings/:id` | 204, or 404 |

See [API_CONTRACT.md](API_CONTRACT.md) for request and response details.

## Deployed API

The deployed Worker is available at:

`https://campus-equipment-booking-api.thanchanok-task-manager.workers.dev`

Available routes:

- `GET /api/equipment`
- `GET /api/bookings`
- `GET /api/bookings/:id`
- `POST /api/bookings`
- `PATCH /api/bookings/:id`
- `DELETE /api/bookings/:id`

## Business Rules

- Equipment must exist before a booking is created or updated.
- `startAt` and `endAt` must be valid dates, and `startAt` must be earlier.
- Overlap uses `existing.startAt < new.endAt AND existing.endAt > new.startAt`.
- Consecutive bookings are allowed because comparisons are strict.
- All request values are passed to D1 through prepared statements and `.bind()` parameters.
- Errors use `{ "error": "message" }` JSON.

## curl Tests

Set `API_BASE` to either the deployed API or the local API. On PowerShell, use `curl.exe` if `curl` resolves to `Invoke-WebRequest`.

```bash
API_BASE=https://campus-equipment-booking-api.thanchanok-task-manager.workers.dev/api

# 1. List equipment
curl -i "$API_BASE/equipment"

# 2. Create a booking; save the returned id
curl -i -X POST "$API_BASE/bookings" \
  -H "Content-Type: application/json" \
  -d '{"equipmentId":"eq-1","borrowerName":"Somchai Jaidee","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Class presentation"}'

# 3. List bookings
curl -i "$API_BASE/bookings"

# 4. Get one booking
curl -i "$API_BASE/bookings/{id}"

# 5. Update one field
curl -i -X PATCH "$API_BASE/bookings/{id}" \
  -H "Content-Type: application/json" \
  -d '{"purpose":"Updated presentation"}'

# 6. Invalid time range: expect 400
curl -i -X POST "$API_BASE/bookings" \
  -H "Content-Type: application/json" \
  -d '{"equipmentId":"eq-2","borrowerName":"Test User","startAt":"2026-10-20T11:00:00.000Z","endAt":"2026-10-20T09:00:00.000Z","purpose":"Invalid range"}'

# 7. Missing equipment: expect 404
curl -i -X POST "$API_BASE/bookings" \
  -H "Content-Type: application/json" \
  -d '{"equipmentId":"eq-999","borrowerName":"Test User","startAt":"2026-10-21T09:00:00.000Z","endAt":"2026-10-21T10:00:00.000Z","purpose":"Missing equipment"}'

# 8. Overlap against the booking from test 2: expect 409
curl -i -X POST "$API_BASE/bookings" \
  -H "Content-Type: application/json" \
  -d '{"equipmentId":"eq-1","borrowerName":"Another User","startAt":"2026-10-20T10:00:00.000Z","endAt":"2026-10-20T12:00:00.000Z","purpose":"Overlapping booking"}'

# 9. Delete one booking: expect 204
curl -i -X DELETE "$API_BASE/bookings/{id}"
```
