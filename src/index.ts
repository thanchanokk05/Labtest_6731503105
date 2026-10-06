import { Hono } from 'hono';
import type { Env } from './db.js';
import bookings from './routes/bookings.js';
import equipment from './routes/equipment.js';

const app = new Hono<{ Bindings: Env }>();

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: 'Internal server error' }, 500);
});

app.route('/api/equipment', equipment);
app.route('/api/bookings', bookings);

app.notFound((c) => c.json({ error: 'Route not found' }, 404));

export default app;
