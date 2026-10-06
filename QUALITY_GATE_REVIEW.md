# Quality Gate Review

This review records findings from the implementation and the executable curl verification. Results below are filled from the actual local test run.

## Finding 1: Equipment existence

### What I Found

A booking must not reference an unknown equipment record.

### How I Fixed It

The create and update handlers query `equipment` with a bound `?` parameter before writing a booking.

### Evidence

The missing-equipment curl test was run with `equipmentId` set to `eq-999`.

Expected: `404 Not Found` with JSON error.

Actual: `404 Not Found`, `{ "error": "Equipment not found" }`.

## Finding 2: Overlap detection

### What I Found

The same equipment must reject overlapping time ranges while allowing consecutive ranges.

### How I Fixed It

The conflict query uses strict comparisons and binds equipment and time values. PATCH also binds and excludes the current booking ID.

### Evidence

A booking from 09:00 to 11:00 was followed by an attempt from 10:00 to 12:00.

Expected: `409 Conflict` with JSON error.

Actual: `409 Conflict`. The response was verified during the full HTTP run; the focused error-body checks also confirmed the shared JSON error format.

## Finding 3: Time-range validation

### What I Found

Invalid dates and ranges where the start is not before the end must be rejected before database writes.

### How I Fixed It

Both endpoints validate date parsing and compare timestamps before equipment and conflict checks.

### Evidence

A request with start 11:00 and end 09:00 was tested.

Expected: `400 Bad Request` with JSON error.

Actual: `400 Bad Request`, `{ "error": "startAt must be before endAt" }`.

## Verification Results

The service was started with `npm run dev` and the following cases were executed against `http://localhost:8787/api`:

| Case | Result |
| --- | --- |
| GET equipment | 200; two seeded records returned |
| POST booking | 201; generated UUID returned |
| GET all and one booking | 200 |
| PATCH purpose | 200; only purpose changed |
| Invalid range | 400 with JSON error |
| Missing equipment | 404 with JSON error |
| Overlapping booking | 409 |
| Consecutive booking | 201 |
| PATCH overlapping another booking | 409 |
| DELETE both bookings | 204 with no body |
| DELETE unknown booking | 404 with JSON error |

The TypeScript build also passed with `npm run build`. The initial `better-sqlite3` choice was rejected because this Windows Node 24 environment had no compatible prebuilt binary or C++ toolset; the implementation was changed to Node's built-in SQLite API and revalidated.
