import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';

const isTauri = !!process.env.TAURI_PLATFORM;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: isTauri
			? adapterStatic({ fallback: 'index.html' })
			: adapterNode(),
		files: {
			appTemplate: isTauri ? 'src/app.tauri.html' : 'src/app.html'
		}
	}
};

export default config;
