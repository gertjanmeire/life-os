// See https://svelte.dev/docs/kit/types#app.d.ts
// Cloudflare-bindings (DB, OWNER_NAME, TIMEZONE) lees je via `import { env } from 'cloudflare:workers'`.
declare global {
	namespace App {}
}

export {};
