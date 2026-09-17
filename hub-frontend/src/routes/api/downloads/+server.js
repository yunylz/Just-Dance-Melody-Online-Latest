/** @type {Array<{id: string, name: string, description: string, icon: string, versionFile: string}>} */
const DOWNLOADS = [
	{
		id: 'jdmo-launcher',
		name: 'JDMO Launcher',
		description: 'The official JDMO desktop launcher for accessing JDMO on PC.',
		icon: '/assets/jdmo-launcher.png',
		versionFile: 'https://jdmo-cdn.c0llydoll.com/public/builds/jdmo-launcher/latest.json'
	}
];

/**
 * Fetch version info from a remote JSON file.
 * @param {string} url
 * @param {typeof fetch} fetch
 * @returns {Promise<object|null>}
 */
async function fetchVersionFile(url, fetch) {
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': 'JDMO-Hub/1.0' }
		});
		if (!res.ok) {
			console.error(`Failed to fetch ${url}: ${res.status}`);
			return null;
		}
		return await res.json();
	} catch (e) {
		console.error(`Error fetching ${url}:`, e);
		return null;
	}
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ fetch }) {
	const enriched = await Promise.all(
		DOWNLOADS.map(async (item) => {
			const latest = item.versionFile
				? await fetchVersionFile(item.versionFile, fetch)
				: null;

			return {
				id: item.id,
				name: item.name,
				description: item.description,
				icon: item.icon,
				latest
			};
		})
	);

	return new Response(JSON.stringify({ downloads: enriched }), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=300'
		}
	});
}
