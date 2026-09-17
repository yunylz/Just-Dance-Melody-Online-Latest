const harbour = require("./harbour");
const jmcs = require("./jmcs");
const { createLogger } = require("./logger");
const config = require("../config");

const logger = createLogger({ service: "presence-lib" });

/**
 * The default spaceId for JDMO games.
 * Can be overridden per-environment via config.
 */
const DEFAULT_SPACE_ID = "041c03fa-1735-4ea7-b5fc-c16546d092ca";

/**
 * Name displayed as the "large image" text / application name in Discord RPC.
 */
const APP_NAME = "JDMO";

class Presence {
  constructor() {
    /** @type {Object<string, { name: string }>|null} */
    this._skus = null;
  }

  /**
   * Proxies a cover image URL through weserv for resizing.
   * @param {string} url
   * @param {number} [size=512]
   * @returns {string}
   */
  static _proxiedCover(url, size = 512) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&output=jpg`;
  }

  /**
   * Resolves a mapName to song metadata from the JMCS song DB cache.
   * @param {string} mapName
   * @returns {Promise<{ title: string, cover: string, duration: number }|null>}
   */
  async _resolveSong(mapName) {
    try {
      const songDb = await jmcs.getCachedHubSongDb();
      const song = songDb.find(s => s.mapName === mapName);

      if (!song) return null;

      return {
        mapName: song.mapName,
        title: song.title,
        artist: song.artist,
        cover: song.assets?.cover || null,
        duration: song.duration || 0,
      };
    } catch (err) {
      logger.error({ message: "Failed to resolve song from JMCS", details: { mapName, error: err.message } });
      return null;
    }
  }

  /**
   * Builds a presence object for Discord Rich Presence based on the user's
   * latest tracking event from Harbour.
   *
   * The desktop app should poll this endpoint every ~5 seconds.
   *
   * @param {string}  userId        Hub user UUID
   * @param {string}  [spaceId]     Optional game/product space UUID
   * @param {boolean} [withSong]    Whether to resolve song metadata (requires JMCS call). Default true.
   * @returns {Promise<Object>} Presence state
   */
  /**
   * Event types that the presence lib knows how to interpret, ordered by priority
   * (higher = more informative for Discord RPC).
   */
  static get HANDLED_EVENTS() {
    return new Set([
      "custom.level.stop",
      "custom.lobby.selection",
      "context.start.gameTab",
      "custom.playlist.start",
      "custom.search.feature",
      "custom.playlist.display",
      "custom.dancercard.edit",
      "context.stop.gameTab",
      "game.start",
      "player.start",
      "player.stats.playtime",
    ]);
  }

  async getPresence(userId, spaceId = DEFAULT_SPACE_ID, withSong = true) {
    const fallback = this._offline();

    // 1. Check for an active map session via JMCS first (player dancing right now).
    //    This runs before any staleness gate — tracking may pause during a song
    //    (game requests content auth and stops sending events), but the live
    //    session from JMCS keeps the RPC alive through the whole song.
    const live = await this._checkLiveSession(userId);
    if (live) return live;

    // 2. Fetch the full tracking batch (includes all events)
    const tracking = await harbour.getLatestTracking(userId);
    if (!tracking) return fallback;

    // 3. Check if tracking data is stale.
    //    Allow a generous window — tracking can have gaps between event batches.
    const updatedAt = new Date(tracking.updatedAt).getTime();
    const staleThreshold = 10 * 1000;
    if (Date.now() - updatedAt > staleThreshold) return fallback;

    // 4. Find the best event to interpret — scan from highest seqId down,
    //    picking the first event type we know how to handle.
    const events = tracking.events || [];
    const sorted = [...events].sort((a, b) => b.seqId - a.seqId);
    const event = sorted.find(e => Presence.HANDLED_EVENTS.has(e.type)) || sorted[0];
    if (!event) return fallback;

    // 5. Derive the true session start from event data alone.
    //    createdDate (epoch) − relativePlaytime = absolute wall-clock time
    //    the session began.  Both values are fixed per event, so the result
    //    is stable across every poll — no Date.now() drift, no resets.
    const createdEpoch = event.createdDate
      ? Math.floor(new Date(event.createdDate).getTime() / 1000)
      : undefined;
    const sessionStart = (createdEpoch != null && event.relativePlaytime != null)
      ? createdEpoch - event.relativePlaytime
      : undefined;

    // 6. Interpret the event
    return this._interpretEvent(event, tracking, withSong, sessionStart);
  }

  /**
   * Checks JMCS for an active map session (player currently dancing).
   * Returns a presence object if they are, or null if not.
   * @param {string} profileId
   * @returns {Promise<Object|null>}
   */
  async _checkLiveSession(userId) {
    try {
      const res = await jmcs.getMapSessions(userId);
      const sessions = res?.sessions || [];
      const now = Math.floor(Date.now() / 1000);

      // Find the session the player is currently in (startedAt ≤ now < endsAt)
      const active = sessions.find(s => s.startedAt <= now && now < s.endsAt);
      if (!active) return null;

      // Double-check with tracking: if the song was finished or the player
      // navigated to menus AFTER the session started, don't show live session.
      const tracking = await harbour.getLatestTracking(userId);
      if (tracking?.events) {
        const sessionStart = active.startedAt;
        const finished = tracking.events.some(
          e => e.type === "custom.level.stop" && e.obj?.mapName === active.mapName
        );
        const wentToMenu = tracking.events.some(e => {
          if (!e.createdDate) return false;
          const eTime = new Date(e.createdDate).getTime() / 1000;
          return eTime >= sessionStart && (
            e.type === "context.start.gameTab" ||
            e.type === "context.stop.gameTab"
          );
        });
        if (finished || wentToMenu) return null;
      }

      const song = await this._resolveSong(active.mapName);
      const title = song?.title || active.mapName;

      return {
        online: true,
        playing: true,
        state: `Dancing to '${title}'`,
        details: "In game",
        large_image: APP_NAME,
        large_text: APP_NAME,
        small_text: title,
        small_image: song?.cover ? this.constructor._proxiedCover(song.cover) : undefined,
        timestamps: {
          start: Math.floor(active.startedAt),
          end: Math.floor(active.endsAt),
        },
        song: {
          mapName: active.mapName,
          title,
          score: null,
          stars: null,
        },
        gameSessionId: null,
        lastUpdated: new Date().toISOString(),
      };
    } catch (err) {
      logger.error({ message: "Failed to check live session", error: err.message });
      return null;
    }
  }

  /**
   * Interprets a single tracking event into a Rich Presence payload.
   * @param {Object} event     The latest event from Harbour
   * @param {Object} tracking  The full tracking document (for metadata)
   * @param {boolean} withSong
   * @returns {Promise<Object>}
   */
  async _interpretEvent(event, tracking, withSong, sessionStart) {
    const { type } = event;

    switch (type) {
      case "custom.level.stop":
        return this._handleLevelStop(event, tracking, withSong, sessionStart);

      case "custom.lobby.selection":
        return this._handleLobbySelection(event, tracking, sessionStart);

      case "context.start.gameTab":
        return this._handleGameTabStart(event, tracking, sessionStart);

      case "context.stop.gameTab":
        return this._handleGenericActive(event, tracking, sessionStart);

      case "custom.dancercard.edit":
        return this._handleDancerCardEdit(event, tracking, sessionStart);

      case "custom.playlist.display":
        return this._handlePlaylistDisplay(event, tracking, sessionStart);

      case "custom.playlist.start":
        return this._handlePlaylistStart(event, tracking, sessionStart);

      case "custom.search.feature":
        return this._handleSearchFeature(event, tracking, sessionStart);

      case "game.start":
        return this._handleGameStart(event, tracking, sessionStart);

      case "player.start":
      case "player.stats.playtime":
      default:
        return this._handleGenericActive(event, tracking, sessionStart);
    }
  }

  /**
   * The player just finished (or is still on) a song/map.
   * @returns {Promise<Object>}
   */
  async _handleLevelStop(event, tracking, withSong, sessionStart) {
    const { obj = {} } = event;
    const mapName = obj.mapName;
    const mapScore = obj.mapScore || 0;
    const mapStars = obj.mapStars || 0;
    const tab = obj.tab || "SONGS";
    const sweatEnabled = obj.sweatEnabled || false;
    const coopEnabled = obj.coopEnabled || false;

    let song = null;
    if (withSong && mapName) {
      song = await this._resolveSong(mapName);
    }

    // Same sessionStart anchor as every other handler — keeps Discord's
    // elapsed counter continuous. No `end` timestamp since the song already
    // finished (level.stop fires post-song), so a past `end` would confuse
    // Discord's RPC display.
    const timestamps = sessionStart
      ? { start: sessionStart }
      : undefined;

    // If wdfServerRoom is set and not "NA", they're playing on World Dance Floor
    const isWdf = obj.wdfServerRoom && obj.wdfServerRoom !== "NA";

    // Build mode tags
    const modeTags = [];
    if (sweatEnabled) modeTags.push("Sweat");
    if (coopEnabled) modeTags.push("Co-op");
    if (isWdf) modeTags.push("WDF");
    const modeSuffix = modeTags.length ? ` (${modeTags.join(", ")})` : "";

    const state = song
      ? `In recap '${song.title}'${modeSuffix}`
      : `In recap '${mapName || "Unknown"}'`;

    const playerCount = obj.mapPlayerNbEnd || 1;
    const formattedScore = mapScore.toLocaleString("en-US");
    const details = `Score: ${formattedScore}  ${"★".repeat(mapStars)}  •  ${playerCount} player${playerCount > 1 ? "s" : ""}`;

    const presence = {
      online: true,
      playing: true,
      state,
      details,
      large_image: APP_NAME,
      large_text: APP_NAME,
      small_text: `${song?.title} by ${song?.artist}` || mapName || "",
      small_image: song?.cover ? this.constructor._proxiedCover(song.cover) : undefined,
      timestamps,
      song: song
        ? { mapName: song.mapName, title: song.title, score: mapScore, stars: mapStars, tab, wdf: isWdf, sweat: sweatEnabled, coop: coopEnabled }
        : { mapName, score: mapScore, stars: mapStars, tab, wdf: isWdf, sweat: sweatEnabled, coop: coopEnabled },
      gameSessionId: tracking.gameSessionId,
      lastUpdated: new Date().toISOString(),
    };

    return presence;
  }

  /**
   * Player entered a game tab (HOME, SONGS, PROFILE, WDF, etc.).
   * The typeData.contextName tells us which tab.
   * @returns {Object}
   */
  async _handleGameTabStart(event, tracking, sessionStart) {
    const tabName = event.typeData?.contextName || "Unknown";
    const gameName = await this._resolveGameName(tracking.spaceId);

    // Friendly display names for tabs
    const tabLabels = {
      HOME: "Browsing the home screen",
      SONGS: "Browsing songs",
      PROFILE: "Viewing their profile",
      SEARCH: "Searching songs",
      WDF: "In World Dance Floor",
      STORE: "In the store",
      SETTINGS: "In settings",
      CHALLENGES: "Browsing challenges",
      PLAYLISTS: "Browsing playlists",
    };

    const state = tabLabels[tabName] || `Browsing ${tabName}`;

    return {
      online: true,
      playing: false,
      state,
      details: `Playing ${gameName}`,
      large_image: APP_NAME,
      large_text: APP_NAME,
      small_text: tabName,
      timestamps: sessionStart ? { start: sessionStart } : undefined,
      gameSessionId: tracking.gameSessionId,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Player is editing their dancer card (avatar, alias, nickname, portrait border, etc.).
   * @returns {Object}
   */
  async _handleDancerCardEdit(event, tracking, sessionStart) {
    const item = event.obj?.updatedItem || "";
    const gameName = await this._resolveGameName(tracking.spaceId);

    const actionLabels = {
      Avatar: "Changing their avatar",
      Alias: "Changing their alias",
      Nickname: "Changing their nickname",
      PortraitBorder: "Changing their portrait border",
    };

    const state = actionLabels[item] || "Editing dancer card";

    return {
      online: true,
      playing: false,
      state,
      details: `Playing ${gameName}`,
      large_image: APP_NAME,
      large_text: APP_NAME,
      small_text: "Dancer Card",
      timestamps: sessionStart ? { start: sessionStart } : undefined,
      gameSessionId: tracking.gameSessionId,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Player is viewing playlists.
   * @returns {Object}
   */
  async _handlePlaylistDisplay(event, tracking, sessionStart) {
    const gameName = await this._resolveGameName(tracking.spaceId);

    return {
      online: true,
      playing: false,
      state: "Browsing playlists",
      details: `Playing ${gameName}`,
      large_image: APP_NAME,
      large_text: APP_NAME,
      small_text: "Playlists",
      timestamps: sessionStart ? { start: sessionStart } : undefined,
      gameSessionId: tracking.gameSessionId,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Player started a playlist.
   * @returns {Object}
   */
  async _handlePlaylistStart(event, tracking, sessionStart) {
    const playlistName = event.obj?.playlistName || "";
    const gameName = await this._resolveGameName(tracking.spaceId);

    return {
      online: true,
      playing: false,
      state: playlistName
        ? `Playing playlist '${playlistName}'`
        : "Playing a playlist",
      details: `Playing ${gameName}`,
      large_image: APP_NAME,
      large_text: APP_NAME,
      small_text: "Playlist",
      timestamps: sessionStart ? { start: sessionStart } : undefined,
      gameSessionId: tracking.gameSessionId,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Player is using the search feature.
   * @returns {Object}
   */
  async _handleSearchFeature(event, tracking, sessionStart) {
    const query = event.obj?.searchInput || "";
    const gameName = await this._resolveGameName(tracking.spaceId);

    return {
      online: true,
      playing: false,
      state: query
        ? `Searching for '${query}'`
        : "Searching for songs",
      details: `Playing ${gameName}`,
      large_image: APP_NAME,
      large_text: APP_NAME,
      small_text: "Search",
      timestamps: sessionStart ? { start: sessionStart } : undefined,
      gameSessionId: tracking.gameSessionId,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Resolves the game SKU info, using an in-memory cache to avoid repeated calls.
   * @returns {Promise<Object<string, { name: string, spaceId: string }>|null>}
   */
  async _resolveSkus() {
    if (this._skus) return this._skus;
    try {
      this._skus = await jmcs.getSkus();
      return this._skus;
    } catch (err) {
      logger.error({ message: "Failed to fetch SKUs from JMCS", error: err.message });
      return null;
    }
  }

  /**
   * Resolves a friendly game name (e.g. "Just Dance 2022") from a spaceId.
   * @param {string} spaceId
   * @returns {Promise<string>}
   */
  async _resolveGameName(spaceId) {
    if (!spaceId) return "Just Dance";
    const skus = await this._resolveSkus();
    if (!skus) return "Just Dance";
    const sku = Object.values(skus).find(s => s.spaceId === spaceId);
    return sku?.name || "Just Dance";
  }

  /**
   * Player just booted the game.
   * Resolves the gameSku from the event to show the game name (e.g. "Just Dance 2022").
   * @returns {Promise<Object>}
   */
  async _handleGameStart(event, tracking, sessionStart) {
    const gameSku = event.typeData?.gameSku || "";
    const skus = await this._resolveSkus();
    const skuInfo = skus?.[gameSku];
    const gameName = skuInfo?.name || "Just Dance";

    return {
      online: true,
      playing: false,
      state: "In menus",
      details: `Playing ${gameName}`,
      large_image: APP_NAME,
      large_text: APP_NAME,
      small_text: gameName,
      timestamps: sessionStart ? { start: sessionStart } : undefined,
      gameSessionId: tracking.gameSessionId,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Player is in a lobby selecting a song.
   * @returns {Object}
   */
  async _handleLobbySelection(event, tracking, sessionStart) {
    const gameName = await this._resolveGameName(tracking.spaceId);

    return {
      online: true,
      playing: false,
      state: "In the song lobby",
      details: `Playing ${gameName}`,
      large_image: APP_NAME,
      large_text: APP_NAME,
      small_text: "",
      timestamps: sessionStart ? { start: sessionStart } : undefined,
      gameSessionId: tracking.gameSessionId,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Player is actively in-game but not on a song (menus, browsing, etc.).
     * @returns {Object}
   */
  async _handleGenericActive(event, tracking, sessionStart) {
    // Check context stack to see which gameTab they're on
    const contexts = event.contexts || [];
    const isInGameTab = contexts.length > 0;
    const gameName = await this._resolveGameName(tracking.spaceId);

    return {
      online: true,
      playing: false,
      state: isInGameTab ? "Browsing menus" : "In menus",
      details: `Playing ${gameName}`,
      large_image: APP_NAME,
      large_text: APP_NAME,
      small_text: "",
      timestamps: sessionStart ? { start: sessionStart } : undefined,
      gameSessionId: tracking.gameSessionId,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Returns the fallback "offline" presence.
   * @returns {Object}
   */
  _offline() {
    return {};
  }
}

module.exports = new Presence();
