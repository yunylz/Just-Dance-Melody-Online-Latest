<script lang="ts">
	import CrudPage from '$lib/components/CrudPage.svelte';
	import { UserCircle } from 'lucide-svelte';
</script>
<CrudPage
	section="Avatar"
	title="Avatar Management"
	description="Manage player avatars, unlock requirements, and store pricing."
	icon={UserCircle}
	endpoint="manage-avatars"
	idField="Id"
	listFields={['url', 'Id', 'itemType', 'unlockType', 'status', 'mojoPrice', 'jdVersion']}
	editFields={['Id', 'itemType', 'unlockType', 'status', 'url', 'mojoPrice', 'jdVersion']}
/>
