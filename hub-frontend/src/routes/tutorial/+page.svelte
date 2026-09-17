<script>
	import Utils from '$lib/utils';
	import { fade } from 'svelte/transition';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Sidebar from '$lib/components/Tutorial/Sidebar.svelte';
	import Introduction from '$lib/components/Tutorial/Introduction.svelte';
	import WhatIsHub from '$lib/components/Tutorial/WhatIsHub.svelte';
	import Prerequisites from '$lib/components/Tutorial/Prerequisites.svelte';
	import Setup from '$lib/components/Tutorial/Setup.svelte';
	import Compatibility from '$lib/components/Tutorial/Compatibility.svelte';
	import { allPages, supportedPlatforms, getPlatform } from '$lib/components/Tutorial/tutorials.js';

	/** @type {string} */
	let activeTab = 'pc';
	let activeSection = 'introduction';

	function navigateTo(tab, section) {
		activeTab = tab;
		activeSection = section;
		const params = new URLSearchParams();
		if (tab !== 'pc') params.set('platform', tab);
		if (section !== 'introduction') params.set('section', section);
		const qs = params.toString();
		goto(qs ? `/tutorial?${qs}` : '/tutorial', { replaceState: true, keepFocus: true, noScroll: true });
	}

	onMount(() => {
		const p = $page.url.searchParams.get('platform');
		const s = $page.url.searchParams.get('section');
		const validPlatforms = supportedPlatforms.map(x => x.id);
		const validSections = allPages.map(x => x.id);
		if (p && validPlatforms.includes(p)) activeTab = p;
		if (s && validSections.includes(s)) activeSection = s;
	});
</script>

<svelte:head>
	<title>{Utils.getTitle('Tutorial')}</title>
	<style>
		body { background: #0f172a; }
	</style>
</svelte:head>

<div class="docs-layout">
	<Sidebar {activeTab} {activeSection} onNavigate={navigateTo} />

	<main class="docs-main" in:fade={{ duration: 500 }}>
		<div class="breadcrumb">
			<span class="bc-home">Docs</span>
			<span class="bc-sep">/</span>
			<span class="bc-section">{allPages.find(s => s.id === activeSection)?.label}</span>
			{#if activeSection !== 'introduction' && activeSection !== 'what-is-hub' && activeSection !== 'compatibility'}
				<span class="bc-sep">—</span>
				<span class="bc-platform">{getPlatform(activeTab).title}</span>
			{/if}
		</div>

		<div class="content-wrap">
		{#key `${activeTab}-${activeSection}`}
			<div in:fade={{ duration: 200 }}>
			{#if activeSection === 'introduction'}
				<Introduction onNavigate={navigateTo} />
			{:else if activeSection === 'what-is-hub'}
				<WhatIsHub onNavigate={navigateTo} />
			{:else if activeSection === 'compatibility'}
				<Compatibility onNavigate={navigateTo} />
			{:else if activeSection === 'prerequisites'}
				<Prerequisites {activeTab} onNavigate={navigateTo} />
			{:else if activeSection === 'setup'}
				<Setup {activeTab} onNavigate={navigateTo} />
			{/if}
			</div>
		{/key}
		</div>
	</main>
</div>

<style>
	.docs-layout {
		display: flex;
		height: calc(100dvh - 5rem);
		color: #e2e8f0;
	}
	.docs-main {
		flex: 1;
		min-width: 0;
		padding: 2rem 3rem;
		overflow-y: auto;
	}
	.content-wrap {
		max-width: 56rem;
	}
	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: #6b7280;
		margin-bottom: 2rem;
	}
	.bc-sep { color: #374151; }
	.bc-platform { color: #9ca3af; }
	.bc-section { color: #fa7af1; font-weight: 600; }
</style>