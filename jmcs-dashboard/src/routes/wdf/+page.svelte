<script lang="ts">
	import { Settings, CalendarClock, Users, Skull } from 'lucide-svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	const pages = [
		{ name: 'Config', description: 'Global WDF config (banned maps, durations, themes, playlists)', href: '/wdf/config', icon: Settings },
		{ name: 'Schedules', description: 'WDF schedule entries (recurring / probability)', href: '/wdf/schedules', icon: CalendarClock },
		{ name: 'Rooms', description: 'WDF rooms and their SKUs', href: '/wdf/rooms', icon: Users },
		{ name: 'Bosses', description: 'WDF bosses and seasonal bosses', href: '/wdf/bosses', icon: Skull }
	];
</script>

<PageHeader title="World Dance Floor" description="Manage WDF configuration. All data is stored in MongoDB." />

<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
	{#each pages as p}
		<a href={p.href} class="block bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-lg p-5 transition-colors">
			<div class="flex items-center gap-3 mb-2">
				<div class="p-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
					<p.icon class="w-5 h-5" />
				</div>
				<h3 class="text-lg font-semibold text-white">{p.name}</h3>
			</div>
			<p class="text-sm text-slate-400">{p.description}</p>
		</a>
	{/each}
</div>
