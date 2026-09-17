import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export const ENVS = ["MAIN", "LOCAL"] as const;
export type EnvType = (typeof ENVS)[number];

export const SERVERS: Record<EnvType, { FQDN: string }> = {
	MAIN: {
		FQDN: 'https://jmcs-main.c0llydoll.dev'
	},
	LOCAL: {
		FQDN: 'http://localhost:3000'
	}
};

const initialEnv = (browser && (localStorage.getItem('jmcsEnv') as EnvType)) || 'MAIN';
export const currentEnv = writable<EnvType>(initialEnv);

if (browser) {
	currentEnv.subscribe((value) => {
		localStorage.setItem('jmcsEnv', value);
	});
}

export function getBaseUrl() {
	const env = get(currentEnv);
	const server = SERVERS[env];
	return server.FQDN;
}

export const user = writable<App.Locals['user']>(null);

export const refreshTrigger = writable(0);
export function triggerRefresh() {
	refreshTrigger.update((n) => n + 1);
}