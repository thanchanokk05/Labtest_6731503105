# API Contract

Base URL: `http://localhost:8787/api`

All errors have this shape:

```json
{ "error": "A message explaining the problem" }
```

## GET /equipment

Returns all equipment. No request body or parameters.

- Success: `200 OK`, an array of `{ id, name, location }`.
- Errors: `500 Internal Server Error` for an unexpected server failure.

## GET /bookings

Returns all bookings. No request body or parameters.

- Success: `200 OK`, an array of bookings.
- Errors: `500 Internal Server Error` for an unexpected server failure.

## GET /bookings/:id

Returns one booking. The `id` path parameter is required.

- Success: `200 OK`, one booking.
- Error: `404 Not Found` when the booking does not exist.

## POST /bookings

Creates a booking. The server generates `id`.

Request JSON requires non-empty `equipmentId`, `borrowerName`, `startAt`, `endAt`, and `purpose`.

- Success: `201 Created`, the created booking.
- `400 Bad Request`: missing fields, invalid JSON, invalid dates, or `startAt >= endAt`.
- `404 Not Found`: `equipmentId` does not exist.
- `409 Conflict`: the equipment has an overlapping booking.

## PATCH /bookings/:id

Partially updates a booking. Any of `equipmentId`, `borrowerName`, `startAt`, `endAt`, and `purpose` may be supplied; omitted fields retain their current values.

- Success: `200 OK`, the updated booking.
- `400 Bad Request`: invalid JSON, empty values, invalid dates, or `startAt >= endAt`.
- `404 Not Found`: booking or equipment does not exist.
- `409 Conflict`: the updated range overlaps another booking. The current booking is excluded from this query.

## DELETE /bookings/:id

Deletes one booking. The `id` path parameter is required.

- Success: `204 No Content` with no response body.
- Error: `404 Not Found` when the booking does not exist.

## Data Model / ERD

```text
┌─────────────────────┐
│      equipment      │
├─────────────────────┤
│ PK id               │
│ name                │
│ location            │
└──────────┬──────────┘
           │ 1
           │
           │ N
┌──────────▼──────────┐
│      bookings       │
├─────────────────────┤
│ PK id               │
│ FK equipmentId      │
│ borrowerName        │
│ startAt             │
│ endAt               │
│ purpose             │
└─────────────────────┘
```
