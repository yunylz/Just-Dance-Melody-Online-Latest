import Utils from './utils.js';
import API from './api.js';

/**
 * Request permission and subscribe to push notifications.
 * @returns {Promise<boolean>} true if subscribed successfully
 */
export async function subscribePush() {
	if (typeof window === 'undefined') return false;

	let permission = window.Notification.permission;
	if (permission === 'default') {
		permission = await window.Notification.requestPermission();
	}
	if (permission !== 'granted') return false;

	if (!navigator.serviceWorker) return false;

	const reg = await navigator.serviceWorker.ready;
	const sub = await reg.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: Utils.urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
	});

	await API.subscribePush(sub.toJSON());
	return true;
}

/**
 * Unsubscribe from push notifications.
 * @returns {Promise<boolean>} true if unsubscribed successfully
 */
export async function unsubscribePush() {
	if (typeof window === 'undefined' || !navigator.serviceWorker) return false;

	const reg = await navigator.serviceWorker.ready;
	const sub = await reg.pushManager.getSubscription();
	if (sub) {
		await sub.unsubscribe();
		await API.unsubscribePush(sub.endpoint);
	}
	return true;
}

/**
 * Check if already subscribed to push.
 * @returns {Promise<boolean>}
 */
export async function isPushSubscribed() {
	if (typeof window === 'undefined' || !navigator.serviceWorker) return false;
	try {
		const reg = await navigator.serviceWorker.ready;
		return !!(await reg.pushManager.getSubscription());
	} catch {
		return false;
	}
}
