import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	function add(message: string, type: ToastType = 'info', duration: number = 3000) {
		const id = Math.random().toString(36).substring(2, 9);
		const toast: Toast = { id, message, type, duration };

		update((toasts) => [...toasts, toast]);

		if (duration > 0) {
			setTimeout(() => {
				remove(id);
			}, duration);
		}

		return id;
	}

	function remove(id: string) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	return {
		subscribe,
		success: (msg: string, dur?: number) => add(msg, 'success', dur),
		error: (msg: string, dur?: number) => add(msg, 'error', dur),
		info: (msg: string, dur?: number) => add(msg, 'info', dur),
		warning: (msg: string, dur?: number) => add(msg, 'warning', dur),
		remove
	};
}

export const toast = createToastStore();
