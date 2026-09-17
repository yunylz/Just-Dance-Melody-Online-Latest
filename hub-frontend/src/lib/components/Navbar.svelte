<script>
  import { page } from '$app/stores';
  import { derived } from 'svelte/store';
  import { tick, onMount, onDestroy } from 'svelte';
  import { user, logout } from '$lib/stores/user';
	import Icon from '@iconify/svelte';

  /** @type {boolean} */
  export let authLoading = false;

  const currentPath = derived(page, ($page) => $page.url.pathname);

  let mobileMenuOpen = false;
  let navHidden = false;
  let lastScrollY = 0;
  const scrollThreshold = 20;

  let scrollHandler;

  onMount(() => {
    lastScrollY = window.scrollY;

    scrollHandler = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      if (Math.abs(delta) > scrollThreshold) {
        if (delta > 0 && currentScrollY > 80) {
          navHidden = true;
        } else if (delta < 0) {
          navHidden = false;
        }
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
  });

  onDestroy(() => {
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler);
    }
  });

  const logoutUser = async () => {
    logout();
    await tick();
    location.reload();
  };

  const toggleMobileMenu = () => {
    mobileMenuOpen = !mobileMenuOpen;
  };

  const navItems = [
    {
      label: 'Home',
      href: '/',
      icon: 'material-symbols:home-outline'
    },
    {
      label: 'Getting Started',
      href: '/tutorial',
      icon: 'material-symbols:book-outline'
    },
    {
      label: 'Hub',
      href: '/hub',
      icon: 'material-symbols:dashboard-outline',
      external: true
    },
    {
      label: 'Discord',
      href: '/discord',
      icon: 'ic:baseline-discord'
    }
  ];
</script>

<div class="fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out" class:-translate-y-full={navHidden}>
  <div class="mx-auto max-w-7xl px-4 pt-3">
    <nav class="relative bg-black/10 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/10 rounded-2xl">
      <div class="relative z-10 px-4 sm:px-6">
        <div class="flex items-center h-16">

          <!-- Logo -->
          <div class="flex items-center w-[210px] flex-shrink-0">
            <a href="/" class="flex items-center gap-3 group">
              <img
                src="/assets/logos/jdm_logo.png"
                alt="JDMO"
                class="h-10 w-auto object-contain"
              />
            </a>
          </div>

          <!-- Desktop Navigation -->
          <div class="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {#each navItems as item}
              <a
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                class="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200
                  {item.external
                    ? 'text-white/70 hover:text-white hover:bg-white/10'
                    : $currentPath === item.href
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'}"
              >
                <span class="flex items-center gap-2">
                  <Icon icon={item.icon} width="16" height="16" />
                  {item.label}
                </span>
              </a>
            {/each}
          </div>

          <!-- Right Side Actions -->
          <div class="hidden lg:flex items-center justify-end gap-2 w-[210px] flex-shrink-0">
            {#if authLoading && !$user}
              <div class="flex items-center justify-center">
                <svg class="animate-spin h-5 w-5 text-white/60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            {:else if $user}
              <!-- Profile Dropdown -->
              <div class="relative group">
                <button class="flex items-center gap-2 px-3 py-1.5 text-sm text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all duration-200">
                  <img src={$user.avatar} alt="Profile" class="w-7 h-7 rounded-full ring-2 ring-white/20"/>
                  <span class="font-medium">{$user.username || 'User'}</span>
                  <svg class="w-3.5 h-3.5 transform group-hover:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>

                <div class="absolute top-full right-0 mt-2 w-48 bg-black/70 rounded-2xl shadow-xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform group-hover:translate-y-0 -translate-y-2">
                  <div class="p-2 space-y-0.5">
                    <a href="/hub/profile" class="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all duration-200">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                      Profile
                    </a>
                    <div class="border-t border-white/10 my-1.5"></div>
                    <button on:click={logoutUser} class="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 rounded-xl hover:bg-white/10 transition-all duration-200">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            {:else}
              <a
                href="/login"
                class="px-4 py-2 text-sm font-medium text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all duration-200"
              >
                Login
              </a>
              <a
                href="/login?r=true"
                class="px-5 py-2 text-sm font-medium bg-brand-gradient hover:opacity-90 text-white rounded-xl shadow-lg"
              >
                Register
              </a>
            {/if}
          </div>

          <!-- Mobile Menu Button -->
          <button
            aria-label="Toggle menu"
            class="lg:hidden ml-auto p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-200"
            on:click={toggleMobileMenu}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile Menu -->
    {#if mobileMenuOpen}
      <div class="lg:hidden mt-2 bg-black/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 animate-slide-down">
        {#if authLoading && !$user}
          <div class="flex items-center justify-center py-10">
            <svg class="animate-spin h-6 w-6 text-white/60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        {:else}
          <div class="p-3 space-y-1">
          {#if $user}
            <div class="flex items-center gap-3 px-3 py-3 border-b border-white/10 mb-1">
              <img src={$user.avatar} alt="Profile" class="w-9 h-9 rounded-full ring-2 ring-white/20"/>
              <div>
                <p class="text-sm font-medium text-white">{$user.username || 'User'}</p>
              </div>
            </div>
          {/if}
          {#each navItems as item}
            <a
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              class="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200
                {item.external
                  ? 'text-white/70 hover:text-white hover:bg-white/10'
                  : $currentPath === item.href
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'}"
              on:click={toggleMobileMenu}
            >
              <Icon icon={item.icon} width="16" height="16" />
              {item.label}
            </a>
          {/each}

          {#if $user}
            <div class="border-t border-white/10 pt-2 mt-2">
              <a href="/hub/profile" class="flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all duration-200" on:click={toggleMobileMenu}>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                Profile
              </a>
              <button on:click={() => { logoutUser(); toggleMobileMenu(); }} class="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 rounded-xl hover:bg-white/10 transition-all duration-200">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                Logout
              </button>
            </div>
          {:else}
            <div class="border-t border-white/10 pt-2 mt-2 space-y-1">
              <a href="/login" class="flex items-center justify-center px-3 py-2.5 text-sm text-white/70 hover:text-white rounded-xl border border-white/20 hover:border-white/40 transition-all duration-200" on:click={toggleMobileMenu}>
                Login
              </a>
              <a href="/login?r=true" class="flex items-center justify-center px-3 py-2.5 text-sm bg-brand-gradient hover:opacity-90 text-white rounded-xl transition-all duration-200" on:click={toggleMobileMenu}>
                Register
              </a>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
  </div>
</div>

<div class="h-20"></div>