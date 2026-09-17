import { getBaseUrl, user } from './jmcs';
import { get } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
	try {
		const baseUrl = getBaseUrl();
		const currentUser = get(user);

		// If it starts with local:, it hits the dashboard's own origin.
		// If it starts with /, it's an absolute path from the JMCS API root.
		// Otherwise, assume it's a script in /admin/v1/scripts/.
		const isLocal = endpoint.startsWith('local:');
		const cleanEndpoint = isLocal ? endpoint.substring(6) : endpoint;

		const fullEndpoint = cleanEndpoint.startsWith('/') ? cleanEndpoint : `/admin/v1/scripts/${cleanEndpoint}`;
		const url = isLocal ? fullEndpoint : `${baseUrl}${fullEndpoint}`;

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...((options.headers as Record<string, string>) || {})
		};

		if (currentUser?.accessToken) {
			headers['Authorization'] = `Bearer ${currentUser.accessToken}`;
			console.log(`[API] Fetching ${url} with token: ${currentUser.accessToken.substring(0, 10)}...`);
		} else {
			console.warn(`[API] Fetching ${url} WITHOUT token! User state:`, currentUser);
		}

		const res = await fetch(url, {
			...options,
			headers
		});

		let data;
		const contentType = res.headers.get('content-type');
		if (contentType && contentType.includes('application/json')) {
			data = await res.json();
		} else {
			data = await res.text();
		}

		if (!res.ok) {
			if (res.status === 401 || data?.errorCode === 43) {
				console.error(`[API] Unauthorized (${res.status === 401 ? 'HTTP 401' : 'errorCode 43'}). Logging out...`);
				if (browser) {
					const currentPath = window.location.pathname;
					if (!currentPath.startsWith('/auth')) {
						user.set(null);
						// We need to hit a server endpoint to clear the HttpOnly session cookie
						window.location.href = '/auth/logout?returnTo=/auth/login%3Fexpired%3Dtrue';
					} else {
						console.warn("[API] Unauthorized but already on auth page. Skipping redirect.");
					}
				}
				throw new Error("Session expired. Please login again.");
			}
			throw new Error(data.message || data.error || `HTTP error ${res.status}`);
		}
		return data;
	} catch (err: any) {
		console.error(`API Error on ${endpoint}:`, err);
		throw err;
	}
}