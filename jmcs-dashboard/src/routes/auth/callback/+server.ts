import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const oauth_error = url.searchParams.get('error');

	if (oauth_error) {
		throw error(400, `SSO Error: ${oauth_error}`);
	}

	if (!code || !state) {
		throw error(400, 'Missing code or state');
	}

	const savedState = cookies.get('oauth_state');
	if (!savedState || savedState !== state) {
		throw error(400, 'Invalid state parameter');
	}

	cookies.delete('oauth_state', { path: '/' });

	// Exchange code for token
	const tokenParams = new URLSearchParams();
	tokenParams.append('grant_type', 'authorization_code');
	tokenParams.append('code', code);
	tokenParams.append('redirect_uri', env.OIDC_REDIRECT_URI);
	tokenParams.append('client_id', env.OIDC_CLIENT_ID);
	tokenParams.append('client_secret', env.OIDC_CLIENT_SECRET);

	const tokenRes = await fetch(env.OIDC_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: tokenParams.toString()
	});

	if (!tokenRes.ok) {
		const text = await tokenRes.text();
		throw error(400, `Token exchange failed: ${text}`);
	}

	const tokens = await tokenRes.json();
	const accessToken = tokens.access_token;

	if (!accessToken) {
		throw error(400, 'No access token returned');
	}

	// Get user info
	const userRes = await fetch(env.OIDC_USERINFO_URL, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});

	if (!userRes.ok) {
		throw error(400, 'Failed to fetch user info');
	}

	const userInfo = await userRes.json();

	const user = {
		id: userInfo.sub || userInfo.id || 'unknown',
		name: userInfo.display_name || userInfo.name || 'User',
		email: userInfo.email || '',
		avatar: userInfo.picture || '',
		accessToken // Store it to pass to the API
	};

	cookies.set('session', JSON.stringify(user), {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 // 1 day
	});

	throw redirect(303, '/');
};
