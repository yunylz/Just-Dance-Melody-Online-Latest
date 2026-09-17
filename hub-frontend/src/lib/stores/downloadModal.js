import { writable } from 'svelte/store';

/**
 * Global store controlling the "Download Desktop" modal.
 * Any component can open the download modal by calling openDownloadModal().
 */
export const downloadModalOpen = writable(false);

export function openDownloadModal() {
	downloadModalOpen.set(true);
}

export function closeDownloadModal() {
	downloadModalOpen.set(false);
}
