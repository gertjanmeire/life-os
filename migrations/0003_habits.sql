-- Gewoontes: een korte lijst (max. 3 actief) die je elke dag afvinkt.
-- start_date = de dag waarop je de gewoonte toevoegde; de streak telt niet verder terug.
-- archived_at = gestopt met deze gewoonte; de geschiedenis blijft bewaard.
CREATE TABLE habits (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	position INTEGER NOT NULL DEFAULT 0,
	start_date TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	archived_at TEXT
);

-- Eén rij per gewoonte per afgevinkte dag (YYYY-MM-DD in de tijdzone van de eigenaar).
-- Elke ochtend begin je dus vanzelf met een lege lijst.
CREATE TABLE habit_checks (
	habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
	date TEXT NOT NULL,
	PRIMARY KEY (habit_id, date)
);
