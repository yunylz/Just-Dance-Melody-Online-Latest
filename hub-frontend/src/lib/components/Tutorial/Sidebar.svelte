<script>
	import Icon from '@iconify/svelte';
	import { supportedPlatforms, welcomePages, tutorialSections } from './tutorials.js';

	/** @type {string} */
	export let activeTab;

	/** @type {string} */
	export let activeSection;

	/** @type {(tab: string, section: string) => void} */
	export let onNavigate;

	let mobileOpen = false;

	$: isWelcomePage = welcomePages.some(p => p.id === activeSection);

	function handleNav(tab, section) {
		mobileOpen = false;
		onNavigate(tab, section);
	}
</script>

<!-- Mobile hamburger -->
<button
	class="mobile-hamburger bg-brand-gradient-bkg"
	aria-label="Toggle sidebar"
	on:click={() => mobileOpen = !mobileOpen}
>
	<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
		{#if mobileOpen}
			<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
		{:else}
			<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
		{/if}
	</svg>
</button>

<!-- Backdrop -->
{#if mobileOpen}
	<div class="mobile-backdrop" on:click={() => mobileOpen = false}></div>
{/if}

<!-- Sidebar -->
<aside class="sidebar" class:sidebar-open={mobileOpen}>
	<!-- Welcome -->
	<div class="sidebar-group">
		<p class="sidebar-group-label">Welcome</p>
		{#each welcomePages as page}
			<button
				class="sidebar-nav-item"
				class:sidebar-nav-active={activeSection === page.id}
				on:click={() => handleNav(activeTab, page.id)}
			>
				<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
					{#each page.icon.split(' M').filter(Boolean) as d, i}
						<path stroke-linecap="round" stroke-linejoin="round" d={i === 0 ? page.icon.split(' M')[0] : 'M' + d} />
					{/each}
				</svg>
				{page.label}
			</button>
		{/each}
	</div>

	<!-- Platform picker -->
	<div class="sidebar-group">
		<p class="sidebar-group-label">Platform</p>
		{#each supportedPlatforms as platform}
			<button
				class="sidebar-platform"
				class:sidebar-platform-active={activeTab === platform.id && !isWelcomePage}
				on:click={() => handleNav(platform.id, 'prerequisites')}
			>
				<span class="sidebar-platform-icon">
					{#if platform.id === 'nx2'}
						<img src="/assets/icons/nx2.png" alt="Switch 2" class="h-[18px] w-auto object-contain" />
					{:else if platform.id === 'nx'}
						<img src="/assets/icons/nx.png" alt="Switch" class="h-[18px] w-auto object-contain" />
					{:else}
						<Icon icon={platform.icon} width="18" height="18" />
					{/if}
				</span>
				{platform.title}
			</button>
		{/each}
	</div>

	<!-- On this page — only visible when a platform tutorial is active -->
	{#if !isWelcomePage}
		<div class="sidebar-group">
			<p class="sidebar-group-label">On this page</p>
			{#each tutorialSections as sec}
				<button
					class="sidebar-nav-item"
					class:sidebar-nav-active={activeSection === sec.id}
					on:click={() => handleNav(activeTab, sec.id)}
				>
					<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
						{#each sec.icon.split(' M').filter(Boolean) as d, i}
							<path stroke-linecap="round" stroke-linejoin="round" d={i === 0 ? sec.icon.split(' M')[0] : 'M' + d} />
						{/each}
					</svg>
					{sec.label}
				</button>
			{/each}
		</div>
	{/if}
</aside>

<style>
	.mobile-hamburger {
		display: none;
		position: fixed;
		bottom: 1.25rem;
		right: 1.25rem;
		z-index: 60;
		width: 3rem;
		height: 3rem;
		align-items: center;
		justify-content: center;
		color: #fff;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 4px 20px rgba(139,92,246,0.4);
		transition: all 0.2s ease;
	}
	.mobile-hamburger:hover {
		transform: scale(1.05);
		box-shadow: 0 6px 24px rgba(139,92,246,0.5);
	}

	.mobile-backdrop {
		display: none;
		position: fixed;
		inset: 0;
		z-index: 45;
		background: rgba(0,0,0,0.6);
		backdrop-filter: blur(2px);
	}

	.sidebar {
		width: 260px;
		flex-shrink: 0;
		border-right: 1px solid rgba(139,92,246,0.12);
		padding: 2rem 0;
		position: sticky;
		top: 0;
		height: 100%;
		overflow-y: auto;
		background: rgba(17,24,39,0.6);
		backdrop-filter: blur(4px);
		transition: transform 0.25s ease;
	}

	@media (max-width: 768px) {
		.mobile-hamburger { display: flex; }
		.mobile-backdrop { display: block; }

		.sidebar {
			position: fixed;
			top: 0;
			left: 0;
			z-index: 50;
			height: 100dvh;
			border-right: 1px solid rgba(139,92,246,0.15);
			transform: translateX(-100%);
			background: rgba(11,15,25,0.95);
			backdrop-filter: blur(8px);
		}
		.sidebar-open {
			transform: translateX(0);
		}
	}

	.sidebar-group {
		padding: 0 1.25rem 1.5rem;
	}
	.sidebar-group + .sidebar-group {
		border-top: 1px solid rgba(139,92,246,0.08);
		padding-top: 1.25rem;
	}
	.sidebar-group-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #6b7280;
		margin: 0 0 0.6rem;
		padding: 0 0.25rem;
	}
	.sidebar-platform {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.6rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		color: #9ca3af;
		background: none;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.sidebar-platform:hover { color: #e5e7eb; background: rgba(139,92,246,0.1); }
	.sidebar-platform-active { color: #fa7af1 !important; font-weight: 600; background: rgba(139,92,246,0.12) !important; }
	.sidebar-platform-active .sidebar-platform-icon { color: #fff; }
	.sidebar-platform-icon {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		transition: all 0.2s ease;
	}
	.sidebar-nav-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.6rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		color: #9ca3af;
		background: none;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.sidebar-nav-item:hover { color: #e5e7eb; background: rgba(139,92,246,0.1); }
	.sidebar-nav-active {
		color: #fa7af1 !important;
		background: rgba(139,92,246,0.15) !important;
		font-weight: 600;
	}
	.sidebar-nav-active svg { color: #fff; }
</style>
