import ICAL from 'ical.js';

/** Eén voorkomen van een afspraak, in lokale datum en uur. */
export interface Occurrence {
	uid: string;
	title: string;
	location: string | null;
	allDay: boolean;
	/** YYYY-MM-DD */
	startDate: string;
	/** YYYY-MM-DD, inclusief (laatste dag waarop de afspraak loopt) */
	endDate: string;
	/** HH:MM, null bij hele-dag-afspraken */
	startTime: string | null;
	endTime: string | null;
}

export interface Window {
	/** YYYY-MM-DD, eerste dag die we bewaren */
	from: string;
	/** YYYY-MM-DD, laatste dag die we bewaren */
	to: string;
}

const MAX_OCCURRENCES_PER_EVENT = 1000;

function localParts(date: Date, timeZone: string) {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		})
			.formatToParts(date)
			.map((p) => [p.type, p.value])
	);
	return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

const pad = (n: number) => String(n).padStart(2, '0');
const dateOf = (t: ICAL.Time) => `${t.year}-${pad(t.month)}-${pad(t.day)}`;

/** Zet een ICAL-tijd om naar een moment. Zwevende tijden (zonder zone) lezen we als lokale wandkloktijd. */
function toLocal(t: ICAL.Time, timeZone: string) {
	if (t.zone?.tzid === 'floating') {
		return { date: dateOf(t), time: `${pad(t.hour)}:${pad(t.minute)}` };
	}
	return localParts(t.toJSDate(), timeZone);
}

function occurrence(
	uid: string,
	item: ICAL.Event,
	start: ICAL.Time,
	end: ICAL.Time | null,
	timeZone: string
): Occurrence {
	const title = (item.summary ?? '').trim() || '(zonder titel)';
	const location = (item.location ?? '').trim() || null;

	if (start.isDate) {
		// Hele dag: DTEND is exclusief, dus de laatste dag is één dag vroeger.
		let last = start.clone();
		if (end && end.compare(start) > 0) {
			last = end.clone();
			last.adjust(-1, 0, 0, 0);
		}
		return { uid, title, location, allDay: true, startDate: dateOf(start), endDate: dateOf(last), startTime: null, endTime: null };
	}

	const s = toLocal(start, timeZone);
	let e = s;
	if (end && end.compare(start) > 0) {
		e = toLocal(end, timeZone);
		// Eindigt om middernacht? Dan hoort de afspraak niet meer bij de volgende dag.
		if (e.time === '00:00' && e.date > s.date) {
			const before = end.clone();
			before.adjust(0, 0, -1, 0);
			e = { date: toLocal(before, timeZone).date, time: '24:00' };
		}
	}
	return { uid, title, location, allDay: false, startDate: s.date, endDate: e.date, startTime: s.time, endTime: e.time };
}

const overlaps = (o: Occurrence, w: Window) => o.endDate >= w.from && o.startDate <= w.to;

/**
 * Leest een ICS-bestand en geeft alle voorkomens binnen het venster terug,
 * met herhalingen uitgerold en uitzonderingen (verplaatste of geschrapte
 * voorkomens) toegepast.
 */
export function parseIcs(text: string, window: Window, timeZone: string): Occurrence[] {
	const root = new ICAL.Component(ICAL.parse(text));

	for (const tz of root.getAllSubcomponents('vtimezone')) {
		ICAL.TimezoneService.register(tz);
	}

	// Groepeer per UID: het hoofditem en de uitzonderingen (met RECURRENCE-ID).
	const groups = new Map<string, { master?: ICAL.Component; exceptions: ICAL.Component[] }>();
	for (const vevent of root.getAllSubcomponents('vevent')) {
		const uid = String(vevent.getFirstPropertyValue('uid') ?? crypto.randomUUID());
		const group = groups.get(uid) ?? { exceptions: [] };
		if (vevent.hasProperty('recurrence-id')) group.exceptions.push(vevent);
		else group.master = vevent;
		groups.set(uid, group);
	}

	const until = ICAL.Time.fromDateString(window.to);
	until.adjust(2, 0, 0, 0);
	const result: Occurrence[] = [];

	for (const [uid, { master, exceptions }] of groups) {
		if (!master) {
			// Alleen een uitzondering zonder hoofditem: behandel als losse afspraak.
			for (const ex of exceptions) {
				const ev = new ICAL.Event(ex);
				if (String(ex.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') continue;
				const o = occurrence(uid, ev, ev.startDate, ev.endDate, timeZone);
				if (overlaps(o, window)) result.push(o);
			}
			continue;
		}

		const event = new ICAL.Event(master, { exceptions });
		if (String(master.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') continue;

		if (!event.isRecurring()) {
			const o = occurrence(uid, event, event.startDate, event.endDate, timeZone);
			if (overlaps(o, window)) result.push(o);
			continue;
		}

		const iterator = event.iterator();
		let count = 0;
		for (let next = iterator.next(); next && count < MAX_OCCURRENCES_PER_EVENT; next = iterator.next()) {
			if (next.compare(until) > 0) break;
			count++;
			const details = event.getOccurrenceDetails(next);
			const status = String(details.item.component.getFirstPropertyValue('status') ?? '').toUpperCase();
			if (status === 'CANCELLED') continue;
			const o = occurrence(uid, details.item, details.startDate, details.endDate, timeZone);
			if (overlaps(o, window)) result.push(o);
		}
	}

	return result.sort((a, b) =>
		a.startDate === b.startDate ? (a.startTime ?? '').localeCompare(b.startTime ?? '') : a.startDate.localeCompare(b.startDate)
	);
}
