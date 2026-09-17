<script lang="ts">
	import {
		Film,
		RefreshCw,
		Trash2,
		Eye,
		Flag,
		ChevronDown,
		ChevronUp,
		CheckCircle,
		XCircle,
		Star,
		Tag,
		ThumbsUp,
	} from "lucide-svelte";
	import { getTypeInfo, getUgcId, formatTimestamp, getContentSummary } from "./ugc-constants";

	interface Props {
		ugcs: any[];
		loading: boolean;
		errorMessage: string;
		total: number;
		currentPage: number;
		maxPage: number;
		sortCol: string | null;
		sortDesc: boolean;
		onReload: () => void;
		onToggleSort: (col: string) => void;
		onPageChange: (page: number) => void;
		onDetail: (ugc: any) => void;
		onModerate: (ugc: any, approved: boolean) => void;
		onToggleFeature: (ugc: any) => void;
		onTags: (ugc: any) => void;
		onDelete: (ugc: any) => void;
	}

	let {
		ugcs,
		loading,
		errorMessage,
		total,
		currentPage,
		maxPage,
		sortCol,
		sortDesc,
		onReload,
		onToggleSort,
		onPageChange,
		onDetail,
		onModerate,
		onToggleFeature,
		onTags,
		onDelete,
	}: Props = $props();

	const sortableHeaders = [
		{ key: "type", label: "Type" },
		{ key: "mapName", label: "Song" },
		{ key: null, label: "Owner" },
		{ key: null, label: "Content" },
		{ key: "likes", label: "Stats" },
		{ key: "approved", label: "Status" },
		{ key: "time", label: "Created" },
	];
</script>

{#if loading}
	<div class="space-y-2">
		{#each Array(5) as _}
			<div class="h-16 bg-slate-800 animate-pulse rounded-xl"></div>
		{/each}
	</div>
{:else if errorMessage}
	<div class="bg-red-500/10 border border-red-500/30 rounded-3xl p-12 text-center">
		<Trash2 class="w-12 h-12 text-red-500/50 mx-auto mb-4" />
		<h3 class="text-white font-bold text-lg">Failed to load UGC</h3>
		<p class="text-slate-500 text-sm mt-1">{errorMessage}</p>
		<button onclick={onReload} class="mt-6 bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all">
			<RefreshCw class="w-4 h-4 inline mr-2" />Try Again
		</button>
	</div>
{:else}
	<!-- UGC Table -->
	<div class="border border-slate-800 rounded-xl overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="bg-slate-800 border-b border-slate-700">
					<tr>
						<th class="p-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white select-none" onclick={() => onToggleSort("type")}>
							<div class="flex items-center gap-1">
								Type
								{#if sortCol === "type"}
									{#if sortDesc}<ChevronDown class="w-3 h-3" />{:else}<ChevronUp class="w-3 h-3" />{/if}
								{/if}
							</div>
						</th>
						<th class="p-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white select-none" onclick={() => onToggleSort("mapName")}>
							<div class="flex items-center gap-1">
								Song
								{#if sortCol === "mapName"}
									{#if sortDesc}<ChevronDown class="w-3 h-3" />{:else}<ChevronUp class="w-3 h-3" />{/if}
								{/if}
							</div>
						</th>
						<th class="p-3 text-left text-slate-400 font-medium">Owner</th>
						<th class="p-3 text-left text-slate-400 font-medium">Content</th>
						<th class="p-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white select-none" onclick={() => onToggleSort("likes")}>
							<div class="flex items-center gap-1">
								Stats
								{#if sortCol === "likes"}
									{#if sortDesc}<ChevronDown class="w-3 h-3" />{:else}<ChevronUp class="w-3 h-3" />{/if}
								{/if}
							</div>
						</th>
						<th class="p-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white select-none" onclick={() => onToggleSort("approved")}>
							<div class="flex items-center gap-1">
								Status
								{#if sortCol === "approved"}
									{#if sortDesc}<ChevronDown class="w-3 h-3" />{:else}<ChevronUp class="w-3 h-3" />{/if}
								{/if}
							</div>
						</th>
						<th class="p-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white select-none" onclick={() => onToggleSort("time")}>
							<div class="flex items-center gap-1">
								Created
								{#if sortCol === "time"}
									{#if sortDesc}<ChevronDown class="w-3 h-3" />{:else}<ChevronUp class="w-3 h-3" />{/if}
								{/if}
							</div>
						</th>
						<th class="p-3 text-right text-slate-400 font-medium">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-800/50">
					{#each ugcs as ugc (getUgcId(ugc))}
						{@const tInfo = getTypeInfo(ugc.type)}
						<tr class="hover:bg-slate-800/40 transition-colors">
							<td class="p-3">
								<div class="flex items-center gap-2">
									<div class="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400" title={tInfo.label}>
										<svelte:component this={tInfo.icon} class="w-3.5 h-3.5" />
									</div>
									<span class="text-xs font-bold text-slate-300 uppercase">{ugc.type}</span>
								</div>
							</td>
							<td class="p-3">
								<div class="flex flex-col">
									<span class="text-white font-medium text-xs">{ugc.mapName || "-"}</span>
									{#if ugc.gameVersion}
										<span class="text-[10px] text-slate-500 font-mono">{ugc.gameVersion}</span>
									{/if}
								</div>
							</td>
							<td class="p-3">
								<div class="flex flex-col">
									<span class="text-slate-300 text-xs font-medium">{ugc.name || ugc.profileId?.substring(0, 12) || "-"}</span>
									{#if ugc.profileId}
										<span class="text-[10px] text-slate-600 font-mono truncate max-w-[120px]" title={ugc.profileId}>{ugc.profileId.substring(0, 16)}...</span>
									{/if}
								</div>
							</td>
							<td class="p-3">
								<span class="text-xs text-slate-400 truncate max-w-[150px] block" title={getContentSummary(ugc.content)}>
									{getContentSummary(ugc.content)}
								</span>
							</td>
							<td class="p-3">
								<div class="flex items-center gap-3 text-xs text-slate-400">
									<span class="flex items-center gap-1"><ThumbsUp class="w-3 h-3" />{ugc.likes ?? 0}</span>
									<span class="flex items-center gap-1"><Eye class="w-3 h-3" />{ugc.views ?? 0}</span>
									{#if ugc.reports > 0}
										<span class="flex items-center gap-1 text-red-400"><Flag class="w-3 h-3" />{ugc.reports}</span>
									{/if}
								</div>
							</td>
							<td class="p-3">
								{#if ugc.deleted}
									<span class="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded-md uppercase tracking-wider">Deleted</span>
								{:else if ugc.approved === 1}
									<span class="text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-1 rounded-md uppercase tracking-wider">Approved</span>
								{:else if ugc.approved === 0}
									<span class="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded-md uppercase tracking-wider">Denied</span>
								{:else if ugc.pendingConfirmation}
									<span class="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md uppercase tracking-wider">Awaiting Upload</span>
								{:else}
									<span class="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-md uppercase tracking-wider">Pending</span>
								{/if}
							</td>
							<td class="p-3">
								<span class="text-xs text-slate-400">{formatTimestamp(ugc.time)}</span>
							</td>
							<td class="p-3 text-right">
								<div class="flex items-center justify-end gap-1">
									<button
										onclick={() => onDetail(ugc)}
										class="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-md transition-colors"
										title="View Details"
									>
										<Eye class="w-4 h-4" />
									</button>
									{#if !ugc.deleted}
										{#if ugc.approved === undefined || ugc.approved === null}
											<button
												onclick={() => onModerate(ugc, true)}
												class="p-1.5 text-green-400 hover:bg-green-400/10 rounded-md transition-colors"
												title="Approve"
											>
												<CheckCircle class="w-4 h-4" />
											</button>
											<button
												onclick={() => onModerate(ugc, false)}
												class="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
												title="Deny"
											>
												<XCircle class="w-4 h-4" />
											</button>
										{/if}
										<button
											onclick={() => onToggleFeature(ugc)}
											class="p-1.5 {ugc.featured ? 'text-amber-400 hover:bg-amber-400/10' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-400/10'} rounded-md transition-colors"
											title={ugc.featured ? "Unfeature" : "Feature"}
										>
											<Star class="w-4 h-4" />
										</button>
										<button
											onclick={() => onTags(ugc)}
											class="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-md transition-colors"
											title="Manage Tags"
										>
											<Tag class="w-4 h-4" />
										</button>
										<button
											onclick={() => onDelete(ugc)}
											class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
											title="Delete"
										>
											<Trash2 class="w-4 h-4" />
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="8" class="p-12 text-center text-slate-500">
								<div class="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
									<Film class="w-8 h-8 text-slate-600" />
								</div>
								<h3 class="text-white font-bold mb-1">No UGC Found</h3>
								<p class="text-sm">No user-generated content matches your current filters.</p>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Pagination -->
	<div class="flex items-center justify-between bg-slate-900/20 p-4 rounded-2xl border border-slate-800/50">
		<div class="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">
			Page <span class="text-white">{currentPage}</span> of <span class="text-white">{maxPage}</span>
			<span class="mx-3 text-slate-800">|</span>
			Total <span class="text-white">{total}</span> UGCs
		</div>

		<div class="flex gap-2">
			<button
				disabled={currentPage === 1}
				onclick={() => onPageChange(currentPage - 1)}
				class="px-5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-black text-slate-300 disabled:opacity-20 transition-all hover:bg-slate-700 hover:text-white"
			>
				Previous
			</button>
			<button
				disabled={currentPage === maxPage}
				onclick={() => onPageChange(currentPage + 1)}
				class="px-5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-black text-slate-300 disabled:opacity-20 transition-all hover:bg-slate-700 hover:text-white"
			>
				Next
			</button>
		</div>
	</div>
{/if}
