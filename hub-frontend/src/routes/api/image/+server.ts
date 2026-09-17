import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

const PLACEHOLDER = '/assets/placeholder_cover.jpg';
const CDN_HOSTNAME = 'jdmo-cdn.c0llydoll.com';

export const GET: RequestHandler = async ({ url, fetch }) => {
    const target = url.searchParams.get('url');
    if (!target) {
        redirect(302, PLACEHOLDER);
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(target);
    } catch {
        console.error(`Malformed URL: ${target}`);
        redirect(302, PLACEHOLDER);
    }

    if (parsedUrl.hostname !== CDN_HOSTNAME) {
        console.error(`Invalid hostname: ${parsedUrl.hostname}`);
        redirect(302, PLACEHOLDER);
    }

    const ext = parsedUrl.pathname.split('.').pop()?.toLowerCase();
    if (!['png', 'jpg', 'jpeg'].includes(ext ?? '')) {
        console.error(`Invalid extension: ${ext}`);
        redirect(302, PLACEHOLDER);
    }

    try {
        const res = await fetch(target, {
            headers: { 'User-Agent': 'UbiServices_SDK_JDMO_Hub/1.0' }
        });

        if (!res.ok) {
            console.error(`Error fetching image from ${target}:`, res.status, res.statusText);
            redirect(302, PLACEHOLDER);
        }

        return new Response(res.body, {
            headers: {
                'Content-Type': res.headers.get('content-type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000'
            }
        });
    } catch (e) {
        console.error(`Unexpected error fetching ${target}:`, e);
        redirect(302, PLACEHOLDER);
    }
};