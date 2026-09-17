import { writable } from 'svelte/store';

export const popups = writable([]);

export const popupStore = {
	add: (message, type = 'success', duration = 3000) => {
		const id = Math.random().toString(36).substr(2, 9);
		popups.update((all) => [...all, { id, message, type, duration }]);

		if (duration > 0) {
			setTimeout(() => {
				popupStore.remove(id);
			}, duration);
		}
	},
	remove: (id) => {
		popups.update((all) => all.filter((p) => p.id !== id));
	}
};
