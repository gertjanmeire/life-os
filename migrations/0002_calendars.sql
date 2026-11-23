-- Externe agenda's (Google, Outlook, ...) die we via hun geheime ICS-link meelezen.
CREATE TABLE calendars (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	source TEXT NOT NULL CHECK (source IN ('google', 'outlook', 'other')),
	url TEXT NOT NULL,
	color TEXT NOT NULL,
	area_id TEXT REFERENCES areas(id) ON DELETE SET NULL,
	last_synced_at TEXT,
	last_error TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Afspraken uit die agenda's, al omgezet naar lokale datum en uur.
-- Herhalende afspraken staan hier als losse voorkomens binnen het synchronisatievenster.
CREATE TABLE calendar_events (
	id TEXT PRIMARY KEY,
	calendar_id TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	location TEXT,
	all_day INTEGER NOT NULL DEFAULT 0,
	start_date TEXT NOT NULL,
	end_date TEXT NOT NULL,
	start_time TEXT,
	end_time TEXT
);

CREATE INDEX calendar_events_range ON calendar_events(start_date, end_date);
CREATE INDEX calendar_events_calendar ON calendar_events(calendar_id);
