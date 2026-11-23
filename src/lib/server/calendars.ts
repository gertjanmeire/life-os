import { waitUntil } from 'cloudflare:workers';
import { isoDate, timeZone } from './db.ts';
import { parseIcs } from './ics.ts';

export type Source = 'google' | 'outlook' | 'other';
export const SOURCES: Record<Source, string> = { google: 'Google', outlook: 'Outlook', other: 'Andere' };

export interface Calendar {
	id: string;
	name: string;
	source: Source;
	url: string;
	color: string;
	area_id: string | null;
	last_synced_at: string | null;
	last_error: string | null;
}

export interface CalendarEvent {
	id: string;
	calendar_id: string;
	title: string;
	location: string | null;
	all_day: number;
	start_date: string;
	end_date: string;
	start_time: string | null;
	end_time: string | null;
	calendar_name: string;
	source: Source;
	color: string;
}

/** Hoe lang een agenda "vers" blijft voor we hem opnieuw ophalen. */
const STALE_MINUTES = 15;
/** Synchronisatievenster rond vandaag. */
const DAYS_BACK = 30;
const DAYS_AHEAD = 365;
const MAX_ICS_BYTES = 10 * 1024 * 1024;

/** webcal:// is gewoon https://. Andere protocollen weigeren we. */
export function normaliseUrl(input: string): string | null {
	const trimmed = input.trim().replace(/^webcals?:\/\//i, 'https://');
	try {
		const url = new URL(trimmed);
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
	} catch {
		return null;
	}
}

export async function listCalendars(db: D1Database): Promise<(Calendar & { event_count: number })[]> {
	const { results } = await db
		.prepare(
			`SELECT c.*, (SELECT COUNT(*) FROM calendar_events e WHERE e.calendar_id = c.id) AS event_count
			 FROM calendars c ORDER BY c.created_at`
		)
		.all<Calendar & { event_count: number }>();
	return results;
}

export async function eventsOn(db: D1Database, date: string): Promise<CalendarEvent[]> {
	const { results } = await db
		.prepare(
			`SELECT e.*, c.name AS calendar_name, c.source, c.color
			 FROM calendar_events e JOIN calendars c ON c.id = e.calendar_id
			 WHERE e.start_date <= ?1 AND e.end_date >= ?1
			 ORDER BY e.all_day DESC, e.start_time`
		)
		.bind(date)
		.all<CalendarEvent>();
	return results;
}

async function fetchIcs(url: string): Promise<string> {
	const res = await fetch(url, {
		headers: { accept: 'text/calendar, */*;q=0.5', 'user-agent': 'LifeOS-calendar-sync' },
		redirect: 'follow'
	});
	if (!res.ok) throw new Error(`De agenda gaf foutcode ${res.status}. Is de link nog geldig?`);
	const size = Number(res.headers.get('content-length') ?? 0);
	if (size > MAX_ICS_BYTES) throw new Error('Het agendabestand is te groot.');
	const text = await res.text();
	if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Deze link geeft geen agendabestand (ICS) terug.');
	return text;
}

/** Haalt één agenda op en vervangt zijn afspraken. Bij een fout blijven de vorige afspraken staan. */
export async function syncCalendar(db: D1Database, calendar: Calendar): Promise<{ ok: boolean; count: number; error?: string }> {
	try {
		const text = await fetchIcs(calendar.url);
		const occurrences = parseIcs(text, { from: isoDate(-DAYS_BACK), to: isoDate(DAYS_AHEAD) }, timeZone());

		const insert = db.prepare(
			`INSERT OR REPLACE INTO calendar_events
			 (id, calendar_id, title, location, all_day, start_date, end_date, start_time, end_time)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		);
		const statements = [
			db.prepare('DELETE FROM calendar_events WHERE calendar_id = ?').bind(calendar.id),
			...occurrences.map((o) =>
				insert.bind(
					`${calendar.id}:${o.uid}:${o.startDate}T${o.startTime ?? 'dag'}`,
					calendar.id,
					o.title,
					o.location,
					o.allDay ? 1 : 0,
					o.startDate,
					o.endDate,
					o.startTime,
					o.endTime
				)
			),
			db
				.prepare("UPDATE calendars SET last_synced_at = datetime('now'), last_error = NULL WHERE id = ?")
				.bind(calendar.id)
		];
		// D1 voert een batch uit als één transactie.
		await db.batch(statements);
		return { ok: true, count: occurrences.length };
	} catch (err) {
		const error = err instanceof Error ? err.message : 'Onbekende fout bij het ophalen.';
		await db
			.prepare("UPDATE calendars SET last_synced_at = datetime('now'), last_error = ? WHERE id = ?")
			.bind(error, calendar.id)
			.run();
		return { ok: false, count: 0, error };
	}
}

/**
 * Vernieuwt op de achtergrond de agenda's die langer dan 15 minuten niet zijn opgehaald.
 * De pagina wacht hier niet op: je ziet meteen de bewaarde afspraken, de nieuwe bij je volgende bezoek.
 */
export async function refreshStaleCalendars(db: D1Database): Promise<void> {
	const { results } = await db
		.prepare(
			`SELECT * FROM calendars
			 WHERE last_synced_at IS NULL OR last_synced_at < datetime('now', ?)`
		)
		.bind(`-${STALE_MINUTES} minutes`)
		.all<Calendar>();
	if (!results.length) return;
	waitUntil(Promise.allSettled(results.map((c) => syncCalendar(db, c))));
}
