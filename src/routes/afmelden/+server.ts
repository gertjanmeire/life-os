import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Afmelden: verwijdert de Cloudflare Access-sessie voor dit domein en stuurt
 * naar de welkomstpagina. Bij "Doorgaan met Google" meldt Access je opnieuw aan.
 */
export const GET: RequestHandler = ({ cookies }) => {
	cookies.delete('CF_Authorization', { path: '/' });
	redirect(303, '/welkom?afgemeld');
};
