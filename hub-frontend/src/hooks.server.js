const password = '52D53fPDmgyIcNNfp';
const realm = 'JDMO';
const tauriUserAgent = 'JDMO-Hub-Tauri';

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {boolean}
 */
function isAuthenticated(event) {
	const auth = event.request.headers.get('authorization');
	if (!auth || !auth.startsWith('Basic ')) return false;

	try {
		const encoded = auth.slice(6);
		const decoded = atob(encoded);
		const [, pass] = decoded.split(':');
		return pass === password;
	} catch {
		return false;
	}
}

/**
 * Requests coming from the Tauri desktop app carry a custom user agent
 * (set in src-tauri/tauri.conf.json), so we let those through without
 * the HTTP Basic auth prompt.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {boolean}
 */
function isTauriRequest(event) {
	return (event.request.headers.get('user-agent') || '').includes(tauriUserAgent);
}

/**
 * @param {import('@sveltejs/kit').Handle} param0
 * @returns {Promise<Response>}
 */
export async function handle({ event, resolve }) {
	// if (!isTauriRequest(event) && !isAuthenticated(event)) {
	// 	return new Response('Unauthorized', {
	// 		status: 401,
	// 		headers: {
	// 			'WWW-Authenticate': `Basic realm="${realm}"`
	// 		}
	// 	});
	// }

	return resolve(event);
}