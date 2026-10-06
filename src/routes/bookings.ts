import { Hono, type Context } from 'hono';
import type { Booking, Env } from '../db.js';

const bookings = new Hono<{ Bindings: Env }>();

const error = (c: Context, message: string, status: 400 | 404 | 409) =>
  c.json({ error: message }, status);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isValidDate = (value: string): boolean => !Number.isNaN(Date.parse(value));

const validateTimeRange = (startAt: string, endAt: string): string | null => {
  if (!isValidDate(startAt) || !isValidDate(endAt)) {
    return 'startAt and endAt must be valid dates';
  }
  if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
    return 'startAt must be before endAt';
  }
  return null;
};

const findBooking = (db: D1Database, id: string) =>
  db.prepare('SELECT id, equipmentId, borrowerName, startAt, endAt, purpose FROM bookings WHERE id = ?')
    .bind(id)
    .first<Booking>();

const equipmentExists = async (db: D1Database, equipmentId: string): Promise<boolean> =>
  Boolean(await db.prepare('SELECT id FROM equipment WHERE id = ?').bind(equipmentId).first());

const hasConflict = async (db: D1Database, equipmentId: string, startAt: string, endAt: string, excludeId?: string): Promise<boolean> => {
  const query = excludeId
    ? `SELECT id FROM bookings
       WHERE equipmentId = ? AND startAt < ? AND endAt > ? AND id != ?`
    : `SELECT id FROM bookings
       WHERE equipmentId = ? AND startAt < ? AND endAt > ?`;
  const parameters = excludeId
    ? [equipmentId, endAt, startAt, excludeId]
    : [equipmentId, endAt, startAt];
  return Boolean(await db.prepare(query).bind(...parameters).first());
};

bookings.get('/', async (c) => {
  const result = await c.env.DB
    .prepare('SELECT id, equipmentId, borrowerName, startAt, endAt, purpose FROM bookings ORDER BY startAt')
    .all<Booking>();
  return c.json(result.results);
});

bookings.get('/:id', async (c) => {
  const booking = await findBooking(c.env.DB, c.req.param('id'));
  return booking ? c.json(booking) : error(c, 'Booking not found', 404);
});

bookings.post('/', async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json<Record<string, unknown>>();
  } catch {
    return error(c, 'Request body must be valid JSON', 400);
  }

  const { equipmentId, borrowerName, startAt, endAt, purpose } = body;
  if (!isNonEmptyString(equipmentId) || !isNonEmptyString(borrowerName) ||
      !isNonEmptyString(startAt) || !isNonEmptyString(endAt) || !isNonEmptyString(purpose)) {
    return error(c, 'equipmentId, borrowerName, startAt, endAt and purpose are required', 400);
  }
  const timeError = validateTimeRange(startAt, endAt);
  if (timeError) return error(c, timeError, 400);
  if (!(await equipmentExists(c.env.DB, equipmentId))) return error(c, 'Equipment not found', 404);
  if (await hasConflict(c.env.DB, equipmentId, startAt, endAt)) {
    return error(c, 'Booking time conflicts with an existing booking', 409);
  }

  const booking: Booking = {
    id: crypto.randomUUID(),
    equipmentId,
    borrowerName,
    startAt,
    endAt,
    purpose
  };
  await c.env.DB.prepare(`
    INSERT INTO bookings (id, equipmentId, borrowerName, startAt, endAt, purpose)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(booking.id, booking.equipmentId, booking.borrowerName, booking.startAt, booking.endAt, booking.purpose).run();
  return c.json(booking, 201);
});

bookings.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const current = await findBooking(c.env.DB, id);
  if (!current) return error(c, 'Booking not found', 404);

  let body: Record<string, unknown>;
  try {
    body = await c.req.json<Record<string, unknown>>();
  } catch {
    return error(c, 'Request body must be valid JSON', 400);
  }

  const equipmentId = body.equipmentId === undefined ? current.equipmentId : body.equipmentId;
  const borrowerName = body.borrowerName === undefined ? current.borrowerName : body.borrowerName;
  const startAt = body.startAt === undefined ? current.startAt : body.startAt;
  const endAt = body.endAt === undefined ? current.endAt : body.endAt;
  const purpose = body.purpose === undefined ? current.purpose : body.purpose;

  if (!isNonEmptyString(equipmentId) || !isNonEmptyString(borrowerName) ||
      !isNonEmptyString(startAt) || !isNonEmptyString(endAt) || !isNonEmptyString(purpose)) {
    return error(c, 'equipmentId, borrowerName, startAt, endAt and purpose are required', 400);
  }
  const timeError = validateTimeRange(startAt, endAt);
  if (timeError) return error(c, timeError, 400);
  if (!(await equipmentExists(c.env.DB, equipmentId))) return error(c, 'Equipment not found', 404);
  if (await hasConflict(c.env.DB, equipmentId, startAt, endAt, id)) {
    return error(c, 'Booking time conflicts with an existing booking', 409);
  }

  await c.env.DB.prepare(`
    UPDATE bookings
    SET equipmentId = ?, borrowerName = ?, startAt = ?, endAt = ?, purpose = ?
    WHERE id = ?
  `).bind(equipmentId, borrowerName, startAt, endAt, purpose, id).run();
  return c.json(await findBooking(c.env.DB, id));
});

bookings.delete('/:id', async (c) => {
  const id = c.req.param('id');
  if (!(await findBooking(c.env.DB, id))) return error(c, 'Booking not found', 404);
  await c.env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run();
  return c.body(null, 204);
});

export default bookings;
