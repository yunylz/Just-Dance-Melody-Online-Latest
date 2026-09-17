import { fetchApi } from './api';

export interface QuestAssetUrls {
	phoneImageURL: string;
	coverImageURL: string;
	logoImageURL: string;
}

export interface Quest {
	id: string;
	title: string;
	locked: number;
	playlist: string[];
	assetUrls: QuestAssetUrls;
}

/**
 * Loads all quests from JMCS (via the manage-quests script).
 */
export async function loadQuests(): Promise<Quest[]> {
	try {
		const res = await fetchApi<{ success: boolean; items: Quest[] }>('manage-quests/list');
		return res?.items || [];
	} catch {
		return [];
	}
}

/**
 * Creates a new quest.
 */
export async function createQuest(quest: Quest): Promise<void> {
	await fetchApi('manage-quests/create', {
		method: 'POST',
		body: JSON.stringify(quest)
	});
}

/**
 * Upserts a quest by id.
 */
export async function saveQuest(quest: Quest): Promise<void> {
	await fetchApi(`manage-quests/update/${encodeURIComponent(quest.id)}`, {
		method: 'POST',
		body: JSON.stringify(quest)
	});
}

/**
 * Deletes a quest by id.
 */
export async function deleteQuest(id: string): Promise<void> {
	await fetchApi(`manage-quests/delete/${encodeURIComponent(id)}`, { method: 'POST' });
}
