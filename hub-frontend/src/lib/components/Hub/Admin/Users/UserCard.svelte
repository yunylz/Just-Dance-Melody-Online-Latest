<script>
	import {
		Mail,
		Calendar,
		Globe,
		Shield,
		AlertTriangle,
		CheckCircle,
		ShieldCheck,
		UserX,
		UserCheck,
		Gamepad2,
		ChevronDown,
		ChevronUp,
		Trash2,
		Unlink,
		Info,
		Eye,
		EyeOff,
		TestTube,
		X,
		XCircle,
		Loader2,
		Check
	} from 'lucide-svelte';
	import API from '$lib/api.js';
	import CountryFlag from '$lib/components/CountryFlag.svelte';
	import Icon from '@iconify/svelte';

	export let user;
	export let formatDate;
	export let onBanAction;
	export let onDeleteAction;
	export let onUnlinkProfile;
	export let onQaAction;
	export let hasProfiles;
	export let consoles;
	export let onSetJmcsEnv;
	export let highlighted = false;
	export let selected = false;
	export let onToggleSelect;

	let showProfiles = false;
	let showBanDetails = false;
	let showEmail = false; // Initialize to false to blur email by default

	function getStatusBadge(status) {
		if (status.banned)
			return { text: 'Banned', class: 'bg-red-500/20 text-red-400 border-red-400/30' };
		if (status.locked)
			return { text: 'Locked', class: 'bg-orange-500/20 text-orange-400 border-orange-400/30' };
		if (status.suspiciousActivity)
			return { text: 'Suspicious', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30' };
		if (status.admin)
			return { text: 'Admin', class: 'bg-purple-500/20 text-purple-400 border-purple-400/30' };
		if (status.moderator)
			return { text: 'Moderator', class: 'bg-blue-500/20 text-blue-400 border-blue-400/30' };
		if (status.generalStatus === 'activated')
			return { text: 'Active', class: 'bg-green-500/20 text-green-400 border-green-400/30' };
		return { text: 'Inactive', class: 'bg-gray-500/20 text-gray-400 border-gray-400/30' };
	}

	$: statusBadge = getStatusBadge(user.status);

	function toggleProfiles() {
		showProfiles = !showProfiles;
	}

	function toggleBanDetails() {
		showBanDetails = !showBanDetails;
	}

	function toggleEmail() {
		showEmail = !showEmail;
	}

	async function handleUnlinkProfile(profileId) {
		await onUnlinkProfile(user.userId, profileId);
	}

	async function handleQaAction(action) {
		await onQaAction(user, action);
	}

	let changingEnv = false;

	async function handleSetJmcsEnv(env) {
		if (changingEnv) return;
		changingEnv = true;
		try {
			await onSetJmcsEnv(user.userId, env);
		} finally {
			changingEnv = false;
		}
	}
</script>

<div
	class="bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 rounded-2xl hover:border-purple-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
	class:highlight-pulse={highlighted}
	class:card-selected={selected}
>
	<!-- Main User Info -->
	<div class="p-6">
		<div class="flex flex-col sm:flex-row sm:items-start gap-4">
			<!-- Selection Checkbox -->
			<button
				on:click={() => onToggleSelect(user.userId)}
				aria-label={selected ? `Deselect ${user.username}` : `Select ${user.username}`}
				title={selected ? 'Deselect' : 'Select'}
				class="flex-shrink-0 mt-1.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 hover:scale-110 {selected
					? 'bg-purple-500/30 border-purple-400 text-purple-200'
					: 'border-gray-600 text-transparent hover:border-purple-400/60 hover:text-purple-300/60'}"
			>
				<Check class="w-4 h-4" />
			</button>

			<!-- Avatar and Status -->
			<div class="relative flex-shrink-0">
				<img
					src={API.getAvatarUrl(user.avatarId)}
					on:error={(e) => (e.target.src = API.getDefaultAvatar())}
					alt="{user.username} avatar"
					class="w-14 h-14 rounded-xl object-cover border-2 border-gray-600/50 shadow-lg"
					loading="lazy"
				/>
				{#if user.status.admin}
					<div
						class="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-lg"
					>
						<Shield class="w-3 h-3 text-white" />
					</div>
				{/if}
			</div>

			<!-- User Details -->
			<div class="flex-1 min-w-0 space-y-3">
				<!-- Name and Status Row -->
				<div class="flex items-center gap-3 flex-wrap">
					<h4 class="font-bold text-white text-lg">{user.username}</h4>
					<CountryFlag countryCode={user.country} />
					<button
						class="px-3 py-1 {statusBadge.class} border rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
						class:cursor-pointer={user.status.banned}
						on:click={user.status.banned ? toggleBanDetails : undefined}
					>
						{statusBadge.text}
						{#if user.status.banned}
							<Info class="w-3 h-3 inline ml-1" />
						{/if}
					</button>

					<!-- QA Badge -->
					{#if user.status.qa}
						<div
							class="px-3 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 rounded-full text-sm font-medium flex items-center gap-1"
						>
							<TestTube class="w-3 h-3" />
							QA
						</div>
					{/if}

				</div>

				<!-- Contact Info -->
				<div class="flex items-center gap-2 text-sm text-gray-300">
					<Mail class="w-4 h-4 text-gray-400 flex-shrink-0" />
					<span
						class="truncate transition-all duration-300"
						style={showEmail ? '' : 'filter: blur(4px);'}
					>
						{user.email}
					</span>
					<button on:click={toggleEmail} class="flex-shrink-0">
						{#if showEmail}
							<Eye class="w-4 h-4 text-purple-400 hover:text-purple-300 transition-colors" />
						{:else}
							<EyeOff class="w-4 h-4 text-purple-400 hover:text-purple-300 transition-colors" />
						{/if}
					</button>
					<div class="group relative flex items-center">
						<CheckCircle
							class="w-4 h-4 {user.status.emailVerified
								? 'text-green-400'
								: 'text-gray-600'} flex-shrink-0 cursor-help"
						/>
						<!-- Tooltip -->
						<div
							class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700 shadow-xl"
						>
							Email {user.status.emailVerified ? 'Verified' : 'Not Verified'}
							<div
								class="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"
							></div>
						</div>
					</div>

					<!-- 2FA Status Icon -->
					<div class="group relative flex items-center">
						<ShieldCheck
							class="w-4 h-4 {user.status.twoFactorEnabled
								? 'text-purple-400'
								: 'text-gray-600'} flex-shrink-0 cursor-help"
						/>
						<!-- Tooltip -->
						<div
							class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700 shadow-xl"
						>
							2FA: {user.status.twoFactorEnabled ? 'Enabled' : 'Disabled'}
							<div
								class="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"
							></div>
						</div>
					</div>
				</div>

				<!-- Personal Info Row -->
				<div class="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
					<span class="font-medium text-gray-300">{user.firstName} {user.lastName}</span>
					<span class="flex items-center gap-1">
						<Calendar class="w-4 h-4" />
						Joined {formatDate(user.dateCreated)}
					</span>
					<span class="flex items-center gap-1">
						<Globe class="w-4 h-4" />
						{user.ageGroup}
					</span>
				</div>

				<!-- User ID and Flags -->
				<div class="flex items-center justify-between">
					<div class="text-xs text-gray-500 font-mono">
						ID: {user.userId}
					</div>
					<div class="flex items-center gap-2">
						{#if user.status.suspiciousActivity}
							<div
								class="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs"
							>
								<AlertTriangle class="w-3 h-3" />
								Suspicious
							</div>
						{/if}
						{#if user.status.locked}
							<div
								class="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs"
							>
								<AlertTriangle class="w-3 h-3" />
								Locked
							</div>
						{/if}
					</div>
				</div>

				<!-- Staff Environment Switcher -->
				{#if user.status.admin || user.status.moderator}
					<div class="flex items-center gap-3 pt-3 border-t border-gray-700/30">
						<div class="flex items-center gap-2">
							<Shield class="w-4 h-4 text-purple-400" />
							<span class="text-xs font-bold uppercase tracking-wider text-gray-400">JMCS Env:</span
							>
						</div>
						<div class="flex bg-gray-900/40 p-1 rounded-xl border border-gray-700/50">
							<button
								class="px-4 py-1.5 text-[10px] font-black rounded-lg transition-all duration-300 {user
									.status.jmcsEnv === 'prod'
									? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
									: 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/30'}"
								on:click={() => handleSetJmcsEnv('prod')}
								disabled={changingEnv || user.status.jmcsEnv === 'prod'}
							>
								PROD
							</button>
							<button
								class="px-4 py-1.5 text-[10px] font-black rounded-lg transition-all duration-300 {user
									.status.jmcsEnv === 'dev'
									? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
									: 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/30'}"
								on:click={() => handleSetJmcsEnv('dev')}
								disabled={changingEnv || user.status.jmcsEnv === 'dev'}
							>
								DEV
							</button>
						</div>
						{#if changingEnv}
							<Loader2 class="w-4 h-4 text-purple-400 animate-spin" />
						{/if}
					</div>
				{/if}
			</div>

			<!-- Action Buttons - wrap in a row on mobile -->
			<div class="flex flex-row flex-wrap sm:flex-col gap-2 flex-shrink-0">
				<!-- Profiles Toggle -->
				{#if hasProfiles}
					<button
						class="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-lg text-sm hover:bg-blue-500/30 transition-all duration-200 hover:scale-105"
						on:click={toggleProfiles}
					>
						<Gamepad2 class="w-4 h-4" />
						Profiles ({user.profiles.length})
						{#if showProfiles}
							<ChevronUp class="w-4 h-4" />
						{:else}
							<ChevronDown class="w-4 h-4" />
						{/if}
					</button>
				{/if}

				<!-- QA and Patreon Action Buttons Row -->
				<div class="flex gap-2">
					<!-- QA Button -->
					{#if user.status.qa}
						<button
							class="flex items-center gap-1 px-3 py-2 bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-sm hover:bg-cyan-600/30 transition-all duration-200 hover:scale-105"
							on:click={() => handleQaAction('remove')}
						>
							<X class="w-4 h-4" />
							Remove QA
						</button>
					{:else}
						<button
							class="flex items-center gap-1 px-3 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 rounded-lg text-sm hover:bg-cyan-500/30 transition-all duration-200 hover:scale-105"
							on:click={() => handleQaAction('add')}
						>
							<TestTube class="w-4 h-4" />
							Add QA
						</button>
					{/if}

				</div>

				<!-- Ban/Unban and Delete Buttons Row -->
				<div class="flex gap-2">
					<!-- Ban/Unban Button -->
					{#if user.status.banned}
						<button
							class="flex items-center gap-1 px-3 py-2 bg-green-500/20 text-green-400 border border-green-400/30 rounded-lg text-sm hover:bg-green-500/30 transition-all duration-200 hover:scale-105"
							on:click={() => onBanAction(user, 'unban')}
						>
							<UserCheck class="w-4 h-4" />
							Unban
						</button>
					{:else}
						<button
							class="flex items-center gap-1 px-3 py-2 bg-red-500/20 text-red-400 border border-red-400/30 rounded-lg text-sm hover:bg-red-500/30 transition-all duration-200 hover:scale-105"
							on:click={() => onBanAction(user, 'ban')}
						>
							<UserX class="w-4 h-4" />
							Ban
						</button>
					{/if}

					<!-- Delete Button -->
					<button
						class="flex items-center gap-1 px-3 py-2 bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg text-sm hover:bg-red-600/30 transition-all duration-200 hover:scale-105"
						on:click={() => onDeleteAction(user)}
					>
						<Trash2 class="w-4 h-4" />
						Delete
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Ban Details (Expandable) -->
	{#if user.status.banned && showBanDetails}
		<div class="px-6 pb-4">
			<div class="bg-red-500/10 border border-red-400/20 rounded-xl p-4">
				<h5 class="text-sm font-semibold text-red-400 mb-2">Ban Details</h5>
				<div class="space-y-2 text-sm">
					{#if user.status.bannedReason}
						<div>
							<span class="text-gray-400">Reason:</span>
							<span class="text-gray-200 ml-2">{user.status.bannedReason}</span>
						</div>
					{/if}
					{#if user.status.bannedBy}
						<div>
							<span class="text-gray-400">Banned by:</span>
							<span class="text-gray-200 ml-2">{user.status.bannedBy.username}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Gaming Profiles Section (Expandable) -->
	{#if hasProfiles && showProfiles}
		<div class="border-t border-gray-600/30 px-6 py-4">
			<h5 class="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
				<Gamepad2 class="w-4 h-4" />
				Gaming Profiles
			</h5>
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
				{#each user.profiles as profile}
					{@const console = consoles[profile.platformType]}
					<div
						class="bg-gray-700/30 rounded-xl p-4 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200"
					>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3 flex-1 min-w-0">
								<div
									class="w-10 h-10 bg-gradient-to-r {console.color} rounded-lg flex items-center justify-center shadow-lg"
								>
									<Icon icon={console.icon} class="w-5 h-5 text-white" />
								</div>
								<div class="flex-1 min-w-0">
									<h6 class="font-semibold text-white text-sm mb-1">{console.title}</h6>
									<div class="space-y-1 text-xs">
										{#if profile.nameOnPlatform}
											<div class="text-gray-300">
												<span class="text-gray-500">{console.label}:</span>
												<span class="ml-1 font-mono">{profile.nameOnPlatform}</span>
											</div>
										{/if}
										{#if profile.macAddress}
											<div class="text-gray-400">
												<span class="text-gray-500">MAC:</span>
												<span class="ml-1 font-mono">{profile.macAddress}</span>
											</div>
										{/if}
										<div class="text-gray-500">
											<span>ID:</span>
											<span class="ml-1 font-mono">{profile.profileId}</span>
										</div>
									</div>
								</div>
							</div>
							<button
								class="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 border border-red-400/30 rounded-lg text-xs hover:bg-red-500/30 transition-all duration-200 hover:scale-105 ml-2 flex-shrink-0"
								on:click={() => handleUnlinkProfile(profile.profileId)}
							>
								<Unlink class="w-3 h-3" />
								Unlink
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Additional Details Footer -->
	<div class="border-t border-gray-600/20 px-6 py-3 bg-gray-800/20">
		<div class="flex items-center justify-between text-xs text-gray-500">
			<div class="flex items-center gap-4">
				<span>DOB: {formatDate(user.dateOfBirth)}</span>
				<span>Language: {user.preferredLanguage}</span>
				<span>Type: {user.accountType}</span>
			</div>
			<div class="flex items-center gap-3">
				<!-- <span class="flex items-center gap-1">
					<span
						class="w-2 h-2 rounded-full {user.communicationOptIn ? 'bg-green-400' : 'bg-gray-500'}"
					></span>
					Communication: {user.communicationOptIn ? 'Yes' : 'No'}
				</span> -->
				<span class="flex items-center gap-1">
					<span
						class="w-2 h-2 rounded-full {user.hasAcceptedLegalOptins
							? 'bg-green-400'
							: 'bg-red-400'}"
					></span>
					Terms: {user.hasAcceptedLegalOptins ? 'Accepted' : 'Not Accepted'}
				</span>
			</div>
		</div>
	</div>
</div>

<style>
	.highlight-pulse {
		border-color: rgba(168, 85, 247, 0.8) !important;
		box-shadow: 0 0 25px rgba(168, 85, 247, 0.4);
		animation: pulse-border 2s infinite ease-in-out;
	}

	.card-selected {
		border-color: rgba(168, 85, 247, 0.7) !important;
		background-color: rgba(168, 85, 247, 0.08);
		box-shadow: 0 0 0 1px rgba(168, 85, 247, 0.4), 0 0 20px rgba(168, 85, 247, 0.15);
	}

	@keyframes pulse-border {
		0%,
		100% {
			box-shadow: 0 0 25px rgba(168, 85, 247, 0.4);
			border-color: rgba(168, 85, 247, 0.8);
		}
		50% {
			box-shadow: 0 0 45px rgba(168, 85, 247, 0.6);
			border-color: rgba(236, 72, 153, 0.8);
		}
	}
</style>
