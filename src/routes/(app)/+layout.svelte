<script lang="ts">
	import Icon, { type IconName } from '#lib/Icon.svelte';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const nav: { href: string | null; label: string; icon: IconName }[] = [
		{ href: '/', label: 'Vandaag', icon: 'sun' },
		{ href: null, label: 'Inbox', icon: 'inbox' },
		{ href: null, label: 'Kalender', icon: 'calendar' },
		{ href: null, label: 'Later', icon: 'later' },
		{ href: null, label: 'Documenten', icon: 'folder' }
	];

	let dark = $state(false);

	$effect(() => {
		const set = document.documentElement.dataset.theme;
		dark = set ? set === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
	});

	function toggleTheme() {
		dark = !dark;
		const theme = dark ? 'dark' : 'light';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('theme', theme);
		} catch {
			/* opslag niet beschikbaar: thema geldt dan enkel voor deze sessie */
		}
	}

	const initials = $derived(
		data.owner
			.split(/[\s-]+/)
			.map((p) => p[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);
</script>

<div class="shell">
	<aside class="sidebar">
		<a class="brand" href="/">
			<span class="mark">•</span>
			<span class="brand-name">Life OS</span>
		</a>

		<nav aria-label="Hoofdmenu" class="nav">
			{#each nav as item (item.label)}
				{#if item.href}
					<a class="nav-item" href={item.href} aria-current={page.url.pathname === item.href ? 'page' : undefined}>
						<Icon name={item.icon} />
						<span>{item.label}</span>
					</a>
				{:else}
					<span class="nav-item soon" title="Volgt in een volgende stap">
						<Icon name={item.icon} />
						<span>{item.label}</span>
						<small>binnenkort</small>
					</span>
				{/if}
			{/each}
		</nav>

		<div class="areas">
			<div class="label">Collecties</div>
			{#each data.areas as area (area.id)}
				<div class="area">
					<span class="swatch" style:background={area.color}></span>
					<span class="grow">{area.name}</span>
					<span class="count">{data.counts[area.id] ?? ''}</span>
				</div>
			{/each}
		</div>

		<div class="grow"></div>

		<button class="theme" type="button" onclick={toggleTheme}>
			<Icon name={dark ? 'sun' : 'moon'} />
			{dark ? 'Licht thema' : 'Donker thema'}
		</button>

		<div class="account">
			<span class="avatar">{initials}</span>
			<span class="who grow">
				<span>{data.owner}</span>
				<small>Aangemeld met Google</small>
			</span>
			<a class="logout" href="/afmelden" data-sveltekit-reload aria-label="Afmelden" title="Afmelden">
				<Icon name="logout" />
			</a>
		</div>
	</aside>

	<main class="main">
		{@render children()}
	</main>

	<nav aria-label="Hoofdmenu" class="tabbar">
		<a href="/" aria-current={page.url.pathname === '/' ? 'page' : undefined}><Icon name="sun" size={22} />Vandaag</a>
		<span class="soon"><Icon name="calendar" size={22} />Kalender</span>
		<span class="soon"><Icon name="folder" size={22} />Documenten</span>
		<button type="button" onclick={toggleTheme}><Icon name={dark ? 'sun' : 'moon'} size={22} />Thema</button>
		<a href="/afmelden" data-sveltekit-reload><Icon name="logout" size={22} />Afmelden</a>
	</nav>
</div>

<style>
	.shell {
		min-height: 100dvh;
		display: flex;
	}
	.sidebar {
		width: 264px;
		flex-shrink: 0;
		position: sticky;
		top: 0;
		height: 100dvh;
		overflow-y: auto;
		padding: 24px 16px;
		background: var(--side);
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 22px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 8px;
		color: var(--text);
		text-decoration: none;
	}
	.mark {
		width: 34px;
		height: 34px;
		border-radius: 11px;
		background: var(--accent);
		color: var(--on-accent);
		display: grid;
		place-items: center;
		font: 600 22px var(--font-display);
	}
	.brand-name {
		font: 600 22px var(--font-display);
		letter-spacing: -0.01em;
	}
	.nav,
	.areas {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.nav-item {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 40px;
		padding: 0 12px;
		border-radius: 10px;
		color: var(--text-2);
		text-decoration: none;
	}
	.nav-item[aria-current='page'] {
		background: var(--nav-active);
		color: var(--text);
		font-weight: 600;
	}
	.nav-item.soon {
		color: var(--muted);
	}
	.nav-item small {
		margin-left: auto;
		font-size: 11px;
	}
	.label {
		padding: 0 12px 6px;
		font-size: 12px;
		font-weight: 500;
		color: var(--muted);
	}
	.area {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 36px;
		padding: 0 12px;
		color: var(--text-2);
	}
	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 4px;
	}
	.count {
		font-size: 12px;
		color: var(--muted);
	}
	.grow {
		flex-grow: 1;
	}
	.theme {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 40px;
		padding: 0 12px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--surface);
		cursor: pointer;
	}
	.account {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		border-radius: 14px;
		background: var(--surface);
		border: 1px solid var(--border);
	}
	.avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--accent-soft);
		color: var(--accent-fg);
		display: grid;
		place-items: center;
		font-weight: 600;
		font-size: 13px;
	}
	.who {
		display: flex;
		flex-direction: column;
		font-weight: 500;
	}
	.logout {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border-radius: 8px;
		color: var(--muted);
	}
	.logout:hover {
		background: var(--border-soft);
		color: var(--text);
	}
	.who small {
		font-weight: 400;
		font-size: 12px;
		color: var(--muted);
	}
	.main {
		flex: 1;
		min-width: 0;
		padding: 28px 40px 48px;
		background-image: radial-gradient(var(--dot) 1.1px, transparent 1.4px);
		background-size: 22px 22px;
	}
	.tabbar {
		display: none;
	}

	@media (max-width: 820px) {
		.sidebar {
			display: none;
		}
		.main {
			padding: calc(20px + env(safe-area-inset-top)) 16px 110px;
		}
		.tabbar {
			position: fixed;
			left: 0;
			right: 0;
			bottom: 0;
			display: grid;
			grid-template-columns: repeat(5, minmax(0, 1fr));
			padding: 8px 8px calc(10px + env(safe-area-inset-bottom));
			background: var(--surface);
			border-top: 1px solid var(--border);
		}
		.tabbar > * {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 3px;
			min-height: 48px;
			justify-content: center;
			font-size: 11px;
			font-weight: 500;
			color: var(--muted);
			text-decoration: none;
			border: 0;
			background: transparent;
		}
		.tabbar [aria-current='page'] {
			color: var(--accent-text);
			font-weight: 600;
		}
		.tabbar .soon {
			opacity: 0.55;
		}
	}
</style>
