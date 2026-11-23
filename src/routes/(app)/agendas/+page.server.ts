import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '#lib/server/db.ts';
import { listCalendars, normaliseUrl, SOURCES, syncCalendar, type Calendar, type Source } from '#lib/server/calendars.ts';

export const load: PageServerLoad = async () => {
	const calendars = await listCalendars(getDb());
	// De geheime link sturen we niet volledig naar de browser.
	return {
		calendars: calendars.map(({ url, ...c }) => ({ ...c, host: new URL(url).host }))
	};
};

function text(form: FormData, key: string) {
	return String(form.get(key) ?? '').trim();
}

async function getCalendar(db: D1Database, id: string) {
	return db.prepare('SELECT * FROM calendars WHERE id = ?').bind(id).first<Calendar>();
}

export const actions: Actions = {
	add: async ({ request }) => {
		const form = await request.formData();
		const name = text(form, 'name');
		const source = text(form, 'source') as Source;
		const url = normaliseUrl(text(form, 'url'));
		const color = text(form, 'color');
		const area = text(form, 'area') || null;
		const values = { name, source, color, area };

		if (!name) return fail(400, { ...values, error: 'Geef de agenda een naam.' });
		if (!(source in SOURCES)) return fail(400, { ...values, error: 'Kies van waar de agenda komt.' });
		if (!url) return fail(400, { ...values, error: 'Plak een geldige link die begint met https:// of webcal://.' });
		if (!/^#[0-9a-f]{6}$/i.test(color)) return fail(400, { ...values, error: 'Kies een kleur.' });

		const db = getDb();
		const calendar: Calendar = {
			id: crypto.randomUUID(),
			name,
			source,
			url,
			color,
			area_id: area,
			last_synced_at: null,
			last_error: null
		};
		await db
			.prepare('INSERT INTO calendars (id, name, source, url, color, area_id) VALUES (?, ?, ?, ?, ?, ?)')
			.bind(calendar.id, name, source, url, color, area)
			.run();

		const result = await syncCalendar(db, calendar);
		return result.ok
			? { added: name, count: result.count }
			: { added: name, warning: `Agenda bewaard, maar ophalen lukte niet: ${result.error}` };
	},

	refresh: async ({ request }) => {
		const db = getDb();
		const calendar = await getCalendar(db, text(await request.formData(), 'id'));
		if (!calendar) return fail(404, { error: 'Deze agenda bestaat niet meer.' });
		const result = await syncCalendar(db, calendar);
		return result.ok ? { refreshed: calendar.name, count: result.count } : fail(502, { error: result.error });
	},

	remove: async ({ request }) => {
		const id = text(await request.formData(), 'id');
		const db = getDb();
		await db.batch([
			db.prepare('DELETE FROM calendar_events WHERE calendar_id = ?').bind(id),
			db.prepare('DELETE FROM calendars WHERE id = ?').bind(id)
		]);
	}
};
