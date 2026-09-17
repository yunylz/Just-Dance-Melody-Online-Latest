import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ cookies, url }) => {
	cookies.delete('session', { path: '/' });
	const returnTo = url.searchParams.get('returnTo');
	if (returnTo) {
		throw redirect(303, returnTo);
	}
	throw redirect(303, env.OIDC_LOGOUT_URL);
};
