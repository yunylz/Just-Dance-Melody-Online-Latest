<script>
	import { X, Loader2, Download, Monitor, Apple, RefreshCw, Info, ChevronDown } from 'lucide-svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { downloadModalOpen, closeDownloadModal } from '$lib/stores/downloadModal.js';

	// CDN that serves the Tauri updater manifest (same as the workflow uploads to)
	const CDN_BASE = 'https://jdmo-builds-cdn.c0llydoll.dev';
	const MANIFEST_URL = `${CDN_BASE}/hub/latest.json`;

	let manifest = null;
	let loading = false;
	let error = null;
	// Tracks the previous open state so we load only on opening, not on mount
	let wasOpen = false;

	async function loadManifest() {
		loading = true;
		error = null;
		try {
			const res = await fetch(MANIFEST_URL);
			if (!res.ok) throw new Error(`Request failed (${res.status})`);
			manifest = await res.json();
		} catch (e) {
			console.error('Failed to load desktop manifest:', e);
			error = 'Could not load the latest release information. Please try again.';
		} finally {
			loading = false;
		}
	}

	// Load the manifest the first time the modal opens (cached for later opens).
	// Detects the closed -> open edge instead of firing at mount.
	$: {
		if ($downloadModalOpen && !wasOpen && manifest === null) {
			loadManifest();
		}
		wasOpen = $downloadModalOpen;
	}

	function onClose() {
		closeDownloadModal();
	}

	// Which OS row's setup instructions are currently expanded
	let activeOs = null;
	function toggleOs(os) {
		activeOs = activeOs === os ? null : os;
	}

	// Build a friendly list of downloadable platforms from the manifest
	$: platforms = manifest?.platforms
		? Object.entries(manifest.platforms)
				.map(([key, p]) => {
					// key like "darwin-aarch64" or "windows-x86_64"
					const isMac = key.startsWith('darwin');
					const isWin = key.startsWith('windows');
					const isLinux = key.startsWith('linux');
					return {
						key,
						os: isMac ? 'mac' : isWin ? 'windows' : isLinux ? 'linux' : 'other',
						arch: key.includes('aarch64')
							? 'Apple Silicon'
							: key.includes('x86_64')
								? 'x64'
								: key.split('-').pop(),
						url: p.url,
						signature: p.signature
					};
				})
				// Windows first, then macOS, then everything else
				.sort((a, b) => {
					const order = { windows: 0, mac: 1, linux: 2, other: 3 };
					return (order[a.os] ?? 3) - (order[b.os] ?? 3);
				})
		: [];
</script>

{#if $downloadModalOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="modal-backdrop"
		on:click|self={onClose}
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 150 }}
	>
		<div
			class="modal-content"
			in:fly={{ y: 20, duration: 300, delay: 50 }}
			out:fly={{ y: 10, duration: 200 }}
		>
			<button class="modal-close" on:click={onClose} aria-label="Close">
				<X size={20} />
			</button>

			<div class="modal-header">
				<div class="icon-box">
					<Monitor class="w-8 h-8 text-purple-400" />
				</div>
				<h2 class="modal-title">Download Hub for Desktop</h2>
				<p class="modal-desc">
					{#if manifest}
						v{manifest.version} — pick your platform
					{:else}
						Latest release
					{/if}
				</p>
			</div>

			<div class="modal-body">
				{#if loading}
					<div class="flex flex-col items-center justify-center py-10 text-gray-400">
						<Loader2 class="w-8 h-8 text-purple-400 animate-spin mb-3" />
						<p class="text-sm">Checking for the latest release…</p>
					</div>
				{:else if error}
					<div class="text-center py-8">
						<p class="text-red-400 text-sm mb-4">{error}</p>
						<button class="retry-btn" on:click={loadManifest}>
							<RefreshCw class="w-4 h-4" />
							Try Again
						</button>
					</div>
				{:else if platforms.length === 0}
					<div class="text-center py-8 text-gray-400 text-sm">
						No downloads available right now.
					</div>
				{:else}
					<div class="platform-list">
						{#each platforms as platform (platform.key)}
							<div class="platform-item">
								<div class="platform-row">
									<div class="platform-icon">
										{#if platform.os === 'mac'}
											<Apple class="w-6 h-6" />
										{:else if platform.os === 'windows'}
											<!-- Custom Windows logo (lucide has no Windows icon) -->
											<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
												<path d="M3 5.5L10.5 4.5V11.5H3V5.5ZM10.5 4.5L21 3V11.5H10.5V4.5ZM3 13H10.5V20L3 19V13ZM10.5 20H21V13H10.5V20Z" />
											</svg>
										{:else}
											<Monitor class="w-6 h-6" />
										{/if}
									</div>
									<div class="platform-info">
										<span class="platform-name">
											{#if platform.os === 'mac'}macOS
											{:else if platform.os === 'windows'}Windows
											{:else if platform.os === 'linux'}Linux
											{:else}Other{/if}
										</span>
										<span class="platform-arch">{platform.arch}</span>
									</div>
									<a
										href={platform.url}
										target="_blank"
										rel="noopener noreferrer"
										class="download-btn"
										aria-label={`Download for ${platform.os}`}
									>
										<Download class="w-5 h-5" />
									</a>
								</div>

								{#if platform.os === 'mac'}
									<button
										class="setup-link {activeOs === 'mac' ? 'active' : ''}"
										on:click={() => toggleOs('mac')}
									>
										<Info class="w-3.5 h-3.5" />
										Setup instructions
										<ChevronDown class="w-3.5 h-3.5 chevron" />
									</button>

									{#if activeOs === 'mac'}
										<div class="setup-box" transition:slide={{ duration: 200 }}>
											<p class="setup-desc">
												macOS may block apps downloaded from the internet. After dragging
												<strong>JDMO Hub.app</strong> into <strong>Applications</strong>, run these
												commands in Terminal to fix permissions and remove the quarantine flag:
											</p>
											<div class="setup-cmds">
												<code>chmod +x '/Applications/JDMO Hub.app/Contents/MacOS/JDMO'</code>
												<code>sudo xattr -dr com.apple.quarantine '/Applications/JDMO Hub.app'</code>
											</div>
											<p class="setup-desc">
												Then you can open <strong>JDMO Hub</strong> from your Applications folder.
											</p>
										</div>
									{/if}
								{/if}
							</div>
						{/each}
					</div>
					<p class="release-note">
						Release v{manifest?.version} · {manifest?.pub_date
							? new Date(manifest.pub_date).toLocaleDateString()
							: ''}
					</p>
				{/if}
			</div>

			<div class="modal-footer">
				<button class="close-btn" on:click={onClose}>Close</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(8px);
		z-index: 99999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}

	.modal-content {
		width: 100%;
		max-width: 500px;
		max-height: 88vh;
		overflow-y: auto;
		background: #1a1a24;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		padding: 2.5rem;
		position: relative;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
	}

	/* Thin, unobtrusive scrollbar for when content overflows */
	.modal-content::-webkit-scrollbar {
		width: 6px;
	}
	.modal-content::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 999px;
	}

	.modal-close {
		position: absolute;
		top: 1.25rem;
		right: 1.25rem;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		transition: color 0.2s;
	}
	.modal-close:hover {
		color: #fff;
	}

	.modal-header {
		text-align: center;
		margin-bottom: 1.75rem;
	}
	.icon-box {
		width: 64px;
		height: 64px;
		background: rgba(168, 85, 247, 0.1);
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 1rem;
	}
	.modal-title {
		font-size: 1.4rem;
		font-weight: 800;
		color: #fff;
		margin-bottom: 0.4rem;
	}
	.modal-desc {
		font-size: 0.9rem;
		color: #9ca3af;
	}

	.platform-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.platform-item {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16px;
		transition: all 0.2s;
		overflow: hidden;
	}
	.platform-item:hover {
		background: rgba(168, 85, 247, 0.12);
		border-color: rgba(168, 85, 247, 0.5);
	}
	.platform-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		color: #fff;
	}
	.platform-icon {
		width: 48px;
		height: 48px;
		flex-shrink: 0;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #c084fc;
	}
	.platform-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}
	.platform-name {
		font-weight: 700;
		font-size: 1rem;
	}
	.platform-arch {
		font-size: 0.8rem;
		color: #9ca3af;
		margin-top: 0.1rem;
	}
	.download-btn {
		width: 38px;
		height: 38px;
		flex-shrink: 0;
		border: 1px solid rgba(168, 85, 247, 0.4);
		background: rgba(168, 85, 247, 0.15);
		color: #c084fc;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}
	.download-btn:hover {
		background: rgba(168, 85, 247, 0.3);
		transform: translateY(-1px);
	}

	.setup-link {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		width: 100%;
		background: transparent;
		border: none;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		color: #9ca3af;
		font-size: 0.78rem;
		font-weight: 600;
		padding: 0.65rem 1.25rem;
		cursor: pointer;
		transition: color 0.2s, background 0.2s;
	}
	.setup-link:hover,
	.setup-link.active {
		color: #c084fc;
		background: rgba(168, 85, 247, 0.06);
	}
	.setup-link .chevron {
		margin-left: auto;
		transition: transform 0.2s;
	}
	.setup-link.active .chevron {
		transform: rotate(180deg);
	}

	.setup-box {
		padding: 0 1.25rem 1.1rem;
		background: rgba(168, 85, 247, 0.06);
	}
	.setup-desc {
		font-size: 0.8rem;
		color: #c4b5fd;
		line-height: 1.5;
	}
	.setup-cmds {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin: 0.75rem 0;
	}
	.setup-cmds code {
		display: block;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		padding: 0.5rem 0.75rem;
		font-size: 0.72rem;
		color: #f0abfc;
		word-break: break-all;
	}
	.release-note {
		margin-top: 1rem;
		text-align: center;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.modal-footer {
		margin-top: 1.5rem;
		text-align: center;
	}
	.close-btn {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #d1d5db;
		font-weight: 600;
		padding: 0.6rem 2rem;
		border-radius: 999px;
		cursor: pointer;
		transition: all 0.2s;
	}
	.close-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}
	.retry-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(168, 85, 247, 0.15);
		border: 1px solid rgba(168, 85, 247, 0.4);
		color: #c084fc;
		font-weight: 600;
		padding: 0.6rem 1.5rem;
		border-radius: 999px;
		cursor: pointer;
		transition: all 0.2s;
	}
	.retry-btn:hover {
		background: rgba(168, 85, 247, 0.25);
	}
</style>