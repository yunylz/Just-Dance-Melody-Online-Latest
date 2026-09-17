<script>
	import Icon from '@iconify/svelte';
	import { Trophy, Heart, HeartOff, UserPlus } from 'lucide-svelte';
	import Utils from '$lib/utils';
	import Avatar from './Avatar.svelte';
	import CountryFlag from '../../CountryFlag.svelte';

	export let activity;
	export let timeAgo;
	export let onClick = null;

	$: songTitle = activity.song?.title || activity.song?.id || 'Unknown Song';
	$: songArtist = activity.song?.artist;
</script>

{#if activity && activity.user}
	<div
		class="group relative bg-gray-700/60 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-4 hover:border-purple-400/50 transition-all duration-300 w-full text-left"
	>
		<div class="flex items-center gap-3">
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<div
				class="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
				on:click={() => onClick?.(activity.user.userId)}
				role={onClick ? 'button' : undefined}
				tabindex={onClick ? '0' : undefined}
				on:keydown={(e) => e.key === 'Enter' && onClick?.(activity.user.userId)}
			>
				<Avatar
					avatar={activity.user.avatarId}
					username={activity.user.username}
					isOnline={activity.user.isOnline}
				/>

				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-0.5">
						<h4 class="font-semibold text-white truncate">
							{activity.user.username}
						</h4>
						<CountryFlag countryCode={activity.user.country} />
						<span class="text-[10px] text-gray-500 font-medium uppercase tracking-wider ml-auto"
							>{timeAgo(activity.timestamp)}</span
						>
					</div>

					<div class="flex items-center gap-3">
						<div class="flex-1 min-w-0">
							<div class="text-sm text-gray-400 leading-relaxed flex items-center gap-2 flex-wrap">
								{#if activity.type === 'score_improved'}
									<Trophy class="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
									<span>
										Scored <span class="text-white font-bold"
											>{activity.score?.toLocaleString() ?? 0}</span
										>
										<span class="text-xs {Utils.getStarsColorByScore(activity.score)} font-bold ml-1"
											>{Utils.getStarsByScore(activity.score)}</span
										>
										on <span class="text-purple-300 font-semibold">{songTitle}</span> by {songArtist}
									</span>
								{:else if activity.type === 'favorite_added'}
									<Heart class="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
									<span
										>Favorited <span class="text-pink-400 font-semibold">{songTitle}</span> by {songArtist}
									</span
									>
								{:else if activity.type === 'favorite_removed'}
									<HeartOff class="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
									<span
										>Removed <span class="text-gray-500 line-through">{songTitle}</span> by {songArtist} from favorites
									</span>
								{:else if activity.type === 'profile_created'}
									<UserPlus class="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
									<span>Joined JDMO on {Utils.getPlatformTitle(activity.platform)}!</span>
								{/if}
							</div>
						</div>

						{#if activity.song?.cover}
							<div
								class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/5 shadow-lg shadow-black/20"
							>
								<img src={activity.song.cover} alt="" class="w-full h-full object-cover" />
							</div>
						{/if}

						{#if activity.platform}
							<div
								class="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-gray-700/50 flex-shrink-0"
							>
								<Icon
									icon={Utils.getPlatformIcon(activity.platform)}
									class="w-6 h-6 text-gray-400 group-hover:text-white transition-colors"
								/>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
