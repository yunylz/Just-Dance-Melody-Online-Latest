<script lang="ts">
	import CrudPage from '$lib/components/CrudPage.svelte';
	import { Frame } from 'lucide-svelte';
</script>
<CrudPage
	section="Border"
	title="Border Management"
	description="Manage player profile borders and visual frames."
	icon={Frame}
	endpoint="manage-borders"
	idField="Id"
	listFields={['Id', 'Preview', 'originalLockStatus', 'visibility']}
	editFields={['Id', 'backgroundUrl', 'foregroundUrl', 'originalLockStatus', 'visibility']}
/>
