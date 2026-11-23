<script lang="ts">
	import Icon from '#lib/Icon.svelte';
</script>

<svelte:head>
	<title>Welkom · Life OS</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="welcome">
	<section class="intro">
		<div class="brand">
			<span class="mark">•</span>
			<span class="brand-name">Life OS</span>
		</div>

		<div class="pitch">
			<span class="hand">je persoonlijke notitieboek</span>
			<h1>Alles van je leven, op één plek.</h1>
			<p>Taken, afspraken, notities en documenten. Rustig, overzichtelijk en altijd bij de hand.</p>
		</div>

		<ul class="sample" aria-label="Voorbeeld van een dag">
			<li>
				<span class="box"></span>
				<span>Autoverzekering verlengen</span>
			</li>
			<li class="done">
				<span class="box on"><Icon name="check" size={12} stroke={3} /></span>
				<span>Boodschappen voor het weekend</span>
			</li>
			<li>
				<span class="kind" style="--area: #3E86C4"><Icon name="clock" size={12} stroke={2.4} /></span>
				<span><b>20:00</b> Concert fotograferen</span>
			</li>
			<li class="note">
				<span class="kind" style="--area: #3E86C4"><Icon name="note" size={12} stroke={2.4} /></span>
				<span>Idee: fotoboek van de zomer</span>
			</li>
		</ul>
	</section>

	<section class="signin" aria-labelledby="signin-title">
		<div class="panel">
			<div class="lead">
				<h2 id="signin-title">Welkom terug</h2>
				<p>Meld je aan om je dag en collecties te openen.</p>
			</div>

			<a class="google" href="/">
				<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4" />
					<path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1c-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853" />
					<path d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9z" fill="#FBBC05" />
					<path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" fill="#EA4335" />
				</svg>
				Doorgaan met Google
			</a>

			<div class="secure">
				<span class="shield"><Icon name="shield" size={20} /></span>
				<span>Alleen jouw Google-account heeft toegang. De app zit achter een extra beveiligingslaag van Cloudflare.</span>
			</div>

			<p class="foot">Werkt op iPhone, iPad, Mac en Windows. Installeer Life OS via je browser om het als app te gebruiken.</p>
		</div>
	</section>
</div>

<style>
	.welcome {
		min-height: 100dvh;
		display: flex;
		flex-wrap: wrap;
	}
	.intro {
		flex: 1 1 520px;
		min-width: 0;
		padding: clamp(32px, 6vw, 64px);
		padding-top: max(clamp(32px, 6vw, 56px), env(safe-area-inset-top));
		background-color: var(--accent-soft);
		background-image: radial-gradient(color-mix(in srgb, var(--accent-fg) 24%, transparent) 1.2px, transparent 1.5px);
		background-size: 24px 24px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 40px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.mark {
		width: 38px;
		height: 38px;
		border-radius: 12px;
		background: var(--accent);
		color: var(--on-accent);
		display: grid;
		place-items: center;
		font: 600 24px var(--font-display);
	}
	.brand-name {
		font: 600 24px var(--font-display);
	}
	.pitch {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 560px;
	}
	.hand {
		font: 30px/1 var(--font-hand);
		color: var(--accent-fg);
	}
	h1 {
		font-size: clamp(40px, 6vw, 60px);
		line-height: 1.04;
		letter-spacing: -0.025em;
	}
	.pitch p {
		margin: 0;
		max-width: 460px;
		font-size: 17px;
		color: var(--text-2);
	}
	.sample {
		list-style: none;
		margin: 0;
		padding: 20px 24px;
		max-width: 420px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		border-radius: 20px;
		background: color-mix(in srgb, var(--surface) 78%, transparent);
	}
	.sample li {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.sample .done {
		color: var(--muted);
		text-decoration: line-through;
	}
	.sample .note {
		color: var(--text-2);
		font-style: italic;
	}
	.box,
	.kind {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		border-radius: 7px;
		display: grid;
		place-items: center;
	}
	.box {
		border: 1.5px solid var(--border-strong);
	}
	.box.on {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--on-accent);
	}
	.kind {
		color: var(--area);
		background: color-mix(in srgb, var(--area) 18%, transparent);
	}
	.signin {
		flex: 1 1 440px;
		min-width: 0;
		padding: clamp(32px, 6vw, 56px) clamp(20px, 5vw, 48px);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.panel {
		width: 100%;
		max-width: 380px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.lead {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	h2 {
		font-size: 34px;
		letter-spacing: -0.01em;
	}
	.lead p {
		margin: 0;
		color: var(--text-2);
	}
	.google {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		height: 52px;
		border-radius: 14px;
		border: 1px solid var(--border-strong);
		background: var(--surface);
		color: var(--text);
		font-weight: 600;
		font-size: 15px;
		text-decoration: none;
		transition: border-color 0.15s, transform 0.1s;
	}
	.google:hover {
		border-color: var(--accent);
	}
	.google:active {
		transform: scale(0.99);
	}
	.secure {
		display: flex;
		gap: 12px;
		padding: 14px 16px;
		border-radius: 14px;
		background: var(--side);
		font-size: 13px;
		color: var(--text-2);
	}
	.shield {
		flex-shrink: 0;
		color: #4e9a3a;
		margin-top: 1px;
	}
	.foot {
		margin: 0;
		font-size: 12px;
		color: var(--muted);
	}
</style>
