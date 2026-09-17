// Store for JMCS data
import { writable } from 'svelte/store';

export const jmcsItems = writable({
	avatars: [],
	skins: [],
	portraitBorders: []
});

export const jmcsSongs = writable([]);

export const jmcsAliases = writable([]);