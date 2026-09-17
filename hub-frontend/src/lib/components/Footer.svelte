<script>
  const currentYear = new Date().getFullYear();
</script>

<footer class="bg-gradient-to-br from-gray-900 via-violet-900/20 to-gray-900 text-white">
  <div class="container mx-auto px-6 md:px-12 max-w-7xl">
    <!-- Top row: links + social -->
    <div class="flex flex-col md:flex-row justify-between items-center md:items-center gap-6 py-8 border-b border-gray-800">
      <div class="flex flex-col md:flex-row items-center gap-x-8 gap-y-4">
        <img src="/assets/logos/jdm_logo.png" alt="JDMO" class="h-8" />
        <div class="flex flex-wrap justify-center gap-x-8 gap-y-3">
          <a href="/tutorial" rel="noopener noreferrer" class="text-sm text-gray-400 hover:text-purple-300 transition-colors">Getting Started</a>
          <a href="/hub" class="text-sm text-gray-400 hover:text-purple-300 transition-colors">Hub</a>
          <a href="/discord" class="text-sm text-gray-400 hover:text-purple-300 transition-colors">Discord</a>
          <a href="/terms" class="text-sm text-gray-400 hover:text-purple-300 transition-colors">Terms</a>
          <a href="/privacy" class="text-sm text-gray-400 hover:text-purple-300 transition-colors">Privacy</a>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <a href="/discord" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-indigo-400 transition-colors" aria-label="Discord">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        </a>
        <a href="mailto:hello@ryuatelier.org" class="text-gray-500 hover:text-purple-400 transition-colors" aria-label="Email">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </a>
      </div>
    </div>

    <!-- Bottom row: disclaimer + copyright -->
    <div class="flex flex-col md:flex-row justify-between items-center gap-3 py-4 text-xs text-gray-500">
      <p class="text-center md:text-left leading-relaxed max-w-3xl">
        <span class="text-purple-400/70 font-semibold">Disclaimer:</span> JDMO is an independent fan project. Not affiliated with Ubisoft, Nintendo, Microsoft, or Sony.
      </p>
      <p class="text-center md:text-right whitespace-nowrap">
        © {currentYear} JDMO Team. Hub & Harbour made by <a href="https://ryuatelier.org" target="_blank" rel="noopener noreferrer" class="text-purple-400/70 hover:text-purple-300 transition-colors">RyuAtelier.</a>
      </p>
    </div>
  </div>
</footer>