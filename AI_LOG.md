# AI Log

## AI Usage

AI was used to help design the REST endpoints, SQLite schema, Hono route structure, validation messages, overlap query, SQL parameter binding, documentation, and curl test cases. The implementation was kept backend-only and reviewed against the requested status codes.

## Changes Made After Suggestions

The generated structure was adapted to an empty workspace using the Node Hono adapter and local SQLite. The API uses explicit route handlers and small validation helpers so the implementation can be explained independently. No frontend code was generated.

## Personal Verification

Verification was performed against the running server with PowerShell's HTTP client. The observed results are recorded in `QUALITY_GATE_REVIEW.md`; the documented curl commands remain available for repeatable manual testing.

## What I Understand

Two bookings conflict only when they are for the same equipment and:

```text
existing.startAt < new.endAt
AND existing.endAt > new.startAt
```

Strict comparisons allow one booking to begin exactly when another ends. HTTP `409 Conflict` communicates that a valid-looking request conflicts with an existing reservation.
