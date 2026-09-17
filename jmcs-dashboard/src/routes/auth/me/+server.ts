import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ success: false, message: 'Not logged in' }, { status: 401 });
	}
	return json({ success: true, user: locals.user });
};
