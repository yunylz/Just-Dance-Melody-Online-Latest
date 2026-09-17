<script>
	import { Crown, Loader2, UserCheck } from 'lucide-svelte';
	import Icon from '@iconify/svelte';

	import Utils from '$lib/utils';
	import CountryFlag from '$lib/components/CountryFlag.svelte';
	import UserBox from '$lib/components/Hub/Shared/UserBox.svelte';

	export let dotwData;
	export let loadingDotw;
	export let onClick;
	export let relationshipMap = {};
</script>

<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<h3 class="text-xl font-semibold text-white flex items-center gap-2">
			<Crown/> Dancer of the Week
			{#if loadingDotw}
				<Loader2 class="w-5 h-5 text-purple-400 animate-spin" />
			{/if}
		</h3>
		<div class="flex flex-wrap gap-1.5">
			<span class="px-2 py-0.5 bg-gray-500/20 border border-gray-400/30 rounded-lg text-gray-400 text-xs">
				Just Dance 2019 to 2022
			</span>
		</div>
	</div>
	{#if !loadingDotw && dotwData.username}
		{@const playerUser = { userId: dotwData.userId, username: dotwData.username, avatarId: dotwData.avatar, country: null, isOnline: dotwData.isOnline, lastSeen: dotwData.lastSeen, platforms: [] }}
		<div class="relative group">
			<UserBox user={playerUser} {onClick} isCurrentUser={dotwData.isCurrentUser} relationship={relationshipMap[dotwData.userId] ?? 'none'}>
				<div slot="info" class="flex-1 min-w-0">
					{@const rel = relationshipMap[dotwData.userId] ?? 'none'}
					<div class="flex items-center gap-2 mb-1">
						<h4 class="font-semibold text-white {dotwData.isCurrentUser ? 'text-purple-300' : ''}">
							{dotwData.username}
						</h4>
						<CountryFlag countryId={dotwData.country?.id || 9627} />
						{#if rel === 'friend'}
							<div class="tooltip tooltip-top z-[999]" data-tip="Friend">
								<UserCheck class="w-4 h-4 text-green-400 shrink-0" />
							</div>
						{/if}
						{#if dotwData.isCurrentUser}
							<span class="px-2 py-0.5 bg-purple-500/20 border border-purple-400/30 rounded-full text-purple-400 text-xs font-medium">You</span>
						{/if}
					</div>
					<div class="flex items-center gap-2 text-sm text-gray-400">
						<span class="text-white font-semibold">{dotwData.score.toLocaleString()}</span>
						<span class="{Utils.getStarsColorByScore(dotwData.score)} font-semibold">{Utils.getStarsByScore(dotwData.score)}</span>
					</div>
				</div>
				<div slot="actions" class="hidden sm:block">
					<span class="text-4xl">
						<Icon icon={Utils.getPlatformIcon(dotwData.platform)} inline={true} />
					</span>
				</div>
			</UserBox>

			{#if dotwData.isCurrentUser}
				<div class="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-2xl pointer-events-none"></div>
			{/if}
		</div>
	{:else if !loadingDotw}
		<div class="text-center py-8">
			<Crown class="w-10 h-10 text-gray-600 mx-auto mb-3" />
			<p class="text-gray-400 font-medium mb-1">No Dancer of the Week yet</p>
			<p class="text-gray-500 text-sm">Dance to this song and claim the crown!</p>
		</div>
	{/if}

	<!-- <div class="flex items-center gap-4">

		<div class="w-20 h-20 rounded-2xl flex-shrink-0 border-2 border-gray-600/50 overflow-hidden relative bg-gray-600/50">
			{#if !coverLoaded}
				<div class="absolute inset-0 flex items-center justify-center">
					<Loader2 class="w-6 h-6 text-purple-400 animate-spin" />
				</div>
			{/if}
			{#if !coverError}
				<img
					src={selectedSong.assets.cover}
					alt="{selectedSong.title} cover"
					class="w-full h-full object-cover transition-opacity duration-300 {coverLoaded ? 'opacity-100' : 'opacity-0'}"
					on:load={() => { coverLoaded = true; }}
					on:error={() => { coverLoaded = true; coverError = true; }}
				/>
			{:else}
				<div class="w-full h-full flex items-center justify-center">
					<span class="text-gray-500 text-xs text-center px-1 leading-tight">No image</span>
				</div>
			{/if}
		</div>

		<div class="flex-1 min-w-0">
			<h2 class="text-xl font-bold text-white leading-tight truncate">{selectedSong.title}</h2>
			<p class="text-gray-400 text-sm mb-2 truncate">by {selectedSong.artist}</p>

			<div class="flex flex-wrap gap-1.5">
				<span class="px-2 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded-lg text-blue-400 text-xs">
					Just Dance {selectedSong.jdVersion}
				</span>
				{#if selectedPlatform?.id !== 'all'}
					<span class="px-2 py-0.5 bg-green-500/20 border border-green-400/30 rounded-lg text-green-400 text-xs">
						{selectedPlatform.name}
					</span>
				{/if}
				{#if selectedSong.isAlternative}
					<span class="px-2 py-0.5 bg-purple-500/20 border border-purple-400/30 rounded-lg text-purple-400 text-xs uppercase">Alt</span>
				{/if}
				{#if selectedSong.isDLC}
					<span class="px-2 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded-lg text-blue-400 text-xs uppercase">DLC</span>
				{/if}
				{#if selectedSong.isNTSC}
					<span class="px-2 py-0.5 bg-teal-500/20 border border-teal-400/30 rounded-lg text-teal-400 text-xs uppercase">NTSC</span>
				{:else if selectedSong.isPAL}
					<span class="px-2 py-0.5 bg-teal-500/20 border border-teal-400/30 rounded-lg text-teal-400 text-xs uppercase">PAL</span>
				{/if}
				{#if selectedSong.isMashup}
					<span class="px-2 py-0.5 bg-amber-500/20 border border-amber-400/30 rounded-lg text-amber-400 text-xs uppercase">Mashup</span>
				{/if}
			</div>
		</div>
	</div> -->
</div>
