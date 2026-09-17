<script lang="ts">
	import CrudPage from '$lib/components/CrudPage.svelte';
	import { Palette } from 'lucide-svelte';
</script>
<CrudPage
	section="Skin"
	title="Skin Management"
	description="Manage character skins, textures, and unlock requirements."
	icon={Palette}
	endpoint="manage-skins"
	idField="Id"
	listFields={['url', 'Id', 'itemType', 'unlockType', 'status', 'mojoPrice', 'jdVersion']}
	editFields={['Id', 'itemType', 'unlockType', 'status', 'url', 'mojoPrice', 'jdVersion']}
/>
