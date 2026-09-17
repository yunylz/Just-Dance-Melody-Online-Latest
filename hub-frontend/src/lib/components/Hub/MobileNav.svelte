<script>
    import { page } from '$app/stores';
    import { user } from '$lib/stores/user';
    import { fade } from 'svelte/transition';
    import {
        Home,
        Music,
        User,
        Flame,
        Menu,
        Megaphone,
        Earth,
        Spotlight,
        Users,
        ListMusic,
        Activity,
        Newspaper,
        Zap
    } from 'lucide-svelte';

    let mobileMenuOpen = false;

    const mobileNavItems = [
        { href: '/hub', icon: Home, label: 'Home' },
        { href: '/hub/songs', icon: Music, label: 'Songs' },
        { href: '/hub/leaderboard', icon: Flame, label: 'Leaderboard' },
        { href: '/hub/profile', icon: User, label: 'Profile' }
    ];

    $: mobileMenuExtra = [
        { href: '/hub/updates', icon: Megaphone, label: 'Updates' },
        { href: '/hub/wdf', icon: Earth, label: 'World Dance Floor' },
        { href: '/hub/spotlight', icon: Spotlight, label: 'Spotlight' },
        { href: '/hub/friends', icon: Users, label: 'Friends' },
        { href: '/hub/playlists', icon: ListMusic, label: 'Playlists' },
        // ...($user?.isAdmin ? [
        //     { href: '/hub/admin/users', icon: Users, label: 'Users' },
        //     { href: '/hub/admin/news', icon: Newspaper, label: 'Editorial News' },
        //     { href: '/hub/admin/activities', icon: Activity, label: 'Admin Activities' },
        //     { href: '/hub/admin/jmcs-activities', icon: Zap, label: 'JMCS Activities' }
        // ] : [])
    ];

    function toggleMenu() {
        mobileMenuOpen = !mobileMenuOpen;
    }

    function closeMenu() {
        mobileMenuOpen = false;
    }
</script>

<nav
    class="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gray-900 border-t border-gray-700/50"
    style="padding-bottom: env(safe-area-inset-bottom, 0px);"
>
    <div class="flex items-center justify-around py-2 px-2">
        {#each mobileNavItems as item}
            <a
                href={item.href}
                on:click={closeMenu}
                class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200
                    {$page.url.pathname === item.href
                        ? 'text-pink-400'
                        : 'text-gray-500 hover:text-gray-300'}"
            >
                <svelte:component this={item.icon} class="w-5 h-5" />
                <span class="text-[10px] font-semibold">{item.label}</span>
            </a>
        {/each}

        <!-- More button -->
        <div class="relative">
            <button
                on:click={toggleMenu}
                class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200
                    {mobileMenuOpen ? 'text-pink-400' : 'text-gray-500 hover:text-gray-300'}"
            >
                <Menu class="w-5 h-5" />
                <span class="text-[10px] font-semibold">More</span>
            </button>

            <!-- Popup menu -->
            {#if mobileMenuOpen}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div
                    class="absolute bottom-full right-0 mb-3 w-56 bg-gray-900/95 backdrop-blur-xl
                           border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden"
                    in:fade={{ duration: 150 }}
                    out:fade={{ duration: 100 }}
                    on:click={closeMenu}
                    role="menu"
                    tabindex="-1"
                >
                    <div class="py-2 space-y-1 px-2">
                        {#each mobileMenuExtra as item}
                            <a
                                href={item.href}
                                on:click={closeMenu}
                                class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm
                                    {$page.url.pathname === item.href
                                        ? 'bg-pink-500/15 text-pink-400 font-semibold'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'}"
                            >
                                <svelte:component this={item.icon} class="w-4 h-4 flex-shrink-0" />
                                {item.label}
                            </a>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</nav>