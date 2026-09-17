import { fetchApi } from './api';

/**
 * Loads a WDF config document from JMCS (via the manage-wdf script).
 * Returns the raw data (the file content for that config name), or {} if none.
 */
export async function loadWdfConfig(name: string): Promise<any> {
	try {
		const res = await fetchApi<any>(`manage-wdf/get/${name}`);
		return res?.data ?? {};
	} catch {
		return {};
	}
}

/**
 * Persists a WDF config document (upserts the whole config by name).
 */
export async function saveWdfConfig(name: string, data: any): Promise<void> {
	await fetchApi(`manage-wdf/update/${name}`, {
		method: 'POST',
		body: JSON.stringify({ data })
	});
}

/**
 * Deletes a WDF config document by name.
 */
export async function deleteWdfConfig(name: string): Promise<void> {
	await fetchApi(`manage-wdf/delete/${name}`, { method: 'POST' });
}

/**
 * Fetches the valid SKU ids (sourced from jmcs skus.ts).
 */
export async function fetchSkus(): Promise<string[]> {
	try {
		const res = await fetchApi<{ success: boolean; ids: string[] }>('manage-wdf/skus');
		return res?.ids || [];
	} catch {
		return [];
	}
}

/**
 * Splits a newline-separated value into a trimmed, de-duplicated string array.
 */
export function parseList(value: string): string[] {
	return [...new Set(value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))];
}

/**
 * Joins a string array into a newline-separated value for editing.
 */
export function toList(value: string[] | undefined): string {
	return (value || []).join('\n');
}
