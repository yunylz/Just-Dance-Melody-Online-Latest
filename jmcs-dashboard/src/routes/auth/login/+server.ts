import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';

export const GET: RequestHandler = async ({ cookies }) => {
	const state = crypto.randomBytes(16).toString('hex');
	cookies.set('oauth_state', state, { path: '/', maxAge: 600 }); // 10 mins

	const authUrl = new URL(env.OIDC_AUTHORIZE_URL);
	authUrl.searchParams.append('client_id', env.OIDC_CLIENT_ID);
	authUrl.searchParams.append('response_type', 'code');
	authUrl.searchParams.append('redirect_uri', env.OIDC_REDIRECT_URI);
	authUrl.searchParams.append('scope', 'openid profile email');
	authUrl.searchParams.append('state', state);

	throw redirect(303, authUrl.toString());
};
