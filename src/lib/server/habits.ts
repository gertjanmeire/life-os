/** Maximaal aantal actieve gewoontes: klein houden is de bedoeling. */
export const MAX_HABITS = 3;

export type DayState = 'done' | 'missed' | 'today' | 'future' | 'before';

export interface Habit {
	id: string;
	name: string;
	doneToday: boolean;
	/** Aantal afgevinkte dagen op rij; één gemiste dag per week breekt de reeks niet. */
	streak: number;
	/** Maandag t/m zondag van deze week. */
	week: { date: string; state: DayState }[];
}

interface HabitRow {
	id: string;
	name: string;
	start_date: string;
}

/** Rekenen op YYYY-MM-DD-strings, los van tijdzones. */
function shift(date: string, days: number): string {
	const d = new Date(`${date}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

/** Maandag van de week waarin `date` valt. */
function mondayOf(date: string): string {
	const weekday = new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
	return shift(date, 1 - weekday);
}

/**
 * Streak: tel terug vanaf vandaag. Vandaag nog niet afgevinkt telt niet als gemist.
 * Per week (ma–zo) mag één dag ontbreken; de tweede gemiste dag in dezelfde week stopt de reeks.
 * Vrije dagen tellen niet mee in het getal.
 */
export function streakFor(checked: Set<string>, startDate: string, today: string): number {
	let count = 0;
	const misses = new Set<string>();
	let day = today;
	if (checked.has(today)) count++;
	day = shift(today, -1);

	while (day >= startDate) {
		if (checked.has(day)) {
			count++;
		} else {
			const week = mondayOf(day);
			if (misses.has(week)) break;
			misses.add(week);
		}
		day = shift(day, -1);
	}
	return count;
}

function weekFor(checked: Set<string>, startDate: string, today: string): Habit['week'] {
	const monday = mondayOf(today);
	return Array.from({ length: 7 }, (_, i) => {
		const date = shift(monday, i);
		let state: DayState;
		if (checked.has(date)) state = 'done';
		else if (date === today) state = 'today';
		else if (date > today) state = 'future';
		else if (date < startDate) state = 'before';
		else state = 'missed';
		return { date, state };
	});
}

export async function listHabits(db: D1Database, today: string): Promise<Habit[]> {
	const [{ results: habits }, { results: checks }] = await Promise.all([
		db
			.prepare(
				'SELECT id, name, start_date FROM habits WHERE archived_at IS NULL ORDER BY position, created_at'
			)
			.all<HabitRow>(),
		db
			.prepare(
				`SELECT c.habit_id, c.date FROM habit_checks c
				 JOIN habits h ON h.id = c.habit_id WHERE h.archived_at IS NULL`
			)
			.all<{ habit_id: string; date: string }>()
	]);

	const byHabit = new Map<string, Set<string>>();
	for (const c of checks) {
		let set = byHabit.get(c.habit_id);
		if (!set) byHabit.set(c.habit_id, (set = new Set()));
		set.add(c.date);
	}

	return habits.map((h) => {
		const checked = byHabit.get(h.id) ?? new Set<string>();
		return {
			id: h.id,
			name: h.name,
			doneToday: checked.has(today),
			streak: streakFor(checked, h.start_date, today),
			week: weekFor(checked, h.start_date, today)
		};
	});
}

export async function addHabit(db: D1Database, name: string, today: string): Promise<boolean> {
	const row = await db
		.prepare('SELECT COUNT(*) AS n, COALESCE(MAX(position), 0) AS pos FROM habits WHERE archived_at IS NULL')
		.first<{ n: number; pos: number }>();
	if ((row?.n ?? 0) >= MAX_HABITS) return false;
	await db
		.prepare('INSERT INTO habits (id, name, position, start_date) VALUES (?, ?, ?, ?)')
		.bind(crypto.randomUUID(), name, (row?.pos ?? 0) + 1, today)
		.run();
	return true;
}

/** Vandaag afvinken of het vinkje weer weghalen. */
export async function toggleHabit(db: D1Database, id: string, today: string): Promise<void> {
	const removed = await db
		.prepare('DELETE FROM habit_checks WHERE habit_id = ? AND date = ?')
		.bind(id, today)
		.run();
	if (removed.meta.changes) return;
	await db
		.prepare(
			`INSERT OR IGNORE INTO habit_checks (habit_id, date)
			 SELECT id, ? FROM habits WHERE id = ? AND archived_at IS NULL`
		)
		.bind(today, id)
		.run();
}

/** Stoppen met een gewoonte: weg van het scherm, geschiedenis blijft. */
export async function archiveHabit(db: D1Database, id: string): Promise<void> {
	await db
		.prepare("UPDATE habits SET archived_at = datetime('now') WHERE id = ? AND archived_at IS NULL")
		.bind(id)
		.run();
}
