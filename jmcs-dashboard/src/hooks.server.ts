import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const session = event.cookies.get('session');

	if (session) {
		try {
			event.locals.user = JSON.parse(session);
		} catch (e) {
			event.cookies.delete('session', { path: '/' });
			event.locals.user = null;
		}
	} else {
		event.locals.user = null;
	}

	// Protect all routes except /auth
	if (!event.locals.user && !event.url.pathname.startsWith('/auth')) {
		throw redirect(303, '/auth/login');
	}

	// If already logged in, don't allow access to login page
	if (event.locals.user && event.url.pathname === '/auth/login') {
		throw redirect(303, '/');
	}

	return await resolve(event);
};
