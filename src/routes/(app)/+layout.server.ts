import type { LayoutServerLoad } from './$types';
import { getDb, listAreas, openCountsByArea, ownerName } from '#lib/server/db.ts';

export const load: LayoutServerLoad = async () => {
	const db = getDb();
	const [areas, counts] = await Promise.all([listAreas(db), openCountsByArea(db)]);
	return { areas, counts, owner: ownerName() };
};
