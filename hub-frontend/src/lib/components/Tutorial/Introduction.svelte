<script>
	import './tutorial.css';

	/** @type {(tab: string, section: string) => void} */
	export let onNavigate;
</script>

<div>
	<div class="page-header">
		<h1 class="page-title">Welcome to the new JDMO experience!</h1>
		<p class="page-desc">
			The guide to getting started with <strong>Just Dance Melody Online</strong>.
		</p>
	</div>

	<div class="intro-card">
		<h2 class="intro-heading" id="toc-what-is-jdmo">What is JDMO?</h2>
		<p class="intro-text">
			<strong>Just Dance Melody Online (JDMO)</strong> is a custom online service that replaces the
			official Just Dance Unlimited service. It lets you play online features on your favourite
			Just Dance titles — including <strong>World Dance Floor</strong>, <strong>Leaderboards</strong>,
			and more — on consoles that no longer have official support.
		</p>
	</div>

	<div class="intro-card">
		<h2 class="intro-heading" id="toc-how-it-works">How it works</h2>
		<p class="intro-text">
			JDMO works by redirecting your console's network traffic to our servers through a simple
			DNS or proxy configuration. Once set up, your console connects to JDMO automatically
			whenever you launch a supported Just Dance game.
		</p>
	</div>

	<div class="intro-card">
		<h2 class="intro-heading" id="toc-what-you-need">What you'll need</h2>
		<ul class="intro-list">
			<li>A supported Just Dance game (2016–2022)</li>
			<li>A JDMO Hub account (free to register)</li>
			<li>A compatible console</li>
			<li>Internet connection</li>
		</ul>
	</div>

	<div class="intro-card">
		<h2 class="intro-heading" id="toc-ready-to-start">Ready to start?</h2>
		<p class="intro-text">
			Select your platform from the sidebar to see setup instructions tailored to your console.
			If you run into any issues, join our <a href="/discord" class="intro-link">Discord server</a>
			for help.
		</p>
	</div>

	<div class="page-nav-row">
		<div></div>
		<button class="next-btn bg-brand-gradient" on:click={() => onNavigate('pc', 'what-is-hub')}>
			Next: What is Hub?
			<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</div>
</div>

<style>
	.intro-link {
		color: #fa7af1;
		text-decoration: underline;
		transition: color 0.2s;
	}
	.intro-link:hover { color: #fa7af1; }
</style>
