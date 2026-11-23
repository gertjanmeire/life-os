import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';

export type Kind = 'task' | 'event' | 'note';

export interface Area {
	id: string;
	name: string;
	color: string;
}

export interface Item {
	id: string;
	kind: Kind;
	title: string;
	area_id: string | null;
	date: string | null;
	time: string | null;
	done: number;
	important: number;
}

/** Bindings en variabelen uit wrangler.jsonc (lokaal nagebootst tijdens `npm run dev`). */
export function getDb(): D1Database {
	const db = env.DB;
	if (!db) error(500, 'De database is niet beschikbaar.');
	return db;
}

export const ownerName = (): string => env.OWNER_NAME;
export const timeZone = (): string => env.TIMEZONE;

/** Datum als YYYY-MM-DD in de tijdzone van de eigenaar. */
export function isoDate(offsetDays = 0): string {
	const d = new Date(Date.now() + offsetDays * 86_400_000);
	return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone() }).format(d);
}

export async function listAreas(db: D1Database): Promise<Area[]> {
	const { results } = await db
		.prepare('SELECT id, name, color FROM areas ORDER BY position')
		.all<Area>();
	return results;
}

const ITEM_COLUMNS = 'id, kind, title, area_id, date, time, done, important';

export async function itemsOn(db: D1Database, date: string): Promise<Item[]> {
	const { results } = await db
		.prepare(
			`SELECT ${ITEM_COLUMNS} FROM items WHERE date = ?
			 ORDER BY CASE WHEN time IS NULL THEN 1 ELSE 0 END, time, created_at`
		)
		.bind(date)
		.all<Item>();
	return results;
}

/** Open taken van vóór vandaag: die bleven liggen. */
export async function overdueTasks(db: D1Database, today: string): Promise<Item[]> {
	const { results } = await db
		.prepare(
			`SELECT ${ITEM_COLUMNS} FROM items
			 WHERE kind = 'task' AND done = 0 AND date IS NOT NULL AND date < ?
			 ORDER BY date, created_at`
		)
		.bind(today)
		.all<Item>();
	return results;
}

export async function laterItems(db: D1Database): Promise<Item[]> {
	const { results } = await db
		.prepare(
			`SELECT ${ITEM_COLUMNS} FROM items WHERE date IS NULL AND done = 0
			 ORDER BY created_at DESC LIMIT 20`
		)
		.all<Item>();
	return results;
}

export async function openCountsByArea(db: D1Database): Promise<Record<string, number>> {
	const { results } = await db
		.prepare(
			`SELECT area_id, COUNT(*) AS n FROM items
			 WHERE kind = 'task' AND done = 0 AND area_id IS NOT NULL GROUP BY area_id`
		)
		.all<{ area_id: string; n: number }>();
	return Object.fromEntries(results.map((r) => [r.area_id, r.n]));
}
