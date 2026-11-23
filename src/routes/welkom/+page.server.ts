import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Ben je al aangemeld (er is een Cloudflare Access-sessie voor dit domein),
 * dan sturen we je meteen door naar de app. Cloudflare Access controleert
 * daar zelf of de sessie nog geldig is.
 * Net afgemeld (?afgemeld)? Dan blijf je hier, zodat afmelden altijd werkt.
 */
export const load: PageServerLoad = ({ cookies, url }) => {
	if (cookies.get('CF_Authorization') && !url.searchParams.has('afgemeld')) {
		redirect(303, '/');
	}
};
