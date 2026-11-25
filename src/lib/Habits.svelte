<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/Icon.svelte';
	import type { Habit } from '#lib/server/habits.ts';

	let { habits, max, error }: { habits: Habit[]; max: number; error?: string } = $props();

	let editing = $state(false);
	let name = $state('');
	let celebrate = $state(false);

	const doneCount = $derived(habits.filter((h) => h.doneToday).length);
	const allDone = $derived(habits.length > 0 && doneCount === habits.length);
	const showAdd = $derived(habits.length < max && (editing || habits.length === 0));

	// Feestje enkel op het moment dat de laatste gewoonte afgevinkt wordt, niet bij het laden.
	let wasAllDone: boolean | undefined;
	$effect(() => {
		if (wasAllDone === false && allDone) {
			celebrate = true;
			setTimeout(() => (celebrate = false), 2600);
		}
		wasAllDone = allDone;
	});

	const dayLetters = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
	const stateLabel = {
		done: 'gedaan',
		missed: 'niet gedaan',
		today: 'vandaag, nog open',
		future: 'nog niet',
		before: 'voor de start'
	} as const;

	function streakLabel(n: number) {
		if (n === 0) return 'start vandaag';
		return `${n} ${n === 1 ? 'dag' : 'dagen'} op rij`;
	}

	const confetti = Array.from({ length: 14 }, (_, i) => i);
</script>

<section class="habits" class:all-done={allDone} aria-labelledby="habits-title">
	<div class="head">
		<h2 id="habits-title">Gewoontes</h2>
		{#if habits.length}
			<span class="muted">{doneCount} van {habits.length} vandaag</span>
		{/if}
		<span class="grow"></span>
		{#if allDone}
			<span class="hand cheer" class:pop={celebrate}>alles gedaan vandaag</span>
		{/if}
		{#if habits.length}
			<button class="link" type="button" onclick={() => (editing = !editing)} aria-pressed={editing}>
				{editing ? 'Klaar' : 'Aanpassen'}
			</button>
		{/if}
	</div>

	{#if habits.length}
		<ul class="tiles">
			{#each habits as habit (habit.id)}
				<li class="tile" class:on={habit.doneToday}>
					<form method="POST" action="?/habitToggle" use:enhance class="toggle-form">
						<input type="hidden" name="id" value={habit.id} />
						<button
							class="toggle"
							aria-pressed={habit.doneToday}
							aria-label={habit.doneToday ? `${habit.name}: vinkje weghalen` : `${habit.name}: afvinken voor vandaag`}
						>
							<span class="check" aria-hidden="true">
								{#if habit.doneToday}<Icon name="check" size={16} stroke={3} />{/if}
							</span>
							<span class="name">{habit.name}</span>
						</button>
					</form>

					<div class="meta">
						<span class="streak" class:zero={habit.streak === 0}>
							<Icon name="flame" size={14} stroke={2} />
							{streakLabel(habit.streak)}
						</span>
						<ol class="week" aria-label="Deze week">
							{#each habit.week as day, i (day.date)}
								<li class="day {day.state}" title="{dayLetters[i]}: {stateLabel[day.state]}">
									<span class="dot" aria-hidden="true"></span>
									<span class="letter" aria-hidden="true">{dayLetters[i][0]}</span>
									<span class="sr-only">{dayLetters[i]}: {stateLabel[day.state]}</span>
								</li>
							{/each}
						</ol>
					</div>

					{#if editing}
						<form method="POST" action="?/habitArchive" use:enhance class="stop">
							<input type="hidden" name="id" value={habit.id} />
							<button class="btn ghost small" aria-label="Stoppen met {habit.name}">Stoppen</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if showAdd}
		<form
			method="POST"
			action="?/habitAdd"
			class="add"
			use:enhance={() =>
				async ({ result, update }) => {
					await update({ reset: false });
					if (result.type === 'success') name = '';
				}}
		>
			<Icon name="plus" />
			<label class="sr-only" for="habit-name">Nieuwe gewoonte</label>
			<input
				id="habit-name"
				name="name"
				bind:value={name}
				maxlength="60"
				autocomplete="off"
				placeholder={habits.length ? 'Nog een gewoonte?' : 'Eerste gewoonte, bv. 10 minuten wandelen'}
			/>
			<span class="hint">{habits.length} van max. {max}</span>
			<button class="btn primary small">Toevoegen</button>
		</form>
	{/if}
	{#if error}<p class="error" role="alert">{error}</p>{/if}

	{#if celebrate}
		<div class="confetti" aria-hidden="true">
			{#each confetti as i (i)}
				<span style="--i: {i}"></span>
			{/each}
		</div>
	{/if}
</section>

<style>
	.habits {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 18px 22px;
		border-radius: 22px;
		background: var(--surface);
		border: 1px solid var(--border);
		transition: background 0.4s;
	}
	.habits.all-done {
		background: color-mix(in srgb, var(--accent) 8%, var(--surface));
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 12px;
	}
	.head h2 {
		font-size: 22px;
	}
	.muted {
		font-size: 13px;
		color: var(--muted);
	}
	.grow {
		flex-grow: 1;
	}
	.hand {
		font: 22px/1 var(--font-hand);
		color: var(--accent-text);
	}
	.cheer.pop {
		animation: pop 0.6s cubic-bezier(0.3, 1.6, 0.5, 1);
	}
	@keyframes pop {
		from {
			transform: scale(0.6) rotate(-6deg);
			opacity: 0;
		}
	}
	.link {
		border: 0;
		background: none;
		padding: 4px 0;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-2);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.tiles {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 10px;
	}
	.tile {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px 14px;
		border-radius: 16px;
		border: 1px solid var(--border-soft);
		background: var(--bg);
		transition: border-color 0.2s, background 0.2s;
	}
	.tile.on {
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
		background: color-mix(in srgb, var(--accent) 10%, var(--surface));
	}
	.toggle {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0;
		border: 0;
		background: none;
		text-align: left;
		cursor: pointer;
		color: var(--text);
	}
	.check {
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		border-radius: 9px;
		border: 1.5px solid var(--border-strong);
		display: grid;
		place-items: center;
		color: var(--on-accent);
		transition: background 0.2s, border-color 0.2s, transform 0.2s;
	}
	.on .check {
		background: var(--accent);
		border-color: var(--accent);
		animation: tick 0.35s ease;
	}
	@keyframes tick {
		50% {
			transform: scale(1.18);
		}
	}
	.name {
		font-size: 15px;
		font-weight: 500;
		min-width: 0;
	}
	.meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}
	.streak {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		font-weight: 600;
		color: var(--accent-text);
		font-variant-numeric: tabular-nums;
	}
	.streak.zero {
		color: var(--muted);
		font-weight: 500;
	}
	.week {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		gap: 5px;
	}
	.day {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1.5px solid var(--border-strong);
	}
	.done .dot {
		background: var(--accent);
		border-color: var(--accent);
	}
	.missed .dot {
		border-style: dashed;
		border-color: var(--muted);
	}
	.today .dot {
		border-color: var(--accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent);
	}
	.future .dot,
	.before .dot {
		border-color: var(--border-strong);
		opacity: 0.45;
	}
	.letter {
		font-size: 10px;
		color: var(--muted);
		text-transform: uppercase;
	}
	.stop {
		align-self: flex-end;
	}
	.add {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 8px 8px 14px;
		border-radius: 14px;
		border: 1px dashed var(--border-strong);
		color: var(--muted);
	}
	.add input {
		flex-grow: 1;
		min-width: 0;
		height: 36px;
		border: 0;
		outline: none;
		background: transparent;
		font-size: 15px;
		color: var(--text);
	}
	.hint {
		font-size: 12px;
		white-space: nowrap;
	}
	@media (max-width: 480px) {
		.hint {
			display: none;
		}
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
	.btn.small {
		height: 30px;
		padding: 0 10px;
		font-size: 12px;
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
	.error {
		margin: 0;
		font-size: 13px;
		color: var(--accent-text);
	}
	.confetti {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		border-radius: inherit;
	}
	.confetti span {
		position: absolute;
		top: 40%;
		left: calc(8% + var(--i) * 6.3%);
		width: 7px;
		height: 11px;
		border-radius: 2px;
		background: var(--accent);
		opacity: 0;
		animation: fall 1.6s ease-out calc(var(--i) * 35ms) forwards;
	}
	.confetti span:nth-child(3n) {
		background: #1f9e89;
	}
	.confetti span:nth-child(3n + 1) {
		background: #d08a1e;
	}
	@keyframes fall {
		0% {
			opacity: 1;
			transform: translateY(0) rotate(0);
		}
		30% {
			transform: translateY(calc(-40px - (var(--i) * 3px))) rotate(160deg);
		}
		100% {
			opacity: 0;
			transform: translateY(70px) rotate(420deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.confetti {
			display: none;
		}
		.cheer.pop,
		.on .check {
			animation: none;
		}
	}
</style>
