import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getDb,
	isoDate,
	itemsOn,
	laterItems,
	overdueTasks,
	timeZone,
	type Kind
} from '#lib/server/db.ts';
import { eventsOn, refreshStaleCalendars } from '#lib/server/calendars.ts';
import { MAX_HABITS, addHabit, archiveHabit, listHabits, toggleHabit } from '#lib/server/habits.ts';

const KINDS: Kind[] = ['task', 'event', 'note'];

export const load: PageServerLoad = async () => {
	const db = getDb();
	const today = isoDate();
	const [items, overdue, later, calendarEvents, habits] = await Promise.all([
		itemsOn(db, today),
		overdueTasks(db, today),
		laterItems(db),
		eventsOn(db, today),
		listHabits(db, today),
		refreshStaleCalendars(db)
	]);
	return { today, timeZone: timeZone(), items, overdue, later, calendarEvents, habits, maxHabits: MAX_HABITS };
};

function text(form: FormData, key: string): string {
	return String(form.get(key) ?? '').trim();
}

export const actions: Actions = {
	add: async ({ request }) => {
		const form = await request.formData();
		const title = text(form, 'title');
		const kind = text(form, 'kind') as Kind;
		const area = text(form, 'area') || null;
		const time = text(form, 'time') || null;
		const when = text(form, 'when');

		if (!title) return fail(400, { error: 'Geef eerst een omschrijving in.' });
		if (!KINDS.includes(kind)) return fail(400, { error: 'Onbekend soort item.' });
		if (time && !/^\d{2}:\d{2}$/.test(time)) return fail(400, { error: 'Gebruik een uur als 09:30.' });

		const date = when === 'later' ? null : isoDate();
		await getDb()
			.prepare(
				'INSERT INTO items (id, kind, title, area_id, date, time, important) VALUES (?, ?, ?, ?, ?, ?, ?)'
			)
			.bind(
				crypto.randomUUID(),
				kind,
				title,
				area,
				date,
				kind === 'event' ? time : null,
				kind === 'task' && form.get('important') ? 1 : 0
			)
			.run();
	},

	toggle: async ({ request }) => {
		const id = text(await request.formData(), 'id');
		await getDb()
			.prepare(
				`UPDATE items SET done = 1 - done,
				 completed_at = CASE WHEN done = 0 THEN datetime('now') ELSE NULL END
				 WHERE id = ? AND kind = 'task'`
			)
			.bind(id)
			.run();
	},

	/** Een taak die bleef liggen of op "later" stond naar vandaag halen. */
	today: async ({ request }) => {
		const id = text(await request.formData(), 'id');
		await getDb().prepare('UPDATE items SET date = ? WHERE id = ?').bind(isoDate(), id).run();
	},

	later: async ({ request }) => {
		const id = text(await request.formData(), 'id');
		await getDb().prepare('UPDATE items SET date = NULL WHERE id = ?').bind(id).run();
	},

	remove: async ({ request }) => {
		const id = text(await request.formData(), 'id');
		await getDb().prepare('DELETE FROM items WHERE id = ?').bind(id).run();
	},

	habitAdd: async ({ request }) => {
		const name = text(await request.formData(), 'name');
		if (!name) return fail(400, { habitError: 'Geef de gewoonte een naam.' });
		if (name.length > 60) return fail(400, { habitError: 'Hou het kort: max. 60 tekens.' });
		const added = await addHabit(getDb(), name, isoDate());
		if (!added) return fail(400, { habitError: `Je hebt al ${MAX_HABITS} gewoontes. Stop eerst met één.` });
	},

	habitToggle: async ({ request }) => {
		const id = text(await request.formData(), 'id');
		await toggleHabit(getDb(), id, isoDate());
	},

	habitArchive: async ({ request }) => {
		const id = text(await request.formData(), 'id');
		await archiveHabit(getDb(), id);
	}
};
