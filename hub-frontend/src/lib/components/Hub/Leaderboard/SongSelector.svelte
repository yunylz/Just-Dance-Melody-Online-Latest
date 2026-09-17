<script>
	import SharedSongBrowser from '$lib/components/Hub/Shared/SharedSongBrowser.svelte';

	export let allSongs = [];
	export let versions = [];
	export let selectedVersion = null;
	export let selectedSong = null;
	export let loadingSongs = false;
</script>

<SharedSongBrowser
	bind:allSongs
	bind:selectedVersion
	bind:selectedSong
	{versions}
	{loadingSongs}
	selectable={true}
/>