<script>
	import './tutorial.css';
	import Icon from '@iconify/svelte';
	import { compatGames, compatFeatures } from './tutorials.js';

	/** @type {(tab: string, section: string) => void} */
	export let onNavigate;
</script>

<div>
	<div class="page-header">
		<h1 class="page-title">Compatibility</h1>
		<p class="page-desc">An overview of which games and features are supported across all platforms.</p>
	</div>

	<div class="alert-patreon">
		<Icon icon="lucide:crown" width="18" height="18" class="alert-icon" />
		<div>
			<p class="alert-label">Patreon Early Access</p>
			<p class="alert-text"><strong>Patreon supporters</strong> get early access to Just Dance 2016, 2017 &amp; 2018! <a href="https://patreon.com/@c0llydoll" target="_blank" rel="noopener noreferrer" class="patreon-link">Subscribe here →</a></p>
		</div>
	</div>

	<h2 class="table-section-title" id="toc-supported-games">Supported Games</h2>
	<div class="table-wrap">
		<table class="matrix-table">
			<thead>
				<tr>
					<th>Game</th>
					<th>PC</th>
					<th>Switch 1/2</th>
					<th>Wii U</th>
					<th>PS4</th>
					<th>PS5</th>
				</tr>
			</thead>
			<tbody>
				{#each compatGames as row}
					<tr>
						<td class="td-name">{row.game}</td>
						<td class="td-status">{#if row.pc === 'patreon'}<span class="badge badge-patreon"><Icon icon="lucide:crown" width="12" height="12" /></span>{:else if row.pc === 'yes'}<span class="badge badge-yes">✓</span>{:else}<span class="badge badge-no">—</span>{/if}</td>
						<td class="td-status">{#if row.nx === 'patreon'}<span class="badge badge-patreon"><Icon icon="lucide:crown" width="12" height="12" /></span>{:else if row.nx === 'yes'}<span class="badge badge-yes">✓</span>{:else}<span class="badge badge-no">—</span>{/if}</td>
						<td class="td-status">{#if row.wiiu === 'patreon'}<span class="badge badge-patreon"><Icon icon="lucide:crown" width="12" height="12" /></span>{:else if row.wiiu === 'yes'}<span class="badge badge-yes">✓</span>{:else}<span class="badge badge-no">—</span>{/if}</td>
						<td class="td-status">{#if row.ps4 === 'patreon'}<span class="badge badge-patreon"><Icon icon="lucide:crown" width="12" height="12" /></span>{:else if row.ps4 === 'yes'}<span class="badge badge-yes">✓</span>{:else}<span class="badge badge-no">—</span>{/if}</td>
						<td class="td-status">{#if row.ps5 === 'patreon'}<span class="badge badge-patreon"><Icon icon="lucide:crown" width="12" height="12" /></span>{:else if row.ps5 === 'warn'}<span class="badge badge-warn">PS4 ver</span>{:else if row.ps5 === 'yes'}<span class="badge badge-yes">✓</span>{:else}<span class="badge badge-no">—</span>{/if}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<h2 class="table-section-title" style="margin-top: 2.5rem;" id="toc-feature-support">Feature Support</h2>
	<div class="table-wrap">
		<table class="matrix-table">
			<thead>
				<tr>
					<th>Feature</th>
					<th>PC</th>
					<th>Switch</th>
					<th>Wii U</th>
					<th>PS4</th>
				</tr>
			</thead>
			<tbody>
				{#each compatFeatures as row}
					<tr>
						<td class="td-name">{row.feature}</td>
						<td class="td-status">{#if row.pc === 'yes'}<span class="badge badge-yes">✓</span>{:else}<span class="badge badge-no">—</span>{/if}</td>
						<td class="td-status">{#if row.nx === 'yes'}<span class="badge badge-yes">✓</span>{:else}<span class="badge badge-no">—</span>{/if}</td>
						<td class="td-status">{#if row.wiiu === 'yes'}<span class="badge badge-yes">✓</span>{:else}<span class="badge badge-no">—</span>{/if}</td>
						<td class="td-status">{#if row.ps4 === 'yes'}<span class="badge badge-yes">✓</span>{:else}<span class="badge badge-no">—</span>{/if}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="page-nav-row">
		<button class="back-btn bg-brand-gradient" on:click={() => onNavigate('pc', 'introduction')}>
			<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
			Introduction
		</button>
	</div>
</div>

<style>
	.table-section-title {
		font-size: 1.1rem; font-weight: 700;
		background: linear-gradient(to right, #f3f4f6, #fa7af1);
		-webkit-background-clip: text; -webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 0.9rem;
	}
	.table-wrap {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		margin-bottom: 0.5rem;
		border-radius: 0.75rem;
		border: 1px solid rgba(246, 92, 246, 0.08);
		background: rgba(255,255,255,0.015);
	}
	.matrix-table { width: 100%; border-collapse: collapse; font-size: 0.825rem; }
	.matrix-table th {
		padding: 0.6rem 1rem;
		background: rgba(244, 91, 250, 0.2);
		color: #e68bfa;
		font-weight: 700;
		text-align: left;
		border-bottom: 1px solid rgba(246, 92, 236, 0.2);
		white-space: nowrap;
	}
	.matrix-table td {
		padding: 0.6rem 1rem;
		border-bottom: 1px solid rgba(233, 92, 246, 0.05);
		vertical-align: middle;
	}
	.matrix-table tr:last-child td { border-bottom: none; }
	.matrix-table tbody tr { transition: background 0.2s ease; }
	.matrix-table tbody tr:hover { background: rgba(226, 92, 246, 0.04); }
	.td-name { color: #e5e7eb; font-weight: 600; white-space: nowrap; }
	.td-status { text-align: center; }
	.badge {
		display: inline-flex; align-items: center; justify-content: center;
		font-size: 0.75rem; font-weight: 700;
		padding: 0.15rem 0.5rem;
		border-radius: 0.3rem;
	}
	.badge-yes { background: rgba(52,211,153,0.12); color: #34d399; }
	.badge-no  { background: transparent; color: #374151; }
	.badge-warn { background: rgba(251,191,36,0.1); color: #fbbf24; font-size: 0.7rem; }
	.badge-patreon { background: rgba(251,146,60,0.15); color: #fb923c; padding: 0.15rem 0.35rem; }

	.alert-patreon {
		display: flex; gap: 0.75rem; align-items: flex-start;
		padding: 0.85rem 1rem;
		border-radius: 0.75rem;
		margin-bottom: 1.5rem;
		background: rgba(251,146,60,0.08);
		border: 1px solid rgba(251,146,60,0.2);
	}
	.alert-patreon .alert-icon { flex-shrink: 0; margin-top: 0.15rem; color: #fb923c; }
	.alert-patreon .alert-label { font-weight: 700; font-size: 0.78rem; margin: 0 0 0.15rem; text-transform: uppercase; letter-spacing: 0.05em; color: #fb923c; }
	.alert-patreon .alert-text { font-size: 0.825rem; line-height: 1.55; margin: 0; color: rgba(251,146,60,0.85); }
	.alert-patreon .alert-text strong { color: #fdba74; }
	.patreon-link { color: #fbbf24; text-decoration: underline; transition: color 0.2s; }
	.patreon-link:hover { color: #fcd34d; }
</style>
