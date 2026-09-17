<script>
	import API from '$lib/api.js';
	import CountryFlag from '$lib/components/CountryFlag.svelte';
	import Utils from '$lib/utils.js';
	import Avatar from '../Shared/Avatar.svelte';

	export let selectedUser = null;
	export let isTournament = false;
	export let closeModal;
	export let getPlatformDisplayName;
	export let getPlatformIcon;

	function handleOutsideClick(event) {
		if (event.target === event.currentTarget) {
			closeModal();
		}
	}
</script>

{#if selectedUser}
	<div
		class="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 min-h-screen w-full"
		on:click={handleOutsideClick}
		on:keydown={(event) => {
			if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
				closeModal();
			}
		}}
		tabindex="0"
		role="dialog"
		aria-modal="true"
	>
		<div class="bg-gray-800/90 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 max-w-md w-full mx-4">
			<div class="flex items-center gap-4 mb-6">
				<Avatar avatar={selectedUser.avatar} username={selectedUser.name} isOnline={selectedUser.isOnline} />
				<div>
					<h2 class="text-2xl font-bold text-white">{selectedUser.name}</h2>
					<p class="text-gray-400 flex items-center gap-2">
						<CountryFlag countryId={selectedUser.countryId} />
						{selectedUser.isCurrentUser ? '(You)' : ''}
					</p>
				</div>
			</div>

			<div class="space-y-4">
				{#if selectedUser.isOnline}
					<div class="flex items-center gap-2">
						<span class="text-gray-400">Status:</span>
						<span class="text-green-400 font-semibold flex items-center gap-1.5">
							<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
							Online Now
						</span>
					</div>
				{:else if selectedUser.lastSeen}
					<div class="flex items-center gap-2">
						<span class="text-gray-400">Last Seen:</span>
						<span class="text-gray-300 font-semibold">
							{Utils.timeAgo(selectedUser.lastSeen)}
						</span>
					</div>
				{/if}
				<div class="flex items-center gap-2">
					<span class="text-gray-400">Rank:</span>
					<span class="text-white font-semibold">#{selectedUser.rank}</span>
				</div>
				{#if !isTournament}
					<div class="flex items-center gap-2">
						<span class="text-gray-400">Score:</span>
						<span class="text-white font-semibold">{selectedUser.score?.toLocaleString() ?? 'N/A'}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-gray-400">Stars:</span>
						<span class="{Utils.getStarsColor(selectedUser.totalStars)} font-semibold">
							{Utils.getStarsByStars(selectedUser.totalStars)}
						</span>
					</div>
				{:else}
					<div class="flex items-center gap-2">
						<span class="text-gray-400">Points:</span>
						<span class="text-white font-semibold">{selectedUser.points.toLocaleString()}</span>
					</div>
				{/if}
				<div class="flex items-center gap-2">
					<span class="text-gray-400">Platform:</span>
					<span class="flex items-center gap-2">
						<span class="text-2xl">{getPlatformIcon(selectedUser.platform)}</span>
						<span class="text-white">{getPlatformDisplayName(selectedUser.platform)}</span>
					</span>
				</div>
			</div>

			<button
				on:click={closeModal}
				class="mt-6 w-full px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 rounded-xl text-purple-400 text-sm font-medium transition-all duration-200 hover:scale-105"
			>
				Close
			</button>
		</div>
	</div>
{/if}