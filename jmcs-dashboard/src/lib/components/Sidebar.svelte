<script lang="ts">
	import { page } from "$app/state";
	import {
		Command,
		Music,
		UserCircle,
		Palette,
		Frame,
		Globe,
		Layout,
		List,
		Zap,
		Settings,
		Activity,
		LogOut,
		AlertTriangle,
		Tag,
		Database,
		PlayCircle,
		ListMusic,
		Film,
		CalendarClock,
		Users,
		Skull,
		Trophy,
	} from "lucide-svelte";
	import { user } from "$lib/jmcs";

	let currentPath = $derived(page.url.pathname);

	const navigationSections = [
		{
			name: "Songs",
			items: [
				{ name: "Management", href: "/songs", icon: Music },
				{ name: "Audit", href: "/songs/audit", icon: AlertTriangle },
				{ name: "Asset Explore", href: "/songs/assets", icon: List },
				{ name: "Tags", href: "/songs/tags", icon: Tag },
			],
		},
		{
			name: "Databases",
			items: [
				{ name: "Aliases", href: "/aliases", icon: Tag },
				{ name: "Localizations", href: "/locs", icon: Globe },
				{ name: "Playlists", href: "/playlists", icon: ListMusic },
			],
		},
		{
			name: "Items",
			items: [
				{ name: "Avatars", href: "/avatars", icon: UserCircle },
				{ name: "Skins", href: "/skins", icon: Palette },
				{ name: "Borders", href: "/borders", icon: Frame },
			],
		},
		{
			name: "Carousel",
			items: [
				{ name: "Pages", href: "/carousel-rules", icon: Layout },
				{
					name: "Item Lists",
					href: "/carousel-item-lists",
					icon: List,
				},
				{ name: "Home Tiles", href: "/home-tiles", icon: Layout },
				{
					name: "Action Lists",
					href: "/carousel-action-lists",
					icon: Zap,
				},
			],
		},
		{
			name: "UGC",
			items: [
				{ name: "Management", href: "/ugc", icon: Film },
			],
		},
		{
			name: "WDF",
			items: [
				{ name: "Config", href: "/wdf/config", icon: Settings },
				{ name: "Schedules", href: "/wdf/schedules", icon: CalendarClock },
				{ name: "Rooms", href: "/wdf/rooms", icon: Users },
				{ name: "Bosses", href: "/wdf/bosses", icon: Skull },
			],
		},
		{
			name: "Quest",
			items: [
				{ name: "Quests", href: "/quests", icon: Trophy },
			],
		},
		{
			name: "System",
			items: [
				{ name: "Constants", href: "/constants", icon: Settings },
				{ name: "Server Status", href: "/status", icon: Activity },
				{ name: "Database Utils", href: "/database", icon: Database },
			],
		},
	];

	function isActive(href: string) {
		if (href === "/songs") {
			return currentPath === "/songs";
		}
		return currentPath.startsWith(href);
	}
</script>

<aside
	class="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900"
>
	<div
		class="flex h-16 items-center border-b border-slate-800 px-6 text-lg font-bold text-white"
	>
		<Command class="mr-3 h-6 w-6 text-indigo-500" />
		JMCS Dashboard
	</div>

	<nav
		class="flex-1 flex flex-col gap-1 overflow-y-auto px-3 py-4 custom-scrollbar"
	>
		{#each navigationSections as section}
			<div
				class="mb-2 mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
			>
				{section.name}
			</div>
			{#each section.items as item}
				<a
					href={item.href}
					class="group flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-all {isActive(
						item.href,
					)
						? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
						: 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent'}"
				>
					<svelte:component
						this={item.icon}
						class="mr-3 h-4 w-4 transition-colors {isActive(
							item.href,
						)
							? 'text-indigo-400'
							: 'text-slate-500 group-hover:text-slate-300'}"
					/>
					{item.name}
				</a>
			{/each}
		{/each}
	</nav>

	<div
		class="flex items-center justify-between border-t border-slate-800 p-4 bg-slate-950/20 backdrop-blur-sm"
	>
		<div class="flex items-center overflow-hidden">
			{#if $user?.avatar}
				<img
					src={$user.avatar}
					alt={$user.name}
					class="h-9 w-9 rounded-full border border-slate-700 shadow-lg"
				/>
			{:else}
				<div
					class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white border border-slate-700 shadow-lg"
				>
					{$user?.name?.charAt(0) || "A"}
				</div>
			{/if}
			<div class="ml-3 flex flex-col overflow-hidden text-sm font-medium">
				<span class="truncate text-slate-200"
					>{$user?.name || "Admin"}</span
				>
				<span class="truncate text-[10px] text-slate-500 font-mono"
					>{$user?.email || "admin@c0llydoll.dev"}</span
				>
			</div>
		</div>
		<a
			href="/auth/logout"
			class="p-2 text-slate-400 transition-all hover:text-white hover:bg-slate-800 rounded-lg"
			title="Sign Out"
		>
			<LogOut class="h-4 w-4" />
		</a>
	</div>
</aside>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #1e293b;
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: #334155;
	}
</style>
