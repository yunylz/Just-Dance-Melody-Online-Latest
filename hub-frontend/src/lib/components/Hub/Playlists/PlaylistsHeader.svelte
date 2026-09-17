<script>
    import PageHeader from '$lib/components/Hub/Shared/PageHeader.svelte';
    import colors from "$lib/colors";
    import { ListMusic } from "lucide-svelte";

    export let playlistCount = 0;
    export let loadingPlaylists = false;
</script>

<PageHeader
	icon={ListMusic}
	gradient={colors.playlists}
	title="Playlists"
	description="Have a look at the exclusive playlists available in Just Dance Melody Online!"
	stats={!loadingPlaylists ? [{ label: 'Playlists', value: playlistCount, color: 'text-green-400' }] : []}
/>