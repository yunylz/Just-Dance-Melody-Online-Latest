import { get } from "svelte/store";
import countries from "./countries";
import { jmcsItems, jmcsAliases } from "./stores/jmcs";

const BASE_URL = import.meta.env.VITE_HUB_API_URL || process.env.VITE_HUB_API_URL || 'http://127.0.0.1:3000';

class API {
	/**
	 * Helper to get auth headers
	 * @returns {Object} Headers with Authorization if token exists
	 */
	static getAuthHeaders() {
		const token = localStorage.getItem('authToken');
		return {
			'Content-Type': 'application/json',
			...(token ? { 'Authorization': `Bearer ${token}` } : {})
		};
	}

	/**
	 * Wrapped fetch that auto-clears expired tokens on 401.
	 */
	static async request(url, options = {}) {
		const response = await fetch(url, options);
		if (response.status === 401) {
			localStorage.removeItem('authToken');
		}
		return response;
	}

	/**
	 * Get the Discord OAuth initiation URL
	 * @param {string|null} token - Optional session token for linking
	 * @returns {string} The Discord auth URL
	 */
	static getDiscordAuthUrl(token = null) {
		const url = new URL(`${BASE_URL}/auth/v1/discord`);
		if (token) url.searchParams.set('token', token);
		return url.toString();
	}

	/**
	 * Unlink Discord account
	 */
	static async disconnectDiscord() {
		try {
			const response = await fetch(`${BASE_URL}/auth/v1/discord`, {
				method: 'DELETE',
				headers: this.getAuthHeaders()
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to disconnect Discord');
			return data;
		} catch (error) {
			console.error('Error disconnecting Discord:', error);
			throw error;
		}
	}

	/**
	 * Get the Patreon OAuth initiation URL
	 * @param {string|null} token - Optional session token for linking
	 * @returns {string} The Patreon auth URL
	 */
	static getPatreonAuthUrl(token = null) {
		const url = new URL(`${BASE_URL}/auth/v1/patreon`);
		if (token) url.searchParams.set('token', token);
		return url.toString();
	}

	/**
	 * Check if the current user is eligible to link a Patreon account
	 * Verifies Discord connection and Discord server membership
	 * @returns {Promise<{eligible: boolean, discordConnected: boolean, inDiscordServer: boolean, errors?: string[]}>}
	 */
	static async checkPatreonEligibility() {
		try {
			const response = await fetch(`${BASE_URL}/auth/v1/patreon/check`, {
				headers: this.getAuthHeaders()
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || 'Failed to check Patreon eligibility');
				err.code = data.code;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error checking Patreon eligibility:', error);
			throw error;
		}
	}

	/**
	 * Refresh Patreon subscription status in real-time by calling the Patreon API
	 * Should be called before fetching /me on the profile page to ensure fresh data
	 * @returns {Promise<Object>} 200 response on success
	 */
	static async refreshPatreonStatus() {
		try {
			const response = await fetch(`${BASE_URL}/auth/v1/patreon/refresh`, {
				headers: this.getAuthHeaders()
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || 'Failed to refresh Patreon status');
				err.code = data.code;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error refreshing Patreon status:', error);
			throw error;
		}
	}

	/**
	 * Unlink Patreon account
	 */
	static async disconnectPatreon() {
		try {
			const response = await fetch(`${BASE_URL}/auth/v1/patreon`, {
				method: 'DELETE',
				headers: this.getAuthHeaders()
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to disconnect Patreon');
			return data;
		} catch (error) {
			console.error('Error disconnecting Patreon:', error);
			throw error;
		}
	}

	/**
	 * Register a new user
	 * @param {Object} userData - User registration data
	 * @returns {Promise<Object>} Registration response
	 */
	static async register(userData) {
		try {
			const response = await fetch(`${BASE_URL}/auth/v1/register`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify(userData)
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || 'Failed to register');
				err.code = data.code;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error registering user:', error);
			throw error;
		}
	}

	/**
	 * Change user password
	 * @param {string} oldPass - The user's current password
	 * @param {string} newPass - The user's new password
	 * @returns {Promise<Object>} The response from the API
	 */
	static async changePassword(oldPass, newPass) {
		try {
			const response = await fetch(`${BASE_URL}/auth/v1/change-password`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || 'Failed to reset password');
				err.code = data.code;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error resetting password:', error);
			throw error;
		}
	};

	static async login(credentials) {
		try {
			const response = await this.request(`${BASE_URL}/auth/v1/session`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(credentials)
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || 'Failed to login');
				err.code = data.code;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error logging in:', error);
			throw error;
		}
	}

	/**
	 * Verify 2FA code with a temporary token
	 * @param {string} code - TOTP code
	 * @param {string} twoFactorToken - Temporary 2FA token
	 * @returns {Promise<Object>} Session response
	 */
	static async verify2FA(code, twoFactorToken) {
		try {
			const response = await this.request(`${BASE_URL}/auth/v1/2fa/verify`, {
				method: 'POST',
				headers: {
					...this.getAuthHeaders(),
					'X-2FA-Token': twoFactorToken
				},
				body: JSON.stringify({ code })
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || 'Verification failed');
				err.code = data.code;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error verifying 2FA:', error);
			throw error;
		}
	}

	/**
	 * Request password reset
	 * @param {string} email - User email
	 * @returns {Promise<Object>} Password reset response
	 */
	static async forgotPassword(email) {
		try {
			const response = await fetch(`${BASE_URL}/auth/v1/forgot-password`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ email })
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || 'Failed to send reset email');
			}
			return data;
		} catch (error) {
			console.error('Error requesting password reset:', error);
			throw error;
		}
	}

	/**
	 * Get current user's information
	 * @returns {Promise<Object>} Current user data
	 */
	static async getCurrentUser() {
		try {
			const response = await this.request(`${BASE_URL}/users/v1/me`, {
				headers: this.getAuthHeaders()
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || `HTTP error! status: ${response.status}`);
				err.code = data.errorCode || data.code;
				err.errorId = data.errorId;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error fetching current user:', error);
			throw error;
		}
	}

	/**
	 * Get user information by userId
	 * @param {string} userId - The ID of the user to fetch
	 * @returns {Promise<Object>} User data
	 */
	static async getUserById(userId) {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/all?userId=${userId}`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data;
		} catch (error) {
			console.error(`Error fetching user with ID ${userId}:`, error);
			return null;
		}
	}

	/**
	 * Update current user's profile
	 * @param {Object} userData - Updated user data
	 * @returns {Promise<Object>} Updated user data
	 */
	static async updateUserProfile(userData) {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/me`, {
				method: 'PATCH',
				headers: this.getAuthHeaders(),
				body: JSON.stringify(userData)
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || 'Failed to update profile');
			}
			return data;
		} catch (error) {
			console.error('Error updating user profile:', error);
			throw error;
		}
	}

	/**
	 * Link a console account to the user's profile
	 * @param {string} platform - Platform identifier (e.g., 'wii', 'wiiu', 'ps3', 'x360')
	 * @param {string} identifier - Platform username or MAC address for Wii
	 * @returns {Promise<Object>} Updated user data
	 */
	static async linkConsoleAccount(platform, identifier) {
		try {
			// Determine the correct field name based on platform
			const body = platform === 'wii'
				? { platform, macAddress: identifier }
				: { platform, username: identifier };

			const response = await fetch(`${BASE_URL}/users/v1/me/profiles`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify(body)
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || `Failed to link ${platform} account`);
			}
			return data;
		} catch (error) {
			console.error(`Error linking ${platform} account:`, error);
			throw error;
		}
	}

	/**
	 * Remove a console account from the user's profile
	 * @param {string} platform - Platform identifier (e.g., 'wiiu', 'ps3', 'x360')
	 * @returns {Promise<Object>} Updated user data
	 */
	static async removeConsoleAccount(platform) {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/me/profiles/${platform}`, {
				method: 'DELETE',
				headers: this.getAuthHeaders()
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || `Failed to remove ${platform} account`);
			}
			return data;
		} catch (error) {
			console.error(`Error removing ${platform} account:`, error);
			throw error;
		}
	}

	/**
	 * Verify a console verification code (does not link — only checks)
	 * @param {string} code - Verification code entered by the user
	 * @returns {Promise<Object>} { sessionData: { nameOnPlatform, platform } }
	 */
	static async verifyCode(code) {
		let response;
		try {
			response = await fetch(`${BASE_URL}/users/v1/verify-code`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ code })
			});
		} catch {
			throw new Error('An unknown server error occurred. Please try again later.');
		}

		let data;
		try {
			data = await response.json();
		} catch {
			throw new Error('An unknown server error occurred. Please try again later.');
		}

		if (!response.ok) {
			const err = new Error(data?.message || 'An unknown server error occurred. Please try again later.');
			err.errorId = data?.errorId ?? null;
			throw err;
		}
		return data;
	}

	/**
	 * Accept a console verification code and link the profile
	 * @param {string} code - Verification code entered by the user
	 * @returns {Promise<Object>} Success response
	 */
	static async acceptCode(code) {
		let response;
		try {
			response = await fetch(`${BASE_URL}/users/v1/accept-code`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ code })
			});
		} catch {
			throw new Error('An unknown server error occurred. Please try again later.');
		}

		let data;
		try {
			data = await response.json();
		} catch {
			throw new Error('An unknown server error occurred. Please try again later.');
		}

		if (!response.ok) {
			const err = new Error(data?.message || 'An unknown server error occurred. Please try again later.');
			err.errorId = data?.errorId ?? null;
			throw err;
		}
		return data;
	}

	/**
	 * Get home page content
	 * @returns {Promise<Array>} Array of home page content objects
	 */
	static async getHomePage() {
		try {
			const response = await fetch(`${BASE_URL}/editorial/v1/home`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Error fetching home page content:', error);
			return [];
		}
	}

	/**
	 * Get all available games and their platforms
	 * @returns {Promise<Array>} Array of game objects with available platforms
	 */
	static async getGames() {
		try {
			const response = await fetch(`${BASE_URL}/jmcs/v1/games`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data.games.map(game => ({
				id: game.jdVersion.toString(),
				name: game.name,
				isAvailable: game.isAvailable, // Preserve isAvailable
				platforms: game.platforms.filter(platform => platform.isAvailable),
				jdVersion: game.jdVersion
			}));
		} catch (error) {
			console.error('Error fetching games:', error);
			return [];
		}
	}

	/**
	 * Get all available songs
	 * @returns {Promise<Array>} Array of songs
	 */
	static async getSongs() {
		try {
			const response = await fetch(`${BASE_URL}/jmcs/v1/songdb`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			if (!data.songs || !Array.isArray(data.songs) || data.songs.length === 0) {
				console.error('Error fetching songs, no songs found.', data);
				return [];
			}
			return data.songs || [];
		} catch (error) {
			console.error('Error fetching songs:', error);
			return [];
		}
	}

	static async getPlaylists() {
		try {
			const response = await fetch(`${BASE_URL}/jmcs/v1/playlists`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data.playlists || [];
		} catch (error) {
			console.error('Error fetching playlists:', error);
			return [];
		}
	}

	static async getItems() {
		try {
			const response = await fetch(`${BASE_URL}/jmcs/v1/items`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return {
				avatars: data.avatars || [],
				skins: data.skins || [],
				portraitBorders: data.portraitBorders || [],
			};
		} catch (error) {
			console.error('Error fetching items:', error);
			return [];
		}
	}

	/**
	 * Get leaderboard for a specific song with pagination
	 * @param {string} songMapName - The mapName of the song
	 * @param {string} platform - Platform filter ("all", "ps3", "wiiu", etc.)
	 * @param {number} limit - Number of entries to fetch
	 * @param {number} offset - Starting index
	 * @returns {Promise<Array>} Array of leaderboard entries
	 */
	static async getLeaderboard(songMapName, platform = "all", limit = 50, offset = 0) {
		try {
			const params = new URLSearchParams({
				platform,
				mapName: songMapName,
				limit: limit.toString(),
				offset: offset.toString()
			});
			const response = await fetch(`${BASE_URL}/jmcs/v1/leaderboard?${params}`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data.leaderboard || [];
		} catch (error) {
			console.error('Error fetching leaderboard:', error);
			return [];
		}
	}

	static async getDOTW(mapName) {
		try {
			const response = await fetch(`${BASE_URL}/jmcs/v1/dotw?mapName=${mapName}`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data.dotw || {};
		}
		catch (error) {
			console.error('Error fetching DOTW:', error);
			return [];
		}
	}

	/**
	 * Get live World Dance Floor (WDF) status
	 * @param {string} room - JDMO Room (MainJDMO or 2017JDMO)
	 * @returns {Promise<Object>} Live status data
	 */
	static async getWDFStatus(room = "2015") {
		try {
			const params = new URLSearchParams({ room });
			const response = await fetch(`${BASE_URL}/jmcs/v1/wdf/status?${params}`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data.status;
		} catch (error) {
			console.error("Error fetching WDF status:", error);
			return null;
		}
	}

	static async getWDFRooms() {
		try {
			const response = await fetch(`${BASE_URL}/jmcs/v1/wdf/rooms`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data.rooms;
		} catch (error) {
			console.error("Error fetching WDF rooms:", error);
			return null;
		}
	}

	static async getWDFCCU(room = "2015") {
		try {
			const response = await fetch(`${BASE_URL}/jmcs/v1/wdf/ccu?room=${room}`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data;
		}
		catch (error) {
			console.error('Error fetching WDF CCU:', error);
			return null;
		}
	}

	static async getWDFLiveScores(room = "2015") {
		try {
			const response = await fetch(`${BASE_URL}/jmcs/v1/wdf/live-scores?room=${room}`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data.scores || [];
		}
		catch (error) {
			console.error('Error fetching WDF live scores:', error);
			return null;
		}
	}

	static async getSpotlight() {
		try {
			const response = await fetch(`${BASE_URL}/jmcs/v1/spotlight`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data;
		}
		catch (error) {
			console.error('Error fetching spotlight:', error);
			return null;
		}
	};

	static async getServerInfo() {
		try {
			const response = await fetch(`${BASE_URL}/status/v1/info`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data;
		} catch (error) {
			console.error("Error fetching server info:", error);
			return null;
		}
	};

	/**
	 * Send heartbeat ping to update online status
	 * @returns {Promise<Object>} Ping response
	 */
	static async ping() {
		try {
			const response = await fetch(`${BASE_URL}/status/v1/ping`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) return null;
			return await response.json();
		} catch (error) {
			// Don't log error for ping to avoid console spam if offline
			return null;
		}
	}

	static async getStats() {
		try {
			const response = await fetch(`${BASE_URL}/jmcs/v1/stats`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			const data = await response.json();
			return data.stats ?? {};
		} catch (error) {
			console.error('Error fetching stats:', error);
			return {};
		}
	};

	static async getFriendActivities() {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/me/friends/activities`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			const data = await response.json();
			return data.activities ?? [];
		} catch (error) {
			console.error('Error fetching friend activities:', error);
			return [];
		}
	};

	static async getUsers() {
		try {
			const response = await fetch(`${BASE_URL}/users/v1`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data;
		} catch (error) {
			console.error("Error fetching users:", error);
			return null;
		}
	};

	static async banUser(userId, reason, notifyUser = false) {
		try {
			const response = await fetch(`${BASE_URL}/admin/v1/ban-user`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ userId, reason, notifyUser })
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || 'Failed to ban user');
				err.code = data.code;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error banning user:', error);
			throw error;
		}
	};

	static async unbanUser(userId, reason, notifyUser = false) {
		try {
			const response = await fetch(`${BASE_URL}/admin/v1/unban-user`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ userId, reason, notifyUser })
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || 'Failed to unban user');
				err.code = data.code;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error unbanning user:', error);
			throw error;
		}
	};

	static async deleteUser(userId, reason, notifyUser = false) {
		try {
			const response = await fetch(`${BASE_URL}/admin/v1/delete-user`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ userId, reason, notifyUser })
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || 'Failed to delete user');
				err.code = data.code;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error deleting user:', error);
			throw error;
		}
	};

	static async getComments(contentId, commentType) {
		try {
			const response = await fetch(`${BASE_URL}/gs/v1/comments?contentId=${contentId}&commentType=${commentType}`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data.comments;
		} catch (error) {
			console.error('Error getting comments:', error);
			throw error;
		}
	};

	static async postComment(contentId, commentType, content) {
		try {
			const response = await fetch(`${BASE_URL}/gs/v1/comments`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ contentId, commentType, content })
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || 'Failed to post comment');
			}
			return data;
		} catch (error) {
			console.error('Error posting comment:', error);
			throw error;
		}
	};

	static async deleteComment(commentId) {
		try {
			const response = await fetch(`${BASE_URL}/gs/v1/comments/${commentId}`, {
				method: 'DELETE',
				headers: this.getAuthHeaders()
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || 'Failed to delete comment');
			}
			return data;
		} catch (error) {
			console.error('Error deleting comment:', error);
			throw error;
		}
	};

	static async addToQa(userId) {
		try {
			const response = await fetch(`${BASE_URL}/admin/v1/add-to-qa`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ userId })
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || 'Failed to add user to QA');
				err.code = data.code;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error adding user to QA:', error);
			throw error;
		}
	};

	static async removeFromQa(userId) {
		try {
			const response = await fetch(`${BASE_URL}/admin/v1/remove-from-qa`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ userId })
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || 'Failed to remove user from QA');
				err.code = data.code;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error removing user from QA:', error);
			throw error;
		}
	};

	static async addToPatreon(userId) {
		try {
			const response = await fetch(`${BASE_URL}/admin/v1/add-to-patreon`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ userId })
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || 'Failed to add user to Patreon');
				err.code = data.code;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error adding user to Patreon:', error);
			throw error;
		}
	};

	static async removeFromPatreon(userId) {
		try {
			const response = await fetch(`${BASE_URL}/admin/v1/remove-from-patreon`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ userId })
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || 'Failed to remove user from Patreon');
				err.code = data.code;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error removing user from Patreon:', error);
			throw error;
		}
	};

	static async getAdmins() {
		try {
			const response = await fetch(`${BASE_URL}/admin/v1/admins`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				const data = await response.json();
				const err = new Error(data.message || `HTTP error! status: ${response.status}`);
				err.code = data.code;
				throw err;
			}
			return await response.json();
		} catch (error) {
			console.error("Error fetching admins:", error);
			return [];
		}
	};

	static async getActivities() {
		try {
			const response = await fetch(`${BASE_URL}/admin/v1/activities`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return await response.json();
		} catch (error) {
			console.error("Error fetching admin activities:", error);
			return [];
		}
	};

	static async getJmcsActivities() {
		try {
			const response = await fetch(`${BASE_URL}/admin/v1/jmcs-activities`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return await response.json();
		} catch (error) {
			console.error("Error fetching JMCS activities:", error);
			return [];
		}
	};

	static async setJmcsEnv(userId, env) {
		try {
			const response = await fetch(`${BASE_URL}/admin/v1/set-jmcs-env`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ userId, env })
			});
			const data = await response.json();
			if (!response.ok) {
				const err = new Error(data.message || 'Failed to set JMCS environment');
				err.code = data.code;
				throw err;
			}
			return data;
		} catch (error) {
			console.error('Error setting JMCS environment:', error);
			throw error;
		}
	};

	/**
	 * Setup 2FA for the current user
	 * @param {string|null} twoFactorToken - Optional temporary 2FA token
	 * @returns {Promise<Object>} Secret and QR code URL
	 */
	static async setup2FA(twoFactorToken = null) {
		try {
			const headers = this.getAuthHeaders();
			if (twoFactorToken) headers['X-2FA-Token'] = twoFactorToken;

			const response = await fetch(`${BASE_URL}/auth/v1/2fa/setup`, {
				headers
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to setup 2FA');
			return data;
		} catch (error) {
			console.error('Error setting up 2FA:', error);
			throw error;
		}
	}

	/**
	 * Enable 2FA with a verification code
	 * @param {string} code - TOTP code
	 * @param {string|null} twoFactorToken - Optional temporary 2FA token
	 * @returns {Promise<Object>} Success response (may include session)
	 */
	static async enable2FA(code, twoFactorToken = null) {
		try {
			const headers = this.getAuthHeaders();
			if (twoFactorToken) headers['X-2FA-Token'] = twoFactorToken;

			const response = await fetch(`${BASE_URL}/auth/v1/2fa/enable`, {
				method: 'POST',
				headers,
				body: JSON.stringify({ code })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to enable 2FA');
			return data;
		} catch (error) {
			console.error('Error enabling 2FA:', error);
			throw error;
		}
	}

	/**
	 * Disable 2FA with a verification code
	 * @param {string} code - TOTP code
	 * @returns {Promise<Object>} Success response
	 */
	static async disable2FA(code) {
		try {
			const response = await fetch(`${BASE_URL}/auth/v1/2fa/disable`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ code })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to disable 2FA');
			return data;
		} catch (error) {
			console.error('Error disabling 2FA:', error);
			throw error;
		}
	}

	/**
	 * Get avatar URL for a player
	 * @param {number} avatarId - Avatar ID
	 * @returns {string} Avatar URL
	 */
	static getAvatarUrl(avatarId) {
		if (typeof avatarId === 'string' && avatarId.startsWith('http')) return avatarId;
		const items = get(jmcsItems);
		if (!items?.avatars?.length) return this.getDefaultAvatar();
		const avatar = items.avatars.find(
			a => a.id.toString() === avatarId?.toString()
		);
		const avatarUrl = avatar?.url || null;
		if (!avatarUrl) return this.getDefaultAvatar();

		return avatarUrl;
	}

	static getDefaultAvatar() {
		return `/assets/avatars/Common.png`;
	}

	/**
	 * Get portrait border background and foreground URLs by border ID
	 * @param {number|string} borderId - The portrait border ID
	 * @returns {{ background: string|null, foreground: string|null }}
	 */
	static getPortraitBorder(borderId) {
		const items = get(jmcsItems);
		if (!items?.portraitBorders?.length) return { background: null, foreground: null };
		const border = items.portraitBorders.find(
			b => b.id?.toString() === borderId?.toString()
		);
		if (!border) return { background: null, foreground: null };
		return {
			background: border.backgroundUrl || null,
			foreground: border.foregroundUrl || null
		};
	}

	/**
	 * Get alias name by alias ID
	 * @param {number|string} aliasId - The alias ID
	 * @returns {string|null}
	 */
	static getAliasName(aliasId) {
		const aliases = get(jmcsAliases);
		if (!aliases?.length) return null;
		const alias = aliases.find(a => a.id?.toString() === aliasId?.toString());
		return alias?.stringOnlineLocalized || alias?.stringPlaceholder || null;
	}

	static async assureItems() {
		const items = get(jmcsItems);

		const hasData =
			items?.avatars?.length > 0 ||
			items?.skins?.length > 0 ||
			items?.portraitBorders?.length > 0;

		if (hasData) return;

		const fetched = await API.getItems();
		jmcsItems.set(fetched);
	}

	static async getAliases() {
		try {
			const response = await fetch(`${BASE_URL}/jmcs/v1/aliases`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			const data = await response.json();
			return data.aliases || [];
		} catch (error) {
			console.error('Error fetching aliases:', error);
			return [];
		}
	}

	static async assureAliases() {
		const current = get(jmcsAliases);
		if (current?.length > 0) return;

		const fetched = await API.getAliases();
		jmcsAliases.set(fetched);
	}

	/**
	 * Subscribe to push notifications
	 * @param {Object} subscription - PushSubscription object with endpoint, keys.p256dh, keys.auth
	 * @returns {Promise<Object>}
	 */
	static async subscribePush(subscription) {
		try {
			const response = await fetch(`${BASE_URL}/push/v1/subscribe`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify(subscription)
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to subscribe to push');
			return data;
		} catch (error) {
			console.error('Error subscribing to push:', error);
			throw error;
		}
	}

	/**
	 * Unsubscribe from push notifications
	 * @param {string} endpoint - The push subscription endpoint to remove
	 * @returns {Promise<Object>}
	 */
	static async unsubscribePush(endpoint) {
		try {
			const response = await fetch(`${BASE_URL}/push/v1/subscribe`, {
				method: 'DELETE',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ endpoint })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to unsubscribe from push');
			return data;
		} catch (error) {
			console.error('Error unsubscribing from push:', error);
			throw error;
		}
	}

	/**
	 * Get cover image URL for a song
	 * @param {string} mapName - mapName from API
	 * @returns {string} Full cover URL
	 */
	static getCoverUrl(mapName) {
		if (!mapName) return ""
		return `/assets/covers/${mapName.toLowerCase()}.jpg`;
	}

	/**
	 * Get country flag emoji
	 * @param {Object} country - Country
	 * @returns {string} Flag emoji
	 */
	static getCountry(countryId) {
		const country = countries.find(c => c.id === countryId);
		const isUbisoft = countryId === 9627;
		if (!country) return {};
		return {
			name: country.name,
			code: country.code,
			flag: isUbisoft ? "/assets/ubi-flag.png" : `https://flagcdn.com/w40/${country.code.toLowerCase()}.png`
		};
	}

	static getCountryByCode(countryCode) {
		const country = countries.find(c => c.code === countryCode);
		const isUbisoft = countryCode === "UBI";
		if (!country) return {};
		return {
			name: country.name,
			code: country.code,
			flag: isUbisoft ? "/assets/ubi-flag.png" : `https://flagcdn.com/w40/${country.code.toLowerCase()}.png`
		};
	};

	// ── Friendship ────────────────────────────────────────────────────────────

	/**
	 * Get 5 suggested discoverable players
	 * @returns {Promise<Array>} Array of user objects
	 */
	static async getExplorePlayers() {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/explore`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			const data = await response.json();
			return data.users || [];
		} catch (error) {
			console.error('Error fetching explore players:', error);
			return [];
		}
	}

	/**
	 * Search for players by username
	 * @param {string} query - Search query
	 * @returns {Promise<Array>} Array of matching user objects
	 */
	static async searchPlayers(query) {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/search?q=${encodeURIComponent(query)}`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			const data = await response.json();
			return data.users || [];
		} catch (error) {
			console.error('Error searching players:', error);
			return [];
		}
	}

	/**
	 * Get current user's friends list
	 * @returns {Promise<Array>} Array of friend objects
	 */
	static async getFriends() {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/me/friends`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			const data = await response.json();
			return data.friends || [];
		} catch (error) {
			console.error('Error fetching friends:', error);
			return [];
		}
	}

	/**
	 * Get incoming and outgoing friend requests
	 * @returns {Promise<Object>} { incoming: [], outgoing: [] }
	 */
	static async getFriendRequests() {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/me/friends/requests`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			const data = await response.json();
			return { incoming: data.incoming || [], outgoing: data.outgoing || [] };
		} catch (error) {
			console.error('Error fetching friend requests:', error);
			return { incoming: [], outgoing: [] };
		}
	}

	/**
	 * Send a friend request
	 * @param {string} userId - Target user's ID
	 * @returns {Promise<Object>} { success: true }
	 */
	static async sendFriendRequest(userId) {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/me/friends/requests`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ userId })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to send friend request');
			return data;
		} catch (error) {
			console.error('Error sending friend request:', error);
			throw error;
		}
	}

	/**
	 * Accept a friend request
	 * @param {string} userId - User ID of the requester
	 * @returns {Promise<Object>} { success: true }
	 */
	static async acceptFriendRequest(userId) {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/me/friends/requests/accept`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ userId })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to accept friend request');
			return data;
		} catch (error) {
			console.error('Error accepting friend request:', error);
			throw error;
		}
	}

	/**
	 * Decline a friend request
	 * @param {string} userId - User ID of the requester
	 * @returns {Promise<Object>} { success: true }
	 */
	static async declineFriendRequest(userId) {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/me/friends/requests/decline`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ userId })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to decline friend request');
			return data;
		} catch (error) {
			console.error('Error declining friend request:', error);
			throw error;
		}
	}

	/**
	 * Cancel a sent friend request
	 * @param {string} userId - Target user ID
	 * @returns {Promise<Object>} { success: true }
	 */
	static async cancelFriendRequest(userId) {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/me/friends/requests/cancel`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ userId })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to cancel friend request');
			return data;
		} catch (error) {
			console.error('Error cancelling friend request:', error);
			throw error;
		}
	}

	/**
	 * Remove a friend
	 * @param {string} userId - Friend's user ID
	 * @returns {Promise<Object>} { success: true }
	 */
	static async removeFriend(userId) {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/me/friends/remove`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify({ userId })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to remove friend');
			return data;
		} catch (error) {
			console.error('Error removing friend:', error);
			throw error;
		}
	}

	// ── Notifications ─────────────────────────────────────────────────────────

	/**
	 * Get personal social notifications
	 * @returns {Promise<Array>} Array of notification objects
	 */
	static async getNotifications() {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/me/notifications`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			const data = await response.json();
			return data.notifications || [];
		} catch (error) {
			console.error('Error fetching notifications:', error);
			return [];
		}
	}

	static async markNotificationRead(id) {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/me/notifications/${id}/read`, {
				method: 'POST',
				headers: this.getAuthHeaders()
			});
			if (!response.ok) throw new Error('Failed to mark notification as read');
			return await response.json();
		} catch (error) {
			console.error('Error marking notification as read:', error);
			throw error;
		}
	}

	static async markAllNotificationsRead() {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/me/notifications/read-all`, {
				method: 'POST',
				headers: this.getAuthHeaders()
			});
			if (!response.ok) throw new Error('Failed to mark all notifications as read');
			return await response.json();
		} catch (error) {
			console.error('Error marking all notifications as read:', error);
			throw error;
		}
	}

	static async clearNotifications() {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/me/notifications`, {
				method: 'DELETE',
				headers: this.getAuthHeaders()
			});
			if (!response.ok) throw new Error('Failed to clear notifications');
			return await response.json();
		} catch (error) {
			console.error('Error clearing notifications:', error);
			throw error;
		}
	}

	// ── News ──────────────────────────────────────────────────────────────────

	/**
	 * Get news list
	 * @returns {Promise<Array>} Array of news objects
	 */
	static async getNews() {
		try {
			const response = await fetch(`${BASE_URL}/editorial/v1/news`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			return await response.json();
		} catch (error) {
			console.error('Error fetching news:', error);
			return [];
		}
	}

	/**
	 * Create a news item (Admin)
	 * @param {Object} newsData 
	 */
	static async createNews(newsData) {
		try {
			const response = await fetch(`${BASE_URL}/editorial/v1/news`, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify(newsData)
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to create news');
			return data;
		} catch (error) {
			console.error('Error creating news:', error);
			throw error;
		}
	}

	/**
	 * Update a news item (Admin)
	 * @param {string} id 
	 * @param {Object} newsData 
	 */
	static async updateNews(id, newsData) {
		try {
			const response = await fetch(`${BASE_URL}/editorial/v1/news/${id}`, {
				method: 'PATCH',
				headers: this.getAuthHeaders(),
				body: JSON.stringify(newsData)
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to update news');
			return data;
		} catch (error) {
			console.error('Error updating news:', error);
			throw error;
		}
	}

	/**
	 * Delete a news item (Admin)
	 * @param {string} id 
	 */
	static async deleteNews(id) {
		try {
			const response = await fetch(`${BASE_URL}/editorial/v1/news/${id}`, {
				method: 'DELETE',
				headers: this.getAuthHeaders()
			});
			if (!response.ok) throw new Error('Failed to delete news');
			return await response.json();
		} catch (error) {
			console.error('Error deleting news:', error);
			throw error;
		}
	}

	/**
	 * Upload news image (Admin)
	 * @param {File} file 
	 */
	static async uploadNewsImage(file) {
		try {
			const formData = new FormData();
			formData.append('image', file);

			const headers = this.getAuthHeaders();
			delete headers['Content-Type']; // Let browser set boundary

			const response = await fetch(`${BASE_URL}/editorial/v1/news/upload`, {
				method: 'POST',
				headers,
				body: formData
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || 'Failed to upload image');
			return data.imageUrl;
		} catch (error) {
			console.error('Error uploading news image:', error);
			throw error;
		}
	}

	// ── Public Profiles ───────────────────────────────────────────────────────

	/**
	 * Get a user's public profile (viewing another user)
	 * @param {string} userId - The user ID to look up
	 * @returns {Promise<Object|null>} Public profile data or null
	 */
	static async getPublicProfile(userId) {
		try {
			const response = await fetch(`${BASE_URL}/users/v1/${userId}`, {
				headers: this.getAuthHeaders()
			});
			if (!response.ok) {
				if (response.status === 404) return null;
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return await response.json();
		} catch (error) {
			console.error('Error fetching public profile:', error);
			return null;
		}
	}

	/**
	 * Download the PC Crack auth file
	 * @returns {Promise<string>} The raw INI content of the auth file
	 */
	static async getAuthFile() {
		const response = await this.request(`${BASE_URL}/auth/v1/get-auth-file`, {
			headers: this.getAuthHeaders()
		});
		if (!response.ok) {
			const data = await response.json().catch(() => ({}));
			throw new Error(data.message || 'Failed to download auth file');
		}
		const json = await response.json();
		if (!json.success || !json.data) {
			throw new Error('Failed to download auth file');
		}
		// The backend returns a base64-encoded INI payload
		const binary = atob(json.data);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return new TextDecoder('utf-8').decode(bytes);
	}
}

export default API;