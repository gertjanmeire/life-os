<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/Icon.svelte';
	import Habits from '#lib/Habits.svelte';
	import type { Kind } from '#lib/server/db.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let kind = $state<Kind>('task');
	let title = $state('');

	const areaById = $derived(Object.fromEntries(data.areas.map((a) => [a.id, a])));

	const day = $derived(new Date(`${data.today}T12:00:00`));
	const dayLabel = $derived.by(() => {
		const wd = new Intl.DateTimeFormat('nl-BE', { weekday: 'short' }).format(day).replace('.', '');
		const [, m, d] = data.today.split('-');
		return `${wd} ${d}.${m} · week ${isoWeek(day)}`;
	});
	const longDate = $derived(
		new Intl.DateTimeFormat('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' }).format(day)
	);

	const greeting = $derived.by(() => {
		const hour = Number(
			new Intl.DateTimeFormat('nl-BE', { hour: 'numeric', hourCycle: 'h23', timeZone: data.timeZone }).format(new Date())
		);
		return hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond';
	});

	const tasks = $derived(data.items.filter((i) => i.kind === 'task'));
	const doneCount = $derived(tasks.filter((t) => t.done).length);
	const events = $derived(
		data.items.filter((i) => i.kind === 'event').length + data.calendarEvents.length
	);

	const sourceLabel = { google: 'Google', outlook: 'Outlook', other: 'Agenda' } as const;

	type Row =
		| { key: string; type: 'item'; sort: string; item: (typeof data.items)[number] }
		| { key: string; type: 'cal'; sort: string; ev: (typeof data.calendarEvents)[number] };

	/**
	 * Eén tijdlijn: hele-dag-afspraken bovenaan, dan alles met een uur
	 * (eigen afspraken en gekoppelde agenda's samen), dan de rest.
	 */
	const rows = $derived.by(() => {
		const list: Row[] = [
			...data.calendarEvents.map((ev) => ({
				key: `cal-${ev.id}`,
				type: 'cal' as const,
				sort: ev.all_day || !ev.start_time || ev.start_date < data.today ? `0` : `1 ${ev.start_time}`,
				ev
			})),
			...data.items.map((item, i) => ({
				key: item.id,
				type: 'item' as const,
				sort: item.time ? `1 ${item.time}` : `2 ${String(i).padStart(4, '0')}`,
				item
			}))
		];
		return list.sort((a, b) => a.sort.localeCompare(b.sort));
	});

	function calTime(ev: (typeof data.calendarEvents)[number]) {
		if (ev.all_day) return 'hele dag';
		if (ev.start_date < data.today) return ev.end_date > data.today ? 'hele dag' : `tot ${ev.end_time}`;
		return ev.start_time ?? '';
	}

	function isoWeek(date: Date): number {
		const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
		const dayNum = d.getUTCDay() || 7;
		d.setUTCDate(d.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
	}

	function areaStyle(id: string | null) {
		const color = id ? areaById[id]?.color : null;
		return color ? `--area: ${color}` : '';
	}

	const placeholders: Record<Kind, string> = {
		task: 'Wat moet er gebeuren?',
		event: 'Welke afspraak?',
		note: 'Wat wil je onthouden?'
	};
</script>

<svelte:head>
	<title>Vandaag · Life OS</title>
</svelte:head>

<div class="page">
	<header class="head">
		<div>
			<span class="hand">{dayLabel}</span>
			<h1>{greeting}, {data.owner}</h1>
		</div>
		<p class="sub">
			<span class="cap">{longDate}</span> · {tasks.length}
			{tasks.length === 1 ? 'taak' : 'taken'} en {events}
			{events === 1 ? 'afspraak' : 'afspraken'}
		</p>
	</header>

	<Habits habits={data.habits} max={data.maxHabits} error={form && 'habitError' in form ? form.habitError : undefined} />

	{#if data.overdue.length}
		<section class="overdue" aria-labelledby="overdue-title">
			<div class="overdue-head">
				<h2 id="overdue-title">Nog open van eerder</h2>
				<span>{data.overdue.length} {data.overdue.length === 1 ? 'taak bleef' : 'taken bleven'} liggen · beslis wat ermee gebeurt</span>
			</div>
			{#each data.overdue as item (item.id)}
				<div class="overdue-row">
					<span class="box" aria-hidden="true"></span>
					<span class="grow">{item.title}</span>
					{#if item.area_id}<span class="chip" style={areaStyle(item.area_id)}>{areaById[item.area_id]?.name}</span>{/if}
					<form method="POST" use:enhance class="actions">
						<input type="hidden" name="id" value={item.id} />
						<button class="btn primary" formaction="?/today">Naar vandaag</button>
						<button class="btn" formaction="?/later">Later</button>
						<button class="btn ghost" formaction="?/remove">Schrappen</button>
					</form>
				</div>
			{/each}
		</section>
	{/if}

	<div class="columns">
		<section class="card today" aria-labelledby="today-title">
			<div class="card-head">
				<h2 id="today-title">Vandaag</h2>
				<span class="muted">
					{#if tasks.length}{doneCount} van {tasks.length} taken klaar{/if}
				</span>
			</div>

			{#if tasks.length}
				<div class="progress" aria-hidden="true">
					<div style:width="{Math.round((doneCount / tasks.length) * 100)}%"></div>
				</div>
			{/if}

			<ul class="list">
				{#each rows as row (row.key)}
					{#if row.type === 'cal'}
						{@const ev = row.ev}
						<li class="row cal" style="--area: {ev.color}">
							<span class="kind" title="Afspraak uit {ev.calendar_name}">
								<Icon name="calendar" size={14} stroke={2} />
								<span class="sr-only">Afspraak uit {ev.calendar_name}</span>
							</span>
							<span class="time" class:allday={ev.all_day || ev.start_date < data.today}>{calTime(ev)}</span>
							<span class="title">
								{ev.title}
								{#if ev.location}<span class="where"><Icon name="pin" size={12} />{ev.location}</span>{/if}
							</span>
							{#if ev.end_time && !ev.all_day && ev.start_date === data.today}<span class="until">tot {ev.end_time}</span>{/if}
							<span class="chip source">{sourceLabel[ev.source]}</span>
						</li>
					{:else}
					{@const item = row.item}
					<li class="row" class:done={item.done} style={areaStyle(item.area_id)}>
						{#if item.kind === 'task'}
							<form method="POST" action="?/toggle" use:enhance>
								<input type="hidden" name="id" value={item.id} />
								<button class="check" class:on={item.done} aria-label={item.done ? `${item.title}: markeer als niet klaar` : `${item.title}: markeer als klaar`}>
									{#if item.done}<Icon name="check" size={14} stroke={3} />{/if}
								</button>
							</form>
						{:else}
							<span class="kind" title={item.kind === 'event' ? 'Afspraak' : 'Notitie'}>
								<Icon name={item.kind === 'event' ? 'clock' : 'note'} size={14} stroke={2} />
								<span class="sr-only">{item.kind === 'event' ? 'Afspraak' : 'Notitie'}</span>
							</span>
						{/if}
						<span class="time">{item.time ?? ''}</span>
						<span class="title" class:note={item.kind === 'note'} class:important={item.important && !item.done}>{item.title}</span>
						{#if item.important && !item.done}<span class="flag">Belangrijk</span>{/if}
						{#if item.area_id}<span class="chip">{areaById[item.area_id]?.name}</span>{/if}
						<form method="POST" use:enhance class="row-actions">
							<input type="hidden" name="id" value={item.id} />
							{#if item.kind === 'task' && !item.done}
								<button class="icon-btn" formaction="?/later" aria-label="{item.title}: verplaats naar later" title="Naar later"><Icon name="later" size={16} /></button>
							{/if}
							<button class="icon-btn" formaction="?/remove" aria-label="{item.title}: verwijderen" title="Verwijderen"><Icon name="trash" size={16} /></button>
						</form>
					</li>
					{/if}
				{:else}
					<li class="empty">
						<span class="hand">een lege bladzijde</span>
						Noteer hieronder je eerste taak, afspraak of notitie van vandaag.
					</li>
				{/each}
			</ul>

			<form
				method="POST"
				action="?/add"
				class="add"
				use:enhance={() =>
					async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') title = '';
					}}
			>
				<div class="kinds" role="radiogroup" aria-label="Soort">
					{#each [['task', 'Taak'], ['event', 'Afspraak'], ['note', 'Notitie']] as [value, label] (value)}
						<label class:on={kind === value}>
							<input type="radio" name="kind" {value} bind:group={kind} class="sr-only" />
							{label}
						</label>
					{/each}
				</div>
				<div class="add-main">
					<Icon name="plus" />
					<label class="sr-only" for="title">Omschrijving</label>
					<input id="title" name="title" bind:value={title} placeholder={placeholders[kind]} autocomplete="off" />
				</div>
				<div class="add-meta">
					{#if kind === 'event'}
						<label class="field">
							<span class="sr-only">Uur</span>
							<input type="time" name="time" />
						</label>
					{/if}
					<label class="field">
						<span class="sr-only">Collectie</span>
						<select name="area">
							<option value="">Geen collectie</option>
							{#each data.areas as area (area.id)}
								<option value={area.id}>{area.name}</option>
							{/each}
						</select>
					</label>
					{#if kind === 'task'}
						<label class="field check-field">
							<input type="checkbox" name="important" /> Belangrijk
						</label>
					{/if}
					<span class="grow"></span>
					<button class="btn" name="when" value="later">Voor later</button>
					<button class="btn primary" name="when" value="today">Toevoegen</button>
				</div>
				{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
			</form>
		</section>

		<aside class="side">
			<section class="card" aria-labelledby="later-title">
				<div class="card-head">
					<h2 id="later-title">Later</h2>
					<span class="muted">nog niet ingepland</span>
				</div>
				<ul class="list compact">
					{#each data.later as item (item.id)}
						<li class="row" style={areaStyle(item.area_id)}>
							<span class="dot"></span>
							<span class="title grow">{item.title}</span>
							<form method="POST" action="?/today" use:enhance>
								<input type="hidden" name="id" value={item.id} />
								<button class="btn small">Vandaag</button>
							</form>
						</li>
					{:else}
						<li class="empty small">Wat niet vandaag hoeft, parkeer je hier met "Voor later".</li>
					{/each}
				</ul>
			</section>

			<section class="card" aria-labelledby="areas-title">
				<h2 id="areas-title" class="side-title">Collecties</h2>
				<div class="areas">
					{#each data.areas as area (area.id)}
						<div class="area" style="--area: {area.color}">
							<span>{area.name}</span>
							<small>{data.counts[area.id] ?? 0} open</small>
						</div>
					{/each}
				</div>
			</section>
		</aside>
	</div>
</div>

<style>
	.page {
		max-width: 1120px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 26px;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 8px 20px;
	}
	.hand {
		display: block;
		font: 26px/1 var(--font-hand);
		color: var(--accent-text);
	}
	h1 {
		font-size: clamp(32px, 5vw, 46px);
		line-height: 1.1;
		letter-spacing: -0.02em;
	}
	.sub {
		margin: 0;
		font-size: 15px;
		color: var(--text-2);
	}
	.cap::first-letter {
		text-transform: uppercase;
	}
	.overdue {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 22px 26px;
		border-radius: 22px;
		background: var(--accent-soft);
	}
	.overdue-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 14px;
	}
	.overdue-head h2 {
		font-size: 22px;
	}
	.overdue-head span {
		font-size: 13px;
		color: var(--accent-fg);
	}
	.overdue-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 14px;
		padding: 10px 14px;
		border-radius: 14px;
		background: var(--surface);
		font-size: 15px;
	}
	.box {
		width: 20px;
		height: 20px;
		border-radius: 7px;
		border: 1.5px solid var(--border-strong);
	}
	.actions {
		display: flex;
		gap: 6px;
	}
	.columns {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
		align-items: flex-start;
	}
	.today {
		flex: 3 1 440px;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.side {
		flex: 2 1 300px;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.card-head {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin-bottom: 8px;
	}
	.card-head h2 {
		font-size: 22px;
	}
	.side-title {
		font-size: 20px;
		margin-bottom: 12px;
	}
	.muted {
		font-size: 13px;
		color: var(--muted);
	}
	.progress {
		height: 6px;
		border-radius: 999px;
		background: var(--border-soft);
		overflow: hidden;
		margin-bottom: 6px;
	}
	.progress div {
		height: 100%;
		background: var(--accent);
		border-radius: 999px;
		transition: width 0.3s ease;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 50px;
		border-bottom: 1px solid var(--border-soft);
	}
	.compact .row {
		min-height: 44px;
	}
	.check {
		width: 24px;
		height: 24px;
		padding: 0;
		border-radius: 8px;
		border: 1.5px solid var(--border-strong);
		background: transparent;
		color: var(--on-accent);
		display: grid;
		place-items: center;
		cursor: pointer;
	}
	.check.on {
		background: var(--accent);
		border-color: var(--accent);
	}
	.kind {
		width: 24px;
		height: 24px;
		flex-shrink: 0;
		border-radius: 8px;
		display: grid;
		place-items: center;
		color: var(--area, var(--text-2));
		background: color-mix(in srgb, var(--area, var(--muted)) 16%, transparent);
	}
	.time {
		width: 40px;
		flex-shrink: 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-2);
		font-variant-numeric: tabular-nums;
	}
	.title {
		flex-grow: 1;
		min-width: 0;
		font-size: 15px;
	}
	.title.note {
		font-style: italic;
		color: var(--text-2);
	}
	.title.important {
		font-weight: 600;
	}
	.done .title {
		text-decoration: line-through;
		color: var(--muted);
	}
	.time.allday {
		width: auto;
		min-width: 40px;
		font-size: 11px;
		font-weight: 600;
		color: var(--area);
	}
	.where {
		display: flex;
		align-items: center;
		gap: 3px;
		font-size: 12px;
		color: var(--muted);
	}
	.until {
		font-size: 12px;
		color: var(--muted);
		white-space: nowrap;
	}
	@media (max-width: 820px) {
		.until {
			display: none;
		}
	}
	.chip.source {
		color: var(--text-2);
		background: var(--border-soft);
	}
	.flag {
		font-size: 11px;
		font-weight: 600;
		color: var(--accent-text);
	}
	.chip {
		font-size: 12px;
		font-weight: 500;
		padding: 3px 10px;
		border-radius: 999px;
		white-space: nowrap;
		color: color-mix(in srgb, var(--area, var(--muted)) 70%, var(--text));
		background: color-mix(in srgb, var(--area, var(--muted)) 16%, transparent);
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 3px;
		flex-shrink: 0;
		background: var(--area, var(--border-strong));
	}
	.row-actions {
		display: flex;
		gap: 2px;
		opacity: 0;
		transition: opacity 0.15s;
	}
	.row:hover .row-actions,
	.row:focus-within .row-actions {
		opacity: 1;
	}
	@media (hover: none) {
		.row-actions {
			opacity: 1;
		}
	}
	.icon-btn {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
	}
	.icon-btn:hover {
		background: var(--border-soft);
		color: var(--text);
	}
	.empty {
		padding: 22px 4px;
		color: var(--text-2);
	}
	.empty.small {
		padding: 10px 0;
		font-size: 13px;
	}
	.empty .hand {
		font-size: 24px;
		margin-bottom: 4px;
	}
	.add {
		margin-top: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px;
		border-radius: 14px;
		border: 1px dashed var(--border-strong);
	}
	.kinds {
		display: flex;
		gap: 6px;
	}
	.kinds label {
		height: 32px;
		padding: 0 12px;
		display: flex;
		align-items: center;
		border-radius: 999px;
		border: 1px solid var(--border);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		background: var(--surface);
	}
	.kinds label.on {
		background: var(--text);
		color: var(--bg);
		border-color: var(--text);
	}
	.kinds label:focus-within {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.add-main {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--muted);
	}
	.add-main input {
		flex-grow: 1;
		min-width: 0;
		height: 40px;
		border: 0;
		outline: none;
		background: transparent;
		font-size: 15px;
		color: var(--text);
	}
	.add-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}
	.field select,
	.field input[type='time'] {
		height: 36px;
		padding: 0 10px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--surface);
	}
	.check-field {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: var(--text-2);
	}
	.btn {
		height: 36px;
		padding: 0 14px;
		border-radius: 10px;
		border: 1px solid var(--border-strong);
		background: transparent;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
	}
	.btn.primary {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--on-accent);
	}
	.btn.ghost {
		border-color: transparent;
		color: var(--text-2);
	}
	.btn.small {
		height: 30px;
		padding: 0 10px;
		font-size: 12px;
	}
	.error {
		margin: 0;
		font-size: 13px;
		color: var(--accent-text);
	}
	.areas {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	.area {
		display: flex;
		flex-direction: column;
		padding: 12px 14px;
		border-radius: 14px;
		background: color-mix(in srgb, var(--area) 14%, var(--surface));
		color: color-mix(in srgb, var(--area) 65%, var(--text));
		font: 500 16px var(--font-display);
	}
	.area small {
		font: 400 12px var(--font-sans);
		color: var(--text-2);
	}
	.grow {
		flex-grow: 1;
	}
</style>
