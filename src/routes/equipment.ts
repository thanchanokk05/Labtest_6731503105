import { Hono } from 'hono';
import type { Env, Equipment } from '../db.js';

const equipment = new Hono<{ Bindings: Env }>();

equipment.get('/', async (c) => {
  const result = await c.env.DB
    .prepare('SELECT id, name, location FROM equipment ORDER BY id')
    .all<Equipment>();
  return c.json(result.results);
});

export default equipment;
