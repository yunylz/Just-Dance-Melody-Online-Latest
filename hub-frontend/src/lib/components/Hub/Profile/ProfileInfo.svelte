<script>
	import { login, user } from '$lib/stores/user';
	import { privacy } from '$lib/stores/privacy';
	import { Mail, Cake, Camera, Eye, EyeOff, Crown } from 'lucide-svelte';
	import AvatarModal from './AvatarModal.svelte';
	import API from '$lib/api';
	import CountryFlag from '$lib/components/CountryFlag.svelte';

	export let userData;
	export let refreshUserData;

	let formattedBirthdate = '';
	if (userData.dateOfBirth) {
		const date = new Date(userData.dateOfBirth);
		formattedBirthdate = date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	let showAvatarModal = false;

	function portal(node) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}
</script>

<div class="pi-card bg-gray-800/50">
	<!-- Avatar -->
	<div class="pi-avatar-wrap">
		<div class="pi-avatar-group">
			<img src={$user.avatar} alt={userData.username} class="pi-avatar" />
			<button
				class="pi-avatar-overlay"
				on:click={() => (showAvatarModal = true)}
				aria-label="Change avatar"
			>
				<Camera size={18} />
			</button>
			<span class="pi-online-dot" aria-label="Online" />
		</div>
	</div>

	<!-- Info -->
	<div class="pi-info">
		<div class="pi-name-row">
			<h2 class="pi-username">{userData.username}</h2>			{#if userData.patreon?.isSubscribed}
				<span class="pi-patron-badge" title="Active Patron">
					<Crown size={14} />
				</span>
			{/if}			<CountryFlag countryCode={userData.country} />
			<span class="pi-badge">Online</span>
		</div>

		<div class="pi-meta">
			<!-- Email -->
			<div class="pi-meta-row">
				<Mail size={13} class="pi-meta-icon" />
				<span
					class="pi-meta-value"
					style={$privacy.showEmail ? '' : 'filter: blur(5px); transition: filter 0.3s;'}
				>
					{userData.email}
				</span>
				<button
					class="pi-vis-btn"
					on:click={privacy.toggleEmail}
					type="button"
					aria-label="Toggle email visibility"
				>
					{#if $privacy.showEmail}<Eye size={13} />{:else}<EyeOff size={13} />{/if}
				</button>
			</div>

			<!-- Birthdate -->
			{#if userData.dateOfBirth}
				<div class="pi-meta-row">
					<Cake size={13} class="pi-meta-icon" />
					<span
						class="pi-meta-value"
						style={$privacy.showBirthdate ? '' : 'filter: blur(5px); transition: filter 0.3s;'}
					>
						{formattedBirthdate}
					</span>
					<button
						class="pi-vis-btn"
						on:click={privacy.toggleBirthdate}
						type="button"
						aria-label="Toggle birthdate visibility"
					>
						{#if $privacy.showBirthdate}<Eye size={13} />{:else}<EyeOff size={13} />{/if}
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Avatar modal (portalled) -->
{#if showAvatarModal}
	<div use:portal>
		<AvatarModal
			{userData}
			{refreshUserData}
			on:select={(e) => {
				login({ ...$user, avatar: e.detail.url });
				showAvatarModal = false;
			}}
			on:close={() => (showAvatarModal = false)}
		/>
	</div>
{/if}

<style>
	.pi-card {
		border: 1px solid rgba(139, 92, 246, 0.2);
		border-radius: 18px;
		padding: 1.4rem 1.5rem;
		display: flex;
		align-items: center;
		gap: 1.4rem;
		backdrop-filter: blur(16px);
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	/* Avatar */
	.pi-avatar-wrap {
		flex-shrink: 0;
	}
	.pi-avatar-group {
		position: relative;
		width: 72px;
		height: 72px;
	}
	.pi-avatar {
		width: 72px;
		height: 72px;
		border-radius: 14px;
		object-fit: cover;
		border: 2px solid rgba(168, 85, 247, 0.3);
		display: block;
		transition: filter 0.2s;
	}
	.pi-avatar-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.85);
		opacity: 0;
		transition: opacity 0.2s;
		cursor: pointer;
		border: none;
	}
	.pi-avatar-group:hover .pi-avatar-overlay {
		opacity: 1;
	}
	.pi-online-dot {
		position: absolute;
		bottom: -3px;
		right: -3px;
		width: 14px;
		height: 14px;
		background: #4ade80;
		border-radius: 50%;
		border: 2.5px solid rgba(10, 10, 20, 0.9);
	}

	/* Info */
	.pi-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.pi-name-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.pi-username {
		font-size: 1.3rem;
		font-weight: 800;
		color: #fff;
		margin: 0;
		letter-spacing: -0.02em;
	}
	.pi-patron-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: #000000;
		color: #fff;
		border-radius: 50%;
		width: 26px;
		height: 26px;
		flex-shrink: 0;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
	}

	.pi-badge {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: rgba(74, 222, 128, 0.85);
		background: rgba(74, 222, 128, 0.1);
		border: 1px solid rgba(74, 222, 128, 0.2);
		border-radius: 999px;
		padding: 0.15rem 0.55rem;
	}

	/* Meta rows */
	.pi-meta {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.pi-meta-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}
	:global(.pi-meta-icon) {
		color: rgba(255, 255, 255, 0.3);
		flex-shrink: 0;
	}
	.pi-meta-value {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.5);
		transition: filter 0.3s;
	}
	.pi-vis-btn {
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		color: rgba(255, 255, 255, 0.25);
		display: flex;
		align-items: center;
		transition: color 0.2s;
	}
	.pi-vis-btn:hover {
		color: #c084fc;
	}

	/* Responsive: stack on very small screens */
	@media (max-width: 480px) {
		.pi-card {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
