<script>
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import { UserX, UserCheck, AlertTriangle, Loader, Check } from 'lucide-svelte';

	const dispatch = createEventDispatcher();

	export let show;
	export let user = null;
	export let action = 'ban'; // 'ban' or 'unban'

	let isFading = false;
	let isProcessing = false;
	let reason = '';
	let localErrorMessage = '';
	let notifyUser = false;

	// Reset when modal opens
	$: if (show) {
		reason = '';
		localErrorMessage = '';
		isProcessing = false;
	}

	async function close() {
		isFading = true;
		await tick();
		await new Promise((resolve) => setTimeout(resolve, 300)); // Match CSS transition duration
		show = false;
		isFading = false;
		reason = '';
		localErrorMessage = '';

		dispatch('closeModal', {
			clearMessages: true
		});
	}

	async function handleAction() {
		if (!reason.trim()) {
			localErrorMessage = 'Please provide a reason';
			return;
		}

		localErrorMessage = '';
		isProcessing = true;

		try {
			dispatch('banUser', {
				userId: user.userId,
				reason: reason.trim(),
				action,
				notifyUser: notifyUser
			});
		} catch (error) {
			localErrorMessage = `Failed to ${action} user. Please try again.`;
			isProcessing = false;
		}
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

	// Handle ban action result from parent
	export function handleBanResult(success, error) {
		if (success) {
			close();
		} else {
			isProcessing = false;
			localErrorMessage = error || `Failed to ${action} user. Please try again.`;
		}
	}

	$: canSubmit = reason.trim().length > 0;
	$: actionText = action === 'ban' ? 'Ban' : 'Unban';
	$: actionColor = action === 'ban' ? 'red' : 'green';
</script>

{#if show}
	<dialog open class="modal backdrop-blur-sm" class:fade-out={isFading}>
		<div
			class="modal-box bg-gray-800/90 backdrop-blur-xl border border-purple-500/30 rounded-3xl shadow-2xl max-w-md"
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
							{actionText} User
						</h3>
						{#if user}
							<p class="text-gray-400">
								{action === 'ban' ? 'Ban' : 'Unban'}
								<span class="text-white font-semibold">{user.username}</span>
							</p>
						{/if}
					</div>

					<!-- Warning -->
					<div class="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-4">
						<div class="flex items-center gap-2 text-yellow-300">
							<AlertTriangle class="w-5 h-5" />
							<span class="font-semibold">Warning</span>
						</div>
						<p class="text-yellow-200 text-sm mt-1">
							{action === 'ban'
								? 'This will prevent the user from accessing their account.'
								: "This will restore the user's access to their account."}
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

						<!-- Notify user checkbox -->
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
							<span>Notify user (will send the reason as mail)</span>
						</label>

						{#if localErrorMessage}
							<p class="text-red-400 text-sm">{localErrorMessage}</p>
						{/if}
					</div>

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
								{action === 'ban' ? 'Banning...' : 'Unbanning...'}
							{:else}
								{#if action === 'ban'}
									<UserX class="w-4 h-4" />
								{:else}
									<UserCheck class="w-4 h-4" />
								{/if}
								{actionText} User
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
