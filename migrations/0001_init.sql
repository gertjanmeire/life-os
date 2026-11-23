-- Gebieden (collecties) zoals Werk, Gezin, Huis.
CREATE TABLE areas (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	color TEXT NOT NULL,
	position INTEGER NOT NULL DEFAULT 0
);

-- Alles wat je noteert: taken, afspraken en notities.
-- date = NULL betekent "later" (nog niet ingepland).
CREATE TABLE items (
	id TEXT PRIMARY KEY,
	kind TEXT NOT NULL CHECK (kind IN ('task', 'event', 'note')),
	title TEXT NOT NULL,
	area_id TEXT REFERENCES areas(id) ON DELETE SET NULL,
	date TEXT,
	time TEXT,
	done INTEGER NOT NULL DEFAULT 0,
	important INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	completed_at TEXT
);

CREATE INDEX items_date ON items(date);
CREATE INDEX items_area ON items(area_id);

INSERT INTO areas (id, name, color, position) VALUES
	('werk', 'Werk', '#5B5BD6', 1),
	('gezin', 'Gezin', '#1F9E89', 2),
	('huis', 'Huis', '#D08A1E', 3),
	('financien', 'Financiën', '#C9487A', 4),
	('gezondheid', 'Gezondheid', '#4E9A3A', 5),
	('fotografie', 'Fotografie', '#3E86C4', 6);
