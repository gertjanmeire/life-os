<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/Icon.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const swatches = ['#3E86C4', '#5B5BD6', '#1F9E89', '#D08A1E', '#C9487A', '#4E9A3A', '#C4532A', '#6F6A62'];
	const colorNames: Record<string, string> = {
		'#3E86C4': 'Blauw',
		'#5B5BD6': 'Paars',
		'#1F9E89': 'Groenblauw',
		'#D08A1E': 'Oker',
		'#C9487A': 'Roze',
		'#4E9A3A': 'Groen',
		'#C4532A': 'Koraal',
		'#6F6A62': 'Grijs'
	};
	const sourceLabel = { google: 'Google', outlook: 'Outlook', other: 'Andere' } as const;

	let source = $state<'google' | 'outlook' | 'other'>('google');
	let color = $state(swatches[0]);
	let busy = $state<string | null>(null);

	function ago(iso: string | null) {
		if (!iso) return 'nog niet opgehaald';
		const minutes = Math.round((Date.now() - new Date(iso.replace(' ', 'T') + 'Z').getTime()) / 60000);
		if (minutes < 1) return 'net bijgewerkt';
		if (minutes < 60) return `${minutes} min geleden bijgewerkt`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `${hours} uur geleden bijgewerkt`;
		return `${Math.round(hours / 24)} dagen geleden bijgewerkt`;
	}

	const help = {
		google:
			'Open Google Agenda op je computer → tandwiel → Instellingen → kies links je agenda → "Agenda integreren" → kopieer het "Geheime adres in iCal-indeling".',
		outlook:
			'Open Outlook op het web → tandwiel → Agenda → Gedeelde agenda\'s → "Een agenda publiceren" → kies de agenda en "Kan alle details bekijken" → Publiceren → kopieer de ICS-link.',
		other: 'Elke agenda die een ICS- of webcal-link aanbiedt, werkt ook.'
	};
</script>

<svelte:head>
	<title>Agenda's · Life OS</title>
</svelte:head>

<div class="page">
	<header>
		<span class="hand">gekoppeld</span>
		<h1>Agenda's</h1>
		<p class="sub">Je afspraken uit Google en Outlook verschijnen in Life OS. Alleen lezen, om de 15 minuten bijgewerkt wanneer je de app gebruikt.</p>
	</header>

	{#if form?.error}<p class="notice error" role="alert">{form.error}</p>{/if}
	{#if form?.warning}<p class="notice error" role="alert">{form.warning}</p>{/if}
	{#if form?.added && !form?.warning}<p class="notice ok" role="status">{form.added} is gekoppeld: {form.count} afspraken opgehaald.</p>{/if}
	{#if form?.refreshed}<p class="notice ok" role="status">{form.refreshed} is bijgewerkt: {form.count} afspraken.</p>{/if}

	<section class="card">
		<h2>Gekoppelde agenda's</h2>
		<ul class="list">
			{#each data.calendars as cal (cal.id)}
				<li class="cal">
					<span class="swatch" style:background={cal.color}></span>
					<div class="grow info">
						<span class="name">{cal.name} <small>{sourceLabel[cal.source]}</small></span>
						<span class="meta">
							{cal.event_count} afspraken · {ago(cal.last_synced_at)} · {cal.host}
						</span>
						{#if cal.last_error}<span class="meta err">{cal.last_error}</span>{/if}
					</div>
					<form
						method="POST"
						use:enhance={() => {
							busy = cal.id;
							return async ({ update }) => {
								await update();
								busy = null;
							};
						}}
						class="actions"
					>
						<input type="hidden" name="id" value={cal.id} />
						<button class="btn" formaction="?/refresh" disabled={busy === cal.id}>
							<Icon name="redo" size={16} />{busy === cal.id ? 'Bezig…' : 'Nu vernieuwen'}
						</button>
						<button class="icon-btn" formaction="?/remove" aria-label="{cal.name} ontkoppelen" title="Ontkoppelen">
							<Icon name="trash" size={16} />
						</button>
					</form>
				</li>
			{:else}
				<li class="empty">
					<span class="hand">nog niets gekoppeld</span>
					Voeg hieronder je eerste agenda toe.
				</li>
			{/each}
		</ul>
	</section>

	<section class="card">
		<h2>Agenda toevoegen</h2>
		<form
			method="POST"
			action="?/add"
			class="add"
			use:enhance={() => {
				busy = 'add';
				return async ({ update }) => {
					await update();
					busy = null;
				};
			}}
		>
			<div class="field">
				<span class="label">Van waar komt de agenda?</span>
				<div class="kinds" role="radiogroup" aria-label="Bron">
					{#each Object.entries(sourceLabel) as [value, label] (value)}
						<label class:on={source === value}>
							<input type="radio" name="source" {value} bind:group={source} class="sr-only" />
							{label}
						</label>
					{/each}
				</div>
				<p class="help">{help[source]}</p>
			</div>

			<label class="field">
				<span class="label">Geheime link (ICS)</span>
				<input name="url" type="url" required placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" autocomplete="off" spellcheck="false" />
				<span class="help">Deze link geeft toegang tot je agenda. Life OS bewaart hem in je eigen database en toont hem nergens volledig.</span>
			</label>

			<div class="row">
				<label class="field grow">
					<span class="label">Naam</span>
					<input name="name" required placeholder={source === 'outlook' ? 'Outlook' : 'Mijn agenda'} value={form?.name ?? ''} />
				</label>
				<label class="field">
					<span class="label">Collectie</span>
					<select name="area">
						<option value="">Geen</option>
						{#each data.areas as area (area.id)}
							<option value={area.id}>{area.name}</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="field">
				<span class="label">Kleur</span>
				<div class="swatches" role="radiogroup" aria-label="Kleur">
					{#each swatches as value (value)}
						<label class="swatch-pick" class:on={color === value} style:--c={value}>
							<input type="radio" name="color" {value} bind:group={color} class="sr-only" />
							<span class="sr-only">{colorNames[value]}</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="submit">
				<button class="btn primary" disabled={busy === 'add'}>{busy === 'add' ? 'Ophalen…' : 'Koppelen'}</button>
			</div>
		</form>
	</section>
</div>

<style>
	.page {
		max-width: 760px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 22px;
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
	h2 {
		font-size: 22px;
		margin-bottom: 10px;
	}
	.sub {
		margin: 6px 0 0;
		font-size: 15px;
		color: var(--text-2);
	}
	.notice {
		margin: 0;
		padding: 12px 16px;
		border-radius: 14px;
		font-size: 14px;
	}
	.notice.ok {
		background: color-mix(in srgb, #4e9a3a 14%, var(--surface));
	}
	.notice.error {
		background: var(--accent-soft);
		color: var(--accent-fg);
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.cal {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
		padding: 12px 0;
		border-bottom: 1px solid var(--border-soft);
	}
	.swatch {
		width: 14px;
		height: 14px;
		border-radius: 5px;
		flex-shrink: 0;
	}
	.info {
		display: flex;
		flex-direction: column;
		min-width: 200px;
	}
	.name {
		font-weight: 600;
		font-size: 15px;
	}
	.name small {
		font-weight: 500;
		font-size: 12px;
		color: var(--muted);
		margin-left: 6px;
	}
	.meta {
		font-size: 12px;
		color: var(--muted);
	}
	.meta.err {
		color: var(--accent-text);
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.empty {
		padding: 10px 0;
		color: var(--text-2);
	}
	.empty .hand {
		font-size: 24px;
		margin-bottom: 4px;
	}
	.add {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.label {
		font-size: 13px;
		font-weight: 600;
	}
	.help {
		margin: 0;
		font-size: 12px;
		color: var(--muted);
	}
	.field input:not([type='radio']),
	.field select {
		height: 42px;
		padding: 0 12px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--surface);
		font-size: 14px;
		min-width: 0;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	.kinds {
		display: flex;
		gap: 6px;
	}
	.kinds label {
		height: 34px;
		padding: 0 14px;
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
	.kinds label:focus-within,
	.swatch-pick:focus-within {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.swatch-pick {
		width: 30px;
		height: 30px;
		border-radius: 9px;
		background: var(--c);
		cursor: pointer;
		border: 3px solid transparent;
		box-shadow: inset 0 0 0 2px var(--surface);
	}
	.swatch-pick.on {
		border-color: var(--text);
	}
	.submit {
		display: flex;
		justify-content: flex-end;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
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
		height: 40px;
		padding: 0 20px;
		border-color: var(--accent);
		background: var(--accent);
		color: var(--on-accent);
	}
	.btn:disabled {
		cursor: progress;
		opacity: 0.7;
	}
	.icon-btn {
		width: 36px;
		height: 36px;
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
	.grow {
		flex-grow: 1;
	}
</style>
