<script>
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import { UserX, UserCheck, AlertTriangle, Loader, Check } from 'lucide-svelte';

	const dispatch = createEventDispatcher();

	export let show;
	export let users = [];
	export let action = 'ban'; // 'ban' or 'unban'

	let isFading = false;
	let isProcessing = false;
	let reason = '';
	let localErrorMessage = '';
	let notifyUser = false;

	// Only the users still needing processing (shrinks to the failed ones on retry)
	let pendingUserIds = [];
	let processedCount = 0;
	let totalCount = 0;
	let currentUsername = '';
	let summary = null; // { total, failures }

	// Reset when modal opens
	$: if (show) {
		reason = '';
		localErrorMessage = '';
		isProcessing = false;
		notifyUser = false;
		processedCount = 0;
		totalCount = 0;
		currentUsername = '';
		summary = null;
		pendingUserIds = users.map((u) => u.userId);
	}

	async function close() {
		isFading = true;
		await tick();
		await new Promise((resolve) => setTimeout(resolve, 300)); // Match CSS transition duration
		show = false;
		isFading = false;
		reason = '';
		localErrorMessage = '';
		processedCount = 0;
		totalCount = 0;
		currentUsername = '';
		summary = null;

		dispatch('closeModal', {
			clearMessages: true
		});
	}

	function handleAction() {
		if (!reason.trim()) {
			localErrorMessage = 'Please provide a reason';
			return;
		}

		if (pendingUserIds.length === 0) return;

		localErrorMessage = '';
		isProcessing = true;
		processedCount = 0;
		totalCount = pendingUserIds.length;
		currentUsername = '';

		dispatch('bulkBan', {
			userIds: pendingUserIds,
			reason: reason.trim(),
			action,
			notifyUser: notifyUser
		});
	}

	// Handle escape key to close modal
	function handleKeyPress(event) {
		if (event.key === 'Escape' && show && !isProcessing) {
			close();
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeyPress);
		return () => {
			document.removeEventListener('keydown', handleKeyPress);
		};
	});

	// Progress updates from the parent, called once per processed user
	export function reportProgress(processed, total, username) {
		processedCount = processed;
		totalCount = total;
		currentUsername = username || '';
	}

	// Final result from the parent
	export function handleBulkResult(success, failures = []) {
		if (success) {
			close();
			return;
		}

		summary = {
			total: totalCount,
			failures
		};
		pendingUserIds = failures.map((f) => f.userId);
		isProcessing = false;
	}

	$: canSubmit = reason.trim().length > 0 && pendingUserIds.length > 0;
	$: actionText = action === 'ban' ? 'Ban' : 'Unban';
	$: actionColor = action === 'ban' ? 'red' : 'green';
	$: progressPercent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;
	$: label = users.length === 1 ? 'user' : 'users';
</script>

{#if show}
	<dialog open class="modal backdrop-blur-sm" class:fade-out={isFading}>
		<div
			class="modal-box bg-gray-800/90 backdrop-blur-xl border border-purple-500/30 rounded-3xl shadow-2xl max-w-lg"
		>
			<div class="relative">
				<!-- Modal glow effect -->
				<div
					class="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl blur-xl"
				></div>

				<!-- Modal content -->
				<div class="relative space-y-6">
					<!-- Header -->
					<div class="text-center">
						<div
							class="w-16 h-16 mx-auto mb-4 bg-gradient-to-r {action === 'ban'
								? 'from-red-500 to-red-600'
								: 'from-green-500 to-green-600'} rounded-2xl flex items-center justify-center shadow-lg"
						>
							{#if action === 'ban'}
								<UserX class="w-8 h-8 text-white" />
							{:else}
								<UserCheck class="w-8 h-8 text-white" />
							{/if}
						</div>
						<h3 class="text-2xl font-bold text-white mb-2">
							{actionText} {users.length} {label}
						</h3>
						{#if users.length > 0}
							<p class="text-gray-400">
								{action === 'ban' ? 'Ban' : 'Unban'} the following
								{users.length} {users.length === 1 ? 'user' : 'users'}
							</p>
						{/if}
					</div>

					<!-- Selected users list -->
					<div class="max-h-32 overflow-y-auto space-y-1.5 pr-1">
						{#each users as user}
							<div
								class="flex items-center gap-2 text-sm text-gray-300 bg-gray-700/30 border border-gray-600/30 rounded-lg px-3 py-1.5"
							>
								{#if action === 'ban'}
									<UserX class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
								{:else}
									<UserCheck class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
								{/if}
								<span class="truncate font-medium">{user.username}</span>
								<span class="text-xs text-gray-500 font-mono ml-auto">{user.userId}</span>
							</div>
						{/each}
					</div>

					<!-- Warning -->
					<div class="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-4">
						<div class="flex items-center gap-2 text-yellow-300">
							<AlertTriangle class="w-5 h-5" />
							<span class="font-semibold">Warning</span>
						</div>
						<p class="text-yellow-200 text-sm mt-1">
							{action === 'ban'
								? 'This will prevent the selected users from accessing their accounts. Requests are processed one by one.'
								: "This will restore the selected users' access to their accounts. Requests are processed one by one."}
						</p>
					</div>

					<!-- Reason Input -->
					<div class="space-y-2">
						<label class="block text-sm font-medium text-gray-300">
							Reason for {action === 'ban' ? 'banning' : 'unbanning'}
						</label>
						<textarea
							bind:value={reason}
							placeholder="Enter a detailed reason..."
							class="w-full p-3 bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all duration-300 resize-none"
							class:border-red-400={localErrorMessage}
							class:ring-red-400={localErrorMessage}
							rows="3"
							disabled={isProcessing}
						></textarea>

						<!-- Notify users checkbox -->
						<label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={notifyUser}
								class="hidden"
								disabled={isProcessing}
							/>
							<div
								class="w-4 h-4 border border-gray-500 flex items-center justify-center rounded-sm bg-gray-800"
							>
								{#if notifyUser}
									<Check class="w-3 h-3 text-green-500" />
								{/if}
							</div>
							<span>Notify users (will send the reason as mail)</span>
						</label>

						{#if localErrorMessage}
							<p class="text-red-400 text-sm">{localErrorMessage}</p>
						{/if}
					</div>

					<!-- Progress -->
					{#if isProcessing}
						<div class="space-y-2">
							<div class="flex items-center justify-between text-sm">
								<span class="text-gray-300 font-medium">
									Processing {processedCount} of {totalCount}
									{#if currentUsername}
										<span class="text-gray-400">— {currentUsername}</span>
									{/if}
								</span>
								<span class="text-purple-300 font-semibold">{progressPercent}%</span>
							</div>
							<div class="h-2 bg-gray-700/50 rounded-full overflow-hidden">
								<div
									class="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
									style="width: {progressPercent}%"
								></div>
							</div>
							<div class="flex items-center gap-2 text-gray-400 text-sm">
								<Loader class="animate-spin w-4 h-4 text-purple-400" />
								Requests are sent one by one...
							</div>
						</div>
					{/if}

					<!-- Failures summary -->
					{#if summary && summary.failures.length > 0}
						<div class="bg-red-500/10 border border-red-400/30 rounded-xl p-3">
							<p class="text-sm font-semibold text-red-400 mb-2">
								{summary.failures.length} of {summary.total} failed
							</p>
							<div class="max-h-28 overflow-y-auto space-y-1">
								{#each summary.failures as failure}
									<div class="text-xs text-red-300">
										<span class="font-semibold">{failure.username}</span>
										<span class="text-red-400/70">— {failure.message}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex gap-3">
						<button
							type="button"
							class="flex-1 bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 text-gray-300 hover:text-white hover:border-gray-500/50 font-medium py-3 rounded-xl transition-all duration-300 hover:scale-105"
							on:click={close}
							disabled={isProcessing}
						>
							Cancel
						</button>
						<button
							type="button"
							class="flex-1 bg-gradient-to-r {action === 'ban'
								? 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
								: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'} text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
							on:click={handleAction}
							disabled={!canSubmit || isProcessing}
						>
							{#if isProcessing}
								<Loader class="animate-spin w-4 h-4" />
								Processing...
							{:else if summary && summary.failures.length > 0}
								{#if action === 'ban'}
									<UserX class="w-4 h-4" />
								{:else}
									<UserCheck class="w-4 h-4" />
								{/if}
								Retry Failed ({pendingUserIds.length})
							{:else}
								{#if action === 'ban'}
									<UserX class="w-4 h-4" />
								{:else}
									<UserCheck class="w-4 h-4" />
								{/if}
								{actionText} {users.length} {label}
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	</dialog>
{/if}

<style>
	.modal {
		transition: opacity 0.3s ease-in-out;
	}

	.fade-out {
		opacity: 0;
	}
</style>
