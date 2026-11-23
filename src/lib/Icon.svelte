<script lang="ts" module>
	export const icons = {
		sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
		moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
		inbox: 'M4 13h4l1 3h6l1-3h4 M4 13l2-8h12l2 8v6H4z',
		calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
		later: 'M4 12h14 M13 7l5 5l-5 5',
		folder: 'M3 6h6l2 2h10v11H3z',
		plus: 'M12 5v14 M5 12h14',
		check: 'M5 12l5 5l9-10',
		clock: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16 M12 8v4l3 2',
		note: 'M6 3h9l4 4v14H6z M9 11h6 M9 15h6',
		trash: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
		search: 'M10 4a6 6 0 1 0 0 12a6 6 0 1 0 0-12 M20 20l-5.5-5.5',
		redo: 'M4 12a8 8 0 0 1 14-5.3 M18 3v4h-4',
		link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
		pin: 'M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z M12 9a2 2 0 1 0 0 4a2 2 0 1 0 0-4',
		logout:'M14 4h5v16h-5 M10 8l-4 4l4 4 M6 12h10',
		shield: 'M12 3l7 3v5c0 5-3.5 8.5-7 10c-3.5-1.5-7-5-7-10V6z M9 12l2 2l4-4'
	} as const;
	export type IconName = keyof typeof icons;
</script>

<script lang="ts">
	let { name, size = 18, stroke = 1.8 }: { name: IconName; size?: number; stroke?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d={icons[name]} />
</svg>
