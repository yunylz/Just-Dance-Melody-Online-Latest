<script>
	import UsersHeader from '$lib/components/Hub/Admin/Users/UsersHeader.svelte';
	import UserCard from '$lib/components/Hub/Admin/Users/UserCard.svelte';
	import BanModal from '$lib/components/Hub/Admin/Users/BanModal.svelte';
	import DeleteModal from '$lib/components/Hub/Admin/Users/DeleteModal.svelte';
	import BulkBanModal from '$lib/components/Hub/Admin/Users/BulkBanModal.svelte';
	import BulkDeleteModal from '$lib/components/Hub/Admin/Users/BulkDeleteModal.svelte';
	import { popupStore } from '$lib/stores/popup';
	import { onMount } from 'svelte';
	import {
		User,
		Loader2,
		Shield,
		TestTube,
		UserX,
		Users,
		Heart,
		UserCheck,
		Trash2,
		Check,
		X
	} from 'lucide-svelte';
	import API from '$lib/api.js';
	import consoles from '$lib/consoles.js';
	import { page } from '$app/stores';

	let users = [];
	let loading = true;
	let searchTerm = '';
	let filteredUsers = [];
	let showBanModal = false;
	let showDeleteModal = false;
	let selectedUser = null;
	let banAction = 'ban'; // 'ban' or 'unban'
	let banModalRef;
	let deleteModalRef;
	let highlightedUserId = null;
	let selectedUserIds = new Set();
	let showBulkBanModal = false;
	let showBulkDeleteModal = false;
	let bulkAction = 'ban'; // 'ban' or 'unban'
	let bulkBanModalRef;
	let bulkDeleteModalRef;

	const PAGE_SIZE = 20;
	let currentPage = 1;
	let activeFilter = 'all';
	let previousSearchTerm = '';
	let previousActiveFilter = 'all';

	$: {
		let result = users;

		if (activeFilter !== 'all') {
			result = result.filter((user) => {
				if (activeFilter === 'admins') return user.status.admin;
				if (activeFilter === 'mods') return user.status.moderator;
				if (activeFilter === 'qa') return user.status.qa;
				if (activeFilter === 'subscribers') return user.patreon?.isSubscribed;
				if (activeFilter === 'banned') return user.status.banned;
				return true;
			});
		}

		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			result = result.filter((user) => {
				// Exact ID match if highlighting
				if (highlightedUserId && user.userId === highlightedUserId) return true;
				if (highlightedUserId) return false; // Filter everything else out if we are in UID mode

				// Search in basic user fields
				if (
					user.username.toLowerCase().includes(searchLower) ||
					user.email.toLowerCase().includes(searchLower) ||
					user.userId.toLowerCase().includes(searchLower) ||
					user.firstName?.toLowerCase().includes(searchLower) ||
					user.lastName?.toLowerCase().includes(searchLower)
				) {
					return true;
				}

				// Search in profiles
				if (user.profiles && user.profiles.length > 0) {
					return user.profiles.some(
						(profile) =>
							profile.nameOnPlatform?.toLowerCase().includes(searchLower) ||
							profile.idOnPlatform?.toLowerCase().includes(searchLower)
					);
				}

				return false;
			});
		}
		filteredUsers = result;
	}

	// Only reset to page 1 when the user actually changes the search/filter —
	// not when the data refreshes (e.g. after deleting a user).
	$: if (searchTerm !== previousSearchTerm || activeFilter !== previousActiveFilter) {
		currentPage = 1;
		previousSearchTerm = searchTerm;
		previousActiveFilter = activeFilter;
	}

	// Clamp to a valid page after the data changes (e.g. deleting the last
	// user on a page can shrink the number of available pages).
	$: if (currentPage > totalPages) {
		currentPage = Math.max(1, totalPages);
	}

	$: filterCounts = {
		all: users.length,
		admins: users.filter((u) => u.status.admin).length,
		mods: users.filter((u) => u.status.moderator).length,
		qa: users.filter((u) => u.status.qa).length,
		subscribers: users.filter((u) => u.patreon?.isSubscribed).length,
		banned: users.filter((u) => u.status.banned).length
	};

	$: selectedUsers = users.filter((u) => selectedUserIds.has(u.userId));
	$: selectedCount = selectedUserIds.size;
	$: allFilteredSelected =
		filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIds.has(u.userId));

	$: totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
	$: pagedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
	$: pageList = (() => {
		const pages = [];
		for (let p = 1; p <= totalPages; p++) {
			if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2) {
				pages.push({
					page: p,
					ellipsisBefore: pages.length > 0 && pages[pages.length - 1].page !== p - 1
				});
			}
		}
		return pages;
	})();

	function goToPage(page) {
		currentPage = Math.max(1, Math.min(page, totalPages));
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function refreshUsers() {
		users = await API.getUsers();
	}

	onMount(async () => {
		try {
			await refreshUsers();
			const uid = $page.url.searchParams.get('uid');
			const query = $page.url.searchParams.get('q');
			
			if (uid) {
				highlightedUserId = uid;
				searchTerm = uid; // This triggers the filter
			} else if (query) {
				searchTerm = query;
			}
		} catch (error) {
			console.error('Failed to load users:', error);
		} finally {
			loading = false;
		}
	});

	function formatDate(dateString) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function handleBanAction(user, action) {
		selectedUser = user;
		banAction = action;
		showBanModal = true;
	}

	function handleDeleteAction(user) {
		selectedUser = user;
		showDeleteModal = true;
	}

	function handleBanModalClose(event) {
		showBanModal = false;
		selectedUser = null;
		if (event.detail?.clearMessages) {
			// Handle clearing any messages if needed
		}
	}

	function handleDeleteModalClose(event) {
		showDeleteModal = false;
		selectedUser = null;
		if (event.detail?.clearMessages) {
			// Handle clearing any messages if needed
		}
	}

	async function handleBanUser(event) {
		const { userId, reason, action, notifyUser } = event.detail;

		try {
			if (action === 'ban') {
				await API.banUser(userId, reason, notifyUser);
				// Update user in local state
				await refreshUsers();
			} else {
				await API.unbanUser(userId, reason, notifyUser);
				// Update user in local state
				await refreshUsers();
			}

			// Notify modal of success
			if (banModalRef) {
				banModalRef.handleBanResult(true);
			}
		} catch (error) {
			console.error(`Failed to ${action} user:`, error);
			// Notify modal of error
			if (banModalRef) {
				banModalRef.handleBanResult(
					false,
					error.message || `Failed to ${action} user. Please try again.`
				);
			}
		}
	}

	async function handleDeleteUser(event) {
		const { userId, reason, notifyUser } = event.detail;

		try {
			await API.deleteUser(userId, reason, notifyUser);
			// Remove user from local state
			await refreshUsers();

			// Notify modal of success
			if (deleteModalRef) {
				deleteModalRef.handleDeleteResult(true);
			}
		} catch (error) {
			console.error('Failed to delete user:', error);
			// Notify modal of error
			if (deleteModalRef) {
				deleteModalRef.handleDeleteResult(
					false,
					error.message || 'Failed to delete user. Please try again.'
				);
			}
		}
	}

	async function handleUnlinkProfile(userId, profileId) {
		try {
			await API.adminUnlinkProfile(userId, profileId);
			// Update user in local state to remove the profile
			users = users.map((user) =>
				user.userId === userId
					? {
							...user,
							profiles: user.profiles.filter((profile) => profile.profileId !== profileId)
						}
					: user
			);
		} catch (error) {
			console.error('Failed to unlink profile:', error);
			// You might want to show a toast notification here
		}
	}

	async function handleQaAction(user, action) {
		try {
			if (action === 'add') {
				await API.addToQa(user.userId);
			} else {
				await API.removeFromQa(user.userId);
			}
			// Update user in local state
			await refreshUsers();
		} catch (error) {
			console.error(`Failed to ${action} user ${action === 'add' ? 'to' : 'from'} QA:`, error);
			// You might want to show a toast notification here
		}
	}

	async function handleSetJmcsEnv(userId, env) {
		try {
			await API.setJmcsEnv(userId, env);
			users = users.map((u) =>
				u.userId === userId ? { ...u, status: { ...u.status, jmcsEnv: env } } : u
			);
			const username = users.find((u) => u.userId === userId)?.username;
			popupStore.add(
				`Environment updated to ${env.toUpperCase()} for "${username}" successfully!`,
				'success'
			);
		} catch (error) {
			popupStore.add(error.message || 'Failed to update environment', 'error');
		}
	}

	function toggleUserSelection(userId) {
		const next = new Set(selectedUserIds);
		if (next.has(userId)) {
			next.delete(userId);
		} else {
			next.add(userId);
		}
		selectedUserIds = next;
	}

	function toggleSelectAllFiltered() {
		const next = new Set(selectedUserIds);
		if (allFilteredSelected) {
			filteredUsers.forEach((u) => next.delete(u.userId));
		} else {
			filteredUsers.forEach((u) => next.add(u.userId));
		}
		selectedUserIds = next;
	}

	function clearSelection() {
		selectedUserIds = new Set();
	}

	function handleBulkBanOpen(action) {
		bulkAction = action;
		showBulkBanModal = true;
	}

	function handleBulkDeleteOpen() {
		showBulkDeleteModal = true;
	}

	function handleBulkBanModalClose() {
		showBulkBanModal = false;
		clearSelection();
	}

	function handleBulkDeleteModalClose() {
		showBulkDeleteModal = false;
		clearSelection();
	}

	async function handleBulkBan(event) {
		const { userIds, reason, action, notifyUser } = event.detail;
		const total = userIds.length;
		const failures = [];

		for (let i = 0; i < total; i++) {
			const userId = userIds[i];
			const user = users.find((u) => u.userId === userId);

			if (bulkBanModalRef) {
				bulkBanModalRef.reportProgress(i + 1, total, user?.username);
			}

			try {
				if (action === 'ban') {
					await API.banUser(userId, reason, notifyUser);
				} else {
					await API.unbanUser(userId, reason, notifyUser);
				}
			} catch (error) {
				console.error(`Failed to ${action} user ${userId}:`, error);
				failures.push({
					username: user?.username || userId,
					userId,
					message: error.message || `Failed to ${action} user`
				});
			}
		}

		if (failures.length < total) {
			await refreshUsers();
		}

		if (bulkBanModalRef) {
			bulkBanModalRef.handleBulkResult(failures.length === 0, failures);
		}
	}

	async function handleBulkDelete(event) {
		const { userIds, reason, notifyUser } = event.detail;
		const total = userIds.length;
		const failures = [];

		for (let i = 0; i < total; i++) {
			const userId = userIds[i];
			const user = users.find((u) => u.userId === userId);

			if (bulkDeleteModalRef) {
				bulkDeleteModalRef.reportProgress(i + 1, total, user?.username);
			}

			try {
				await API.deleteUser(userId, reason, notifyUser);
			} catch (error) {
				console.error(`Failed to delete user ${userId}:`, error);
				failures.push({
					username: user?.username || userId,
					userId,
					message: error.message || 'Failed to delete user'
				});
			}
		}

		if (failures.length < total) {
			await refreshUsers();
		}

		if (bulkDeleteModalRef) {
			bulkDeleteModalRef.handleBulkResult(failures.length === 0, failures);
		}
	}
</script>

<div class="relative min-h-screen overflow-hidden">
	<div
		class="absolute top-24 left-16 w-36 h-36 bg-pink-500/8 rounded-full blur-3xl animate-pulse"
	></div>
	<div
		class="absolute top-80 right-24 w-32 h-32 bg-purple-500/8 rounded-full blur-3xl animate-pulse animation-delay-2000"
	></div>
	<div
		class="absolute bottom-32 left-1/4 w-28 h-28 bg-blue-500/8 rounded-full blur-3xl animate-pulse animation-delay-4000"
	></div>

	<div class="relative z-10 p-8 space-y-8">
		<UsersHeader />

		<!-- Search and Stats -->
		<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">
			<div class="flex items-center justify-between mb-8">
				<div>
					<h2 class="text-2xl font-bold text-white mb-2">User Management</h2>
					<p class="text-gray-400">
						{filteredUsers.length}
						{filteredUsers.length === 1 ? 'user' : 'users'}
						{searchTerm || activeFilter !== 'all' ? `found (${users.length} total)` : 'total'}
					</p>
				</div>
				<div class="relative group">
					<input
						type="text"
						placeholder="Search users..."
						bind:value={searchTerm}
						class="w-80 bg-gray-700/30 border border-gray-600/50 rounded-2xl px-6 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 focus:ring-4 focus:ring-purple-400/10 transition-all duration-300"
					/>
				</div>
			</div>

			<!-- Role Filters -->
			<div class="flex flex-wrap gap-2 mb-8">
				{#each [{ id: 'all', label: 'All Users', icon: Users, color: '' }, { id: 'admins', label: 'Admins', icon: Shield, color: 'text-purple-400' }, { id: 'mods', label: 'Moderators', icon: Shield, color: 'text-blue-400' }, { id: 'qa', label: 'QA Team', icon: TestTube, color: 'text-cyan-400' }, { id: 'subscribers', label: 'Subscribers', icon: Heart, color: 'text-pink-400' }, { id: 'banned', label: 'Banned', icon: UserX, color: 'text-red-400' }] as filter}
					<button
						on:click={() => (activeFilter = filter.id)}
						class="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 border
						{activeFilter === filter.id
							? 'bg-purple-500/20 border-purple-500/50 text-white shadow-xl shadow-purple-500/10'
							: 'bg-gray-800/30 border-gray-700/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 hover:border-gray-600/50'}"
					>
						<svelte:component
							this={filter.icon}
							class="w-4 h-4 {activeFilter === filter.id ? filter.color : ''}"
						/>
						{filter.label}
						<span
							class="ml-1 text-xs px-2 py-0.5 rounded-full {activeFilter === filter.id
								? 'bg-white/10 text-white/70'
								: 'bg-gray-700/50 text-gray-500'}"
						>
							{filterCounts[filter.id]}
						</span>
					</button>
				{/each}
			</div>

			<!-- Bulk Selection Toolbar -->
			{#if selectedCount > 0}
				<div
					class="flex items-center justify-between flex-wrap gap-3 mb-8 px-4 py-3 bg-purple-500/10 border border-purple-500/40 rounded-2xl"
				>
					<div class="flex items-center gap-3 flex-wrap">
						<button
							on:click={toggleSelectAllFiltered}
							class="flex items-center gap-2 text-sm font-semibold text-purple-300 hover:text-purple-200 transition-colors"
						>
							<span
								class="w-5 h-5 rounded-md border-2 {allFilteredSelected
									? 'bg-purple-500/30 border-purple-400'
									: 'border-purple-400/50'} flex items-center justify-center"
							>
								{#if allFilteredSelected}
									<Check class="w-3.5 h-3.5" />
								{/if}
							</span>
							{allFilteredSelected ? 'Deselect all' : 'Select all'} ({filteredUsers.length})
						</button>
						<span class="text-sm text-gray-300 font-medium">{selectedCount} selected</span>
					</div>
					<div class="flex items-center gap-2 flex-wrap">
						<button
							on:click={() => handleBulkBanOpen('ban')}
							class="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 text-red-400 border border-red-400/30 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-all duration-200 hover:scale-105"
						>
							<UserX class="w-4 h-4" />
							Ban Selected ({selectedCount})
						</button>
						<button
							on:click={() => handleBulkBanOpen('unban')}
							class="flex items-center gap-1.5 px-3 py-2 bg-green-500/20 text-green-400 border border-green-400/30 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-all duration-200 hover:scale-105"
						>
							<UserCheck class="w-4 h-4" />
							Unban Selected ({selectedCount})
						</button>
						<button
							on:click={handleBulkDeleteOpen}
							class="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-600/30 transition-all duration-200 hover:scale-105"
						>
							<Trash2 class="w-4 h-4" />
							Delete Selected ({selectedCount})
						</button>
						<button
							on:click={clearSelection}
							class="flex items-center gap-1.5 px-3 py-2 bg-gray-700/50 text-gray-400 border border-gray-600/50 rounded-lg text-sm font-medium hover:bg-gray-700/70 hover:text-gray-200 transition-all duration-200"
						>
							<X class="w-4 h-4" />
							Clear
						</button>
					</div>
				</div>
			{/if}

			{#if loading}
				<div class="text-center py-12">
					<Loader2 class="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
					<p class="text-gray-400">Loading users...</p>
				</div>
			{:else if filteredUsers.length === 0}
				<div class="text-center py-12">
					<User class="w-12 h-12 text-gray-400 mx-auto mb-4" />
					<h3 class="text-xl font-semibold text-gray-300 mb-2">
						{searchTerm ? 'No users found' : 'No users available'}
					</h3>
					<p class="text-gray-400">
						{searchTerm
							? 'Try adjusting your search criteria'
							: 'There are no users matching your current filters or search criteria.'}
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each pagedUsers as user}
						<UserCard
							{user}
							{formatDate}
							onBanAction={handleBanAction}
							onDeleteAction={handleDeleteAction}
							onUnlinkProfile={handleUnlinkProfile}
							onQaAction={handleQaAction}
							onSetJmcsEnv={handleSetJmcsEnv}
							hasProfiles={user.profiles && user.profiles.length > 0}
							{consoles}
							highlighted={user.userId === highlightedUserId}
							selected={selectedUserIds.has(user.userId)}
							onToggleSelect={toggleUserSelection}
						/>
					{/each}
				</div>

				{#if totalPages > 1}
					<div class="flex items-center justify-between mt-6 pt-6 border-t border-gray-700/50">
						<p class="text-sm text-gray-400">
							Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(
								currentPage * PAGE_SIZE,
								filteredUsers.length
							)} of {filteredUsers.length} users
						</p>
						<div class="flex items-center gap-2">
							<button
								on:click={() => goToPage(1)}
								disabled={currentPage === 1}
								class="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
							>
								«
							</button>
							<button
								on:click={() => goToPage(currentPage - 1)}
								disabled={currentPage === 1}
								class="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
							>
								‹ Prev
							</button>

							{#each pageList as { page, ellipsisBefore }}
								{#if ellipsisBefore}
									<span class="text-gray-500 px-1">…</span>
								{/if}
								<button
									on:click={() => goToPage(page)}
									class="px-3 py-1.5 rounded-lg text-sm font-medium border transition-all {page ===
									currentPage
										? 'bg-purple-500/30 border-purple-500/50 text-purple-300'
										: 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-600/50'}"
								>
									{page}
								</button>
							{/each}

							<button
								on:click={() => goToPage(currentPage + 1)}
								disabled={currentPage === totalPages}
								class="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
							>
								Next ›
							</button>
							<button
								on:click={() => goToPage(totalPages)}
								disabled={currentPage === totalPages}
								class="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
							>
								»
							</button>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Ban Modal -->
	<BanModal
		bind:this={banModalRef}
		show={showBanModal}
		user={selectedUser}
		action={banAction}
		on:closeModal={handleBanModalClose}
		on:banUser={handleBanUser}
	/>

	<!-- Delete Modal -->
	<DeleteModal
		bind:this={deleteModalRef}
		show={showDeleteModal}
		user={selectedUser}
		on:closeModal={handleDeleteModalClose}
		on:deleteUser={handleDeleteUser}
	/>

	<!-- Bulk Ban Modal -->
	<BulkBanModal
		bind:this={bulkBanModalRef}
		show={showBulkBanModal}
		users={selectedUsers}
		action={bulkAction}
		on:closeModal={handleBulkBanModalClose}
		on:bulkBan={handleBulkBan}
	/>

	<!-- Bulk Delete Modal -->
	<BulkDeleteModal
		bind:this={bulkDeleteModalRef}
		show={showBulkDeleteModal}
		users={selectedUsers}
		on:closeModal={handleBulkDeleteModalClose}
		on:bulkDelete={handleBulkDelete}
	/>
</div>
