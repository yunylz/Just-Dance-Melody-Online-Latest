import { writable, derived } from 'svelte/store';
import API from '../api';

function createNotificationStore() {
	const { subscribe, set, update } = writable([]);

	return {
		subscribe,
		set,
		update,
		async fetch() {
			try {
				const notifs = await API.getNotifications();
				set(notifs);
			} catch (e) {
				console.error('Failed to fetch notifications store:', e);
			}
		},
		markAsRead(id) {
			update(notifs => notifs.map(n => n.id === id ? { ...n, new: false } : n));
		},
		markAllRead() {
			update(notifs => notifs.map(n => ({ ...n, new: false })));
		},
		clear() {
			set([]);
		}
	};
}

export const notifications = createNotificationStore();

export const unreadCount = derived(notifications, ($notifications) => {
	return $notifications.filter(n => n.new).length;
});
