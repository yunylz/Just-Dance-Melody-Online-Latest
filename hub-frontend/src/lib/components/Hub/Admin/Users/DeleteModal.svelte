<script>
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import { UserX, AlertTriangle, Loader, Trash2, Check } from 'lucide-svelte';

	const dispatch = createEventDispatcher();

	export let show;
	export let user = null;

	let isFading = false;
	let isProcessing = false;
	let reason = '';
	let localErrorMessage = '';
	let confirmUsername = '';
	let notifyUser = false;

	// Reset when modal opens
	$: if (show) {
		reason = '';
		localErrorMessage = '';
		isProcessing = false;
		confirmUsername = '';
	}

	async function close() {
		isFading = true;
		await tick();
		await new Promise(resolve => setTimeout(resolve, 300)); // Match CSS transition duration
		show = false;
		isFading = false;
		reason = '';
		localErrorMessage = '';
		confirmUsername = '';
		
		dispatch('closeModal', {
			clearMessages: true
		});
	}

	async function handleAction() {
		if (!reason.trim()) {
			localErrorMessage = 'Please provide a reason';
			return;
		}

		if (confirmUsername !== user.username) {
			localErrorMessage = 'Username confirmation does not match';
			return;
		}
		
		localErrorMessage = '';
		isProcessing = true;
		
		try {
			dispatch('deleteUser', {
				userId: user.userId,
				reason: reason.trim(),
				notifyUser: notifyUser
			});
		} catch (error) {
			localErrorMessage = 'Failed to delete user. Please try again.';
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

	// Handle delete action result from parent
	export function handleDeleteResult(success, error) {
		if (success) {
			close();
		} else {
			isProcessing = false;
			localErrorMessage = error || 'Failed to delete user. Please try again.';
		}
	}

	$: canSubmit = reason.trim().length > 0 && confirmUsername === user?.username;
</script>

{#if show}
	<dialog open class="modal backdrop-blur-sm" class:fade-out={isFading}>
		<div class="modal-box bg-gray-800/90 backdrop-blur-xl border border-red-500/30 rounded-3xl shadow-2xl max-w-md">
			<div class="relative">
				<!-- Modal glow effect -->
				<div class="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-3xl blur-xl"></div>
				
				<!-- Modal content -->
				<div class="relative space-y-6">
					<!-- Header -->
					<div class="text-center">
						<div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
							<Trash2 class="w-8 h-8 text-white"/>
						</div>
						<h3 class="text-2xl font-bold text-white mb-2">
							Delete User
						</h3>
						{#if user}
							<p class="text-gray-400">
								Permanently delete <span class="text-white font-semibold">{user.username}</span>
							</p>
						{/if}
					</div>

					<!-- Danger Warning -->
					<div class="bg-red-500/20 border border-red-400/30 rounded-xl p-4">
						<div class="flex items-center gap-2 text-red-300">
							<AlertTriangle class="w-5 h-5" />
							<span class="font-semibold">Danger Zone</span>
						</div>
						<p class="text-red-200 text-sm mt-1">
							This action is <strong>irreversible</strong>. The user's account and all associated data will be permanently deleted.
						</p>
					</div>

					<!-- Username Confirmation -->
					<div class="space-y-2">
						<label class="block text-sm font-medium text-gray-300">
							Type <span class="font-mono text-white">{user?.username}</span> to confirm deletion
						</label>
						<input
							type="text"
							bind:value={confirmUsername}
							placeholder="Enter username to confirm"
							class="w-full p-3 bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-red-400/50 focus:ring-2 focus:ring-red-400/20 focus:outline-none transition-all duration-300"
							class:border-red-400={localErrorMessage && localErrorMessage.includes('Username')}
							disabled={isProcessing}
						/>
					</div>

					<!-- Reason Input -->
					<div class="space-y-2">
						<label class="block text-sm font-medium text-gray-300">
							Reason for deletion
						</label>
						<textarea
							bind:value={reason}
							placeholder="Enter a detailed reason for deleting this user..."
							class="w-full p-3 bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-red-400/50 focus:ring-2 focus:ring-red-400/20 focus:outline-none transition-all duration-300 resize-none"
							class:border-red-400={localErrorMessage && !localErrorMessage.includes('Username')}
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
							class="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
							on:click={handleAction}
							disabled={!canSubmit || isProcessing}
						>
							{#if isProcessing}
								<Loader class="animate-spin w-4 h-4" />
								Deleting...
							{:else}
								<Trash2 class="w-4 h-4" />
								Delete User
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