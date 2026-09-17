<script>
	import Utils from '$lib/utils';
	import { onMount } from 'svelte';
	
	import API from '$lib/api';

	import HeroSection from '$lib/components/Home/HeroSection.svelte';
	import AboutSection from '$lib/components/Home/AboutSection.svelte';
	import HubSection from '$lib/components/Home/HubSection.svelte';
	import CommunitySection from '$lib/components/Home/CommunitySection.svelte';

	let stats = null;
	let carouselSongs = [];
	let loading = true;

	function shuffleArray(arr) {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	onMount(async () => {
		try {
			const [statsData, songsData] = await Promise.all([
				API.getStats(),
				API.getSongs()
			]);
			stats = statsData;

			if (songsData?.length) {
				const shuffled = shuffleArray(songsData);
				const filtered = shuffled.filter(s => !s.isMashup && !s.isFanmade && !s.isKids && !s.isPatreon);

				// Preload covers and filter out broken ones
				const valid = await Promise.all(
					filtered.slice(0, 120).map(song =>
						new Promise(resolve => {
							if (!song.assets?.cover) return resolve(null);
							const img = new Image();
							img.onload = () => resolve(song);
							img.onerror = () => resolve(null);
							img.src = song.assets.cover;
						})
					)
				);

				carouselSongs = valid.filter(Boolean).slice(0, 100);
			}
		} catch (e) {
			console.error('Failed to load data:', e);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{Utils.getTitle('Home')}</title>
</svelte:head>

<HeroSection />
<AboutSection {stats} {carouselSongs} {loading} />
<HubSection />
<CommunitySection />
