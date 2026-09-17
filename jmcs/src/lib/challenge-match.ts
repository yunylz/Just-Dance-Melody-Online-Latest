import { v4 as uuidv4 } from "uuid";

import MatchModel, { IMatch, IRound } from "./models/match";
import MatchHistoryModel, { IMatchHistory } from "./models/match-history";
import ProfileModel from "./models/profile";
import UgcModel from "./models/ugc";
import { getRedisClient } from "./clients/redis";
import liveClient from "./live-client";
import { createLogger } from "./logger";
import config from "../config";

const logger = createLogger({ service: "challenge-match" });

const INPROGRESS_MATCH_LIMIT = 100;
const COMPLETED_MATCH_LIMIT = 20;
const TYPE_RANKED = 0;
const TYPE_FRIENDLY = 1;
const STATE_INPROGRESS = 0;
const STATE_COMPLETED = 1;
const STATE_UPDATEPENDING = 2;

const ERROR_TOO_MANY_INPROGRESS_LOCAL = 1;
const ERROR_TOO_MANY_INPROGRESS_REMOTE = 2;
const ERROR_MATCH_EXISTING_WITH_USER = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMatchHistoryDoc() {
    return {
        ranked: { inProgress: [] as string[], completed: [] as string[] },
        friendly: { inProgress: [] as string[], completed: [] as string[] },
        updatePending: null as string | null,
        lastUpdateTime: 0,
    };
}

function isMatchCompleted(rounds: IRound[]): boolean {
    const scores: Record<string, number> = {};
    let result = false;
    rounds.forEach((round) => {
        if (round.winner) {
            scores[round.winner] = (scores[round.winner] || 0) + 1;
            if (scores[round.winner] >= 2) result = true;
        }
    });
    return result;
}

function formatMatchInfoForClient(matchInfo: Record<string, any>): Record<string, any> {
    matchInfo.__class = "MatchInfo";
    if (matchInfo.rounds) {
        matchInfo.rounds.forEach((round: any) => {
            round.__class = "RoundInfo";
        });
    }
    if (!matchInfo.hasOwnProperty("errorCode")) matchInfo.errorCode = 0;
    return matchInfo;
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Fetches match history for a player (and optionally an opponent).
 */
async function getMatchHistory(
    pid: string,
    opponentPid?: string
): Promise<{ history: { data: any; dirty: boolean }; opponentHistory?: any }> {
    const result: any = { history: { data: null as any, dirty: false } };

    const doc = await MatchHistoryModel.findOne({ pid }).lean();
    if (doc) {
        result.history.data = doc;
        result.history.dirty = false;
    } else {
        result.history.data = getMatchHistoryDoc();
        result.history.dirty = true;
    }

    if (opponentPid) {
        const oppDoc = await MatchHistoryModel.findOne({ pid: opponentPid }).lean();
        result.opponentHistory = oppDoc || getMatchHistoryDoc();
    }

    return result;
}

/**
 * Fetches match documents by an array of matchIds.
 */
async function getMatchDocs(matchIds: string[]): Promise<Record<string, IMatch>> {
    const matchMap: Record<string, IMatch> = {};
    if (!matchIds.length) return matchMap;

    const docs = await MatchModel.find({ matchId: { $in: matchIds } }).lean();
    docs.forEach((d) => {
        matchMap[d.matchId] = d as any;
    });
    return matchMap;
}

/**
 * Fetches opponent dancer cards for a set of matches.
 */
async function getOpponentProfiles(
    pid: string,
    matchDocs: Record<string, IMatch>
): Promise<Record<string, any>> {
    const dcIds: string[] = [];
    Object.keys(matchDocs).forEach((matchId) => {
        const challengers = matchDocs[matchId].challengers;
        const opponentPid = challengers[0] !== pid ? challengers[0] : challengers[1];
        dcIds.push(opponentPid);
    });

    const uniquePids = [...new Set(dcIds)];
    const profiles = await ProfileModel.find({ profileId: { $in: uniquePids } }).lean();
    const opponentDCs: Record<string, any> = {};

    for (const profile of profiles) {
        const pidKey = profile.profileId;
        if (!pidKey) continue;
        opponentDCs[pidKey] = profile;
        opponentDCs[pidKey].isSubscribed = false;
        opponentDCs[pidKey].isLive = false;
        try {
            opponentDCs[pidKey].isLive = await liveClient.isLive(pidKey);
        } catch { /* ignore */ }
    }

    return opponentDCs;
}

/**
 * Builds carousel match items from match documents.
 */
function getMatchItems(
    options: {
        pid: string;
        matchType: "ranked" | "friendly";
        matchState: "playerTurn" | "waitingTurn" | "completed";
        actionListName: string;
        actions: any;
        matchDocs: Record<string, IMatch>;
        opponentDCs: Record<string, any>;
        history: { data: any; previousUpdateTime?: number };
    }
): { items: any[]; actionLists: Record<string, any> } {
    const { pid, matchType, matchState, actionListName, actions, matchDocs, opponentDCs, history } = options;
    const actionLists: Record<string, any> = {};

    function createMatchItem(matchId: string) {
        const matchData = matchDocs[matchId];
        const opponentPid = matchData.challengers[0] !== pid ? matchData.challengers[0] : matchData.challengers[1];
        const opponentDC = opponentDCs[opponentPid] || {};

        const dancerComponent: any = {
            __class: "JD_CarouselContentComponent_Dancer",
            profileId: opponentPid,
            name: opponentDC.name || "",
            avatar: opponentDC.avatar || 0,
            country: opponentDC.country || 0,
            platformId: opponentDC.platformId || "",
            platform: opponentDC.platform || "",
            subscribed: opponentDC.isSubscribed || false,
            live: opponentDC.isLive || false,
        };
        if (opponentDC.skin) dancerComponent.skin = opponentDC.skin;
        if (opponentDC.portraitBorder) dancerComponent.portraitBorder = opponentDC.portraitBorder;
        if (opponentDC.jdPoints) dancerComponent.jdPoints = opponentDC.jdPoints;

        const rounds = matchData.rounds;
        const lastCompleted = rounds.filter((r) => r.winner);
        const lastMapName = lastCompleted[lastCompleted.length - 1]?.mapName ||
            lastCompleted[lastCompleted.length - 2]?.mapName ||
            lastCompleted[lastCompleted.length - 3]?.mapName ||
            "";

        const songComponent = {
            __class: "JD_CarouselContentComponent_Song",
            mapName: lastMapName,
        };

        const RESULT_NONE = 0, RESULT_VICTORY = 1, RESULT_DEFEAT = 2;
        const matchComponent: any = {
            __class: "JD_CarouselContentComponent_Match",
            matchId: matchId.substring(3),
            taggedAsCanceled: matchData.taggedAsCanceled || false,
            taggedAsExpired: false,
            taggedAsNew: (history.previousUpdateTime || 0) < (matchData.updationTime || 0),
        };

        if (matchState !== "completed") {
            matchComponent.resultType = RESULT_NONE;
            if (matchState === "playerTurn") {
                matchComponent.tauntMessageId = matchData.tauntId || 0;
            }
        } else {
            if (matchData.taggedAsCanceled) {
                matchComponent.resultType = pid === matchData.canceledBy ? RESULT_DEFEAT : RESULT_VICTORY;
            } else {
                const roundsWon = rounds.reduce((count, r) => {
                    return r.winner === pid ? count + 1 : count;
                }, 0);
                matchComponent.resultType = roundsWon < 2 ? RESULT_DEFEAT : RESULT_VICTORY;
            }
        }

        let lastUgcId: string | null = null;
        matchComponent.roundsInfos = rounds
            .filter((r) => r.winner)
            .map((r) => {
                if (r.ugcId) lastUgcId = r.ugcId;
                return {
                    __class: "DisplayableRoundInfos",
                    mapName: r.mapName,
                    timestamp: r.creationTime,
                    dancerProfileId: r.dancer,
                    dancerSongScore: r.dancerScore,
                    ugcSongScore: r.ugcScore,
                    aborted: !!r.aborted,
                };
            });

        matchComponent.videoThumbnailUrl = lastUgcId
            ? `${config.UGC_S3.FQDN}/${config.ENV.toLowerCase()}/ugc/${lastUgcId}/challenge_t0_m0.jpg`
            : "";

        return {
            __class: "Item",
            isc: "videochallenge_item_match",
            act: "ui_component_base",
            components: [matchComponent, dancerComponent, songComponent],
            actionList: actionListName,
        };
    }

    let matchList: string[] = [];
    const listContainer = (history.data as any)?.[matchType];

    if (matchState === "completed") {
        matchList = (listContainer?.completed || []).filter((id: string) => matchDocs[id]);
    } else {
        matchList = (listContainer?.inProgress || []).filter((id: string) => {
            if (!matchDocs[id]) return false;
            const rounds = matchDocs[id].rounds;
            const lastCompletedRound = rounds.filter((r) => r.winner).pop();
            if (!lastCompletedRound) return false;

            if (matchState === "waitingTurn" && lastCompletedRound.dancer === pid) return true;
            if (matchState === "playerTurn" && lastCompletedRound.dancer !== pid) return true;
            return false;
        });
    }

    const matchItems = matchList.map(createMatchItem);

    if (matchType === "ranked" && matchState === "playerTurn") {
        matchItems.unshift({
            __class: "Item",
            isc: "videochallenge_item_new_ranked_match",
            act: "ui_component_base",
            components: [{ __class: "JD_CarouselContentComponent_NewRankedMatch" }],
            actionList: actionListName,
        });
    }

    actionLists[actionListName] = actions;
    return { items: matchItems, actionLists };
}

/**
 * Queries UGC collection for a player's challenge scores grouped by map.
 */
async function getChallengesByMapForPid(options: {
    pid: string;
    gameVersion: string;
}): Promise<Record<string, any[]>> {
    const ugcs = await UgcModel.find({
        profileId: options.pid,
        type: "ch",
        gameVersion: options.gameVersion,
        deleted: { $ne: 1 },
        approved: 1,
    })
        .sort({ time: -1 })
        .lean();

    const challengesByMap: Record<string, any[]> = {};
    ugcs.forEach((ugc) => {
        const mapName = ugc.mapName || "";
        if (!challengesByMap[mapName]) challengesByMap[mapName] = [];
        if (ugc.content && Object.keys(ugc.content).length > 0) {
            // Has video: value = [mapName, score, hasVideo, ugcId]
            challengesByMap[mapName].push({
                id: `ugc/${ugc.ugcId}`,
                value: [mapName, ugc.score || 0, 1, ugc.ugcId],
            });
        } else {
            // No video: value = [mapName, score, hasVideo, ugcId]
            challengesByMap[mapName].push({
                id: `ugc/${ugc.ugcId}`,
                value: [mapName, ugc.score || 0, 0, ugc.ugcId],
            });
        }
    });

    return challengesByMap;
}

/**
 * Picks a challenge for the next round.
 */
async function getChallengeForNextRound(options: {
    pid: string;
    gameVersion: string;
    type: "friendly" | "ranked";
    match?: IMatch;
    opponentPid?: string;
    ugcId?: string;
    availableSongs?: string[];
}): Promise<{ ugcId: string; opponentPid: string } | null> {
    if (options.type === "friendly") {
        if (options.ugcId) return { ugcId: options.ugcId, opponentPid: options.opponentPid || "" };

        // Avoid maps already played in this match
        const mapsToAvoid: string[] = [];
        if (options.match) {
            options.match.rounds.forEach((round) => {
                if (round.dancer === options.pid && round.mapName) {
                    mapsToAvoid.push(round.mapName);
                }
            });
        }

        const challengesByMap = await getChallengesByMapForPid({
            pid: options.opponentPid || "",
            gameVersion: options.gameVersion,
        });

        // Filter out maps to avoid and songs not available
        Object.keys(challengesByMap).forEach((map) => {
            if (mapsToAvoid.indexOf(map) !== -1 ||
                (options.availableSongs && options.availableSongs.indexOf(map) === -1)) {
                delete challengesByMap[map];
            }
        });

        const maps = Object.keys(challengesByMap);
        if (maps.length === 0) return null;

        const map = maps[Math.floor(Math.random() * maps.length)];
        const challenges = challengesByMap[map];
        return { ugcId: challenges[0].id.substring(4), opponentPid: options.opponentPid || "" };
    }

    // Ranked: return dummy for now
    return { ugcId: "dummyId", opponentPid: "dummyOpponentPid" };
}

/**
 * Updates match history when match state changes.
 */
function updateMatchInHistory(options: {
    history: { data: any; dirty: boolean };
    type: "ranked" | "friendly";
    matchId: string;
    match: IMatch;
}) {
    const { history, type, matchId, match } = options;
    const listContainer = history.data[type];

    function removeMatchFromList(list: "inProgress" | "completed") {
        const idx = listContainer[list].indexOf(matchId);
        if (idx !== -1) listContainer[list].splice(idx, 1);
    }

    function addMatchToList(list: "inProgress" | "completed") {
        listContainer[list].unshift(matchId);
    }

    switch (match.state) {
        case STATE_UPDATEPENDING:
            history.data.updatePending = matchId;
            removeMatchFromList("inProgress");
            history.dirty = true;
            break;
        case STATE_INPROGRESS:
            history.data.updatePending = null;
            removeMatchFromList("inProgress");
            addMatchToList("inProgress");
            history.dirty = true;
            break;
        case STATE_COMPLETED:
            history.data.updatePending = null;
            removeMatchFromList("inProgress");
            removeMatchFromList("completed");
            addMatchToList("completed");
            if (listContainer.completed.length > COMPLETED_MATCH_LIMIT) {
                listContainer.completed = listContainer.completed.slice(0, COMPLETED_MATCH_LIMIT);
            }
            history.dirty = true;
            break;
    }
}

/**
 * Cancels a pending round (aborts it).
 */
async function cancelPendingRound(options: {
    pid: string;
    history: { data: any; dirty: boolean };
    matchDocs: Record<string, IMatch>;
}) {
    const { pid, history, matchDocs } = options;
    const pendingMatchId = history.data.updatePending;
    const matchDoc = pendingMatchId ? matchDocs[pendingMatchId] : null;

    if (matchDoc) {
        const lastRound = matchDoc.rounds[matchDoc.rounds.length - 1];
        if (lastRound.winner) {
            logger.warn({
                message: "History has an incorrectly pending document!",
                details: { pid, matchId: pendingMatchId },
            });
            history.data.updatePending = null;
            history.dirty = true;
            return;
        }

        if (lastRound.dancer !== pid) {
            throw new Error("Cannot cancel another user's round");
        }

        if (matchDoc.rounds.length === 1) {
            delete matchDocs[pendingMatchId];
            history.data.updatePending = null;
            history.dirty = true;
            await MatchModel.deleteOne({ matchId: pendingMatchId }).catch(() => {});
            return;
        }

        lastRound.aborted = true;
        lastRound.winner = matchDoc.challengers[0] !== pid ? matchDoc.challengers[0] : matchDoc.challengers[1];
        lastRound.dancerScore = 0;
        lastRound.ugcScore = 0;
        matchDoc.state = isMatchCompleted(matchDoc.rounds) ? STATE_COMPLETED : STATE_INPROGRESS;
        matchDoc.updationTime = Math.floor(Date.now() / 1000);

        await MatchModel.updateOne({ matchId: pendingMatchId }, { $set: matchDoc });
    } else {
        if (pendingMatchId) {
            await MatchModel.deleteOne({ matchId: pendingMatchId }).catch(() => {});
            history.data.updatePending = null;
            history.dirty = true;
        }
    }
}

/**
 * Updates match history by syncing with current match states and redis transactions.
 */
async function updateMatchHistory(options: {
    pid: string;
    history: { data: any; dirty: boolean };
    matchType: "ranked" | "friendly";
}) {
    const { pid, history, matchType } = options;
    const redis = getRedisClient();

    // Get pending redis transactions for this user
    const rawTransactions = await redis.lRange(`matches:transactions:${pid}`, 0, -1);
    const redisTransactions = rawTransactions.map((t: string) => JSON.parse(t));

    // Collect all match IDs from history + transactions
    const listContainer = history.data[matchType];
    let matchList: string[] = [
        ...(listContainer?.inProgress || []),
        ...(listContainer?.completed || []),
    ];
    if (history.data.updatePending) matchList.push(history.data.updatePending);
    redisTransactions.forEach((t: any) => matchList.push(t.matchId));

    // Fetch all match docs
    const matchDocs = await getMatchDocs(matchList);

    // Cancel pending round if needed
    await cancelPendingRound({ pid, history, matchDocs });

    // Update match states in history
    const now = Math.floor(Date.now() / 1000);
    for (const matchId of Object.keys(matchDocs)) {
        const matchData = matchDocs[matchId];
        if (matchData.updationTime >= (history.data.lastUpdateTime || 0) && matchData.updationTime <= now) {
            let matchStateWasPending = false;
            if (matchData.state === STATE_UPDATEPENDING) {
                matchStateWasPending = true;
                matchData.state = STATE_INPROGRESS;
            }

            updateMatchInHistory({ history, type: matchType, matchId, match: matchData });

            // Edge case: if the pending match's last round was started by this user but never completed
            if (matchStateWasPending && matchData.rounds.length > 0) {
                const lastRound = matchData.rounds[matchData.rounds.length - 1];
                if (lastRound.dancer === pid && !lastRound.winner) {
                    matchData.rounds.pop();
                    await MatchModel.updateOne({ matchId }, { $set: { rounds: matchData.rounds } });
                }
            }
        }
    }

    history.data.lastUpdateTime = now;

    // Pop the redis transactions we processed
    if (redisTransactions.length > 0) {
        await redis.lTrim(`matches:transactions:${pid}`, redisTransactions.length, -1);
    }
}

/**
 * Persists match and history documents.
 */
async function persistDocs(options: {
    matchId?: string;
    match?: IMatch;
    history: { data: any; dirty: boolean };
    pid: string;
    skipMatchUpdate?: boolean;
    redisTransaction?: { opponentId: string; data: any };
}) {
    const { matchId, match, history, pid, skipMatchUpdate, redisTransaction } = options;

    if (match && !skipMatchUpdate && matchId) {
        await MatchModel.updateOne({ matchId }, { $set: match }, { upsert: true });
    }

    if (history.dirty && history.data) {
        await MatchHistoryModel.updateOne({ pid }, { $set: history.data }, { upsert: true });
    }

    if (redisTransaction) {
        const redis = getRedisClient();
        await redis.rPush(
            `matches:transactions:${redisTransaction.opponentId}`,
            JSON.stringify(redisTransaction.data),
        );
    }
}

// ─── Public API ──────────────────────────────────────────────────────────────

async function createNewMatch(options: {
    pid: string;
    type: "ranked" | "friendly";
    ugcId?: string;
    opponentPid?: string;
    gameVersion: string;
    platform?: string;
    availableSongs?: string[];
}): Promise<Record<string, any>> {
    const { pid, type, ugcId, opponentPid, gameVersion, availableSongs } = options;
    const matchId = `mt/${uuidv4()}`;

    const matchDoc: any = {
        challengers: [],
        rounds: [],
        tauntId: 0,
        creationTime: 0,
        updationTime: 0,
        type: type === "friendly" ? TYPE_FRIENDLY : TYPE_RANKED,
        state: STATE_UPDATEPENDING,
    };

    const { history } = await getMatchHistory(pid, opponentPid);

    await cancelPendingRound({ pid, history, matchDocs: {} });

    // Validate limits
    const listContainer = history.data[type];
    if (listContainer.inProgress.length > INPROGRESS_MATCH_LIMIT) {
        return formatMatchInfoForClient({ errorCode: ERROR_TOO_MANY_INPROGRESS_LOCAL });
    }
    if (options.opponentPid) {
        const { history: oppHistory } = await getMatchHistory(opponentPid!);
        const oppList = oppHistory.data[type];
        if (oppList && oppList.inProgress.length > INPROGRESS_MATCH_LIMIT) {
            return formatMatchInfoForClient({ errorCode: ERROR_TOO_MANY_INPROGRESS_REMOTE });
        }

        // Check if match already exists with this opponent
        if (listContainer.inProgress.length > 0) {
            const existingMatches = await getMatchDocs(listContainer.inProgress);
            const hasExisting = Object.values(existingMatches).some((m) =>
                m.challengers.indexOf(opponentPid!) !== -1
            );
            if (hasExisting) {
                return formatMatchInfoForClient({ errorCode: ERROR_MATCH_EXISTING_WITH_USER });
            }
        }
    }

    // Get a challenge for the first round
    const challenge = await getChallengeForNextRound({
        pid,
        gameVersion,
        type,
        ugcId,
        opponentPid,
        availableSongs,
    });

    if (!challenge) {
        throw new Error("Could not find any UGC for rematch");
    }

    const now = Math.floor(Date.now() / 1000);
    matchDoc.rounds.push({
        ugcId: challenge.ugcId,
        dancer: pid,
        creationTime: now,
    });
    matchDoc.challengers = [pid, challenge.opponentPid];
    matchDoc.creationTime = now;
    matchDoc.matchId = matchId;

    updateMatchInHistory({ history, type, matchId, match: matchDoc });

    await persistDocs({ matchId, match: matchDoc, history, pid });

    matchDoc.matchId = matchId.substring(3);
    return formatMatchInfoForClient(matchDoc);
}

async function cancelMatch(options: { pid: string; matchId: string }): Promise<Record<string, any>> {
    const { pid, matchId } = options;
    const fullMatchId = `mt/${matchId}`;

    const match = await MatchModel.findOne({ matchId: fullMatchId }).lean();
    if (!match) throw new Error("Match not found");
    if (match.challengers.indexOf(pid) === -1) throw new Error("Cancellation is only possible by a participant");

    const now = Math.floor(Date.now() / 1000);
    const updatedMatch: any = {
        ...match,
        state: STATE_COMPLETED,
        updationTime: now,
        taggedAsCanceled: true,
        canceledBy: pid,
    };

    const { history } = await getMatchHistory(pid);
    updateMatchInHistory({ history, type: match.type === TYPE_FRIENDLY ? "friendly" : "ranked", matchId: fullMatchId, match: updatedMatch });

    await persistDocs({ matchId: fullMatchId, match: updatedMatch, history, pid });

    updatedMatch.matchId = matchId;
    return formatMatchInfoForClient(updatedMatch);
}

async function startRound(options: {
    pid: string;
    platform?: string;
    matchId: string;
    gameVersion: string;
    availableSongs?: string[];
}): Promise<Record<string, any>> {
    const { pid, matchId, gameVersion, availableSongs } = options;
    const fullMatchId = `mt/${matchId}`;

    const match = await MatchModel.findOne({ matchId: fullMatchId }).lean();
    if (!match) throw new Error("Match not found");
    if (match.state !== STATE_INPROGRESS) throw new Error("Cannot start-round; match not in STATE_INPROGRESS");

    const rounds = match.rounds;
    if (rounds.length === 0) throw new Error("Invalid call to start-round");
    if (!rounds[rounds.length - 1].winner) throw new Error("Cannot start-round before finalizing the last round");
    if (rounds[rounds.length - 1].dancer === pid) throw new Error("Player cannot play two consecutive rounds");

    const opponentPid = match.challengers[0] !== pid ? match.challengers[0] : match.challengers[1];
    const type = match.type === TYPE_RANKED ? "ranked" : "friendly";

    const challenge = await getChallengeForNextRound({
        pid,
        gameVersion,
        type,
        match: match as any,
        opponentPid,
        availableSongs,
    });

    const updatedRounds = [...rounds, {
        ugcId: challenge?.ugcId || null,
        dancer: pid,
        creationTime: Math.floor(Date.now() / 1000),
    }];
    const updatedMatch: any = {
        ...match,
        rounds: updatedRounds,
        state: STATE_UPDATEPENDING,
    };

    const { history } = await getMatchHistory(pid);
    if (challenge) {
        updateMatchInHistory({ history, type, matchId: fullMatchId, match: updatedMatch });
    }

    await persistDocs({
        matchId: fullMatchId,
        match: updatedMatch,
        history,
        pid,
        skipMatchUpdate: !challenge,
    });

    updatedMatch.matchId = matchId;
    return formatMatchInfoForClient(updatedMatch);
}

async function finalizeRound(options: {
    pid: string;
    matchId: string;
    dancerScore: number;
    tauntId: number;
}): Promise<Record<string, any>> {
    const { pid, matchId, dancerScore, tauntId } = options;
    const fullMatchId = `mt/${matchId}`;

    const match = await MatchModel.findOne({ matchId: fullMatchId }).lean();
    if (!match) throw new Error("Match not found");

    const { history } = await getMatchHistory(pid);
    const lastRound = match.rounds[match.rounds.length - 1];

    if (match.state !== STATE_UPDATEPENDING ||
        lastRound.dancer !== pid ||
        history.data.updatePending !== fullMatchId) {
        throw new Error("Unauthorized call to finalize-round");
    }

    // Get the UGC doc
    const ugc = await UgcModel.findOne({ ugcId: lastRound.ugcId }).lean();
    if (!ugc) throw new Error("UGC not found for round");

    const now = Math.floor(Date.now() / 1000);
    lastRound.creationTime = now;
    lastRound.ugcScore = ugc.score || 0;
    lastRound.mapName = ugc.mapName;
    lastRound.dancerScore = dancerScore;
    lastRound.winner = dancerScore > (ugc.score || 0) ? lastRound.dancer : ugc.profileId;

    const type = match.type === TYPE_RANKED ? "ranked" : "friendly";
    const updatedMatch: any = {
        ...match,
        rounds: [...match.rounds.slice(0, -1), lastRound],
        state: isMatchCompleted(match.rounds) ? STATE_COMPLETED : STATE_INPROGRESS,
        tauntId,
        creationTime: match.rounds.length === 1 ? now : match.creationTime,
        updationTime: now,
    };

    let redisTransaction: any = null;
    if (match.rounds.length === 1) {
        const opponentPid = match.challengers[0] !== pid ? match.challengers[0] : match.challengers[1];
        redisTransaction = {
            opponentId: opponentPid,
            data: { transaction: "newMatch", matchId: fullMatchId },
        };
    }

    updateMatchInHistory({ history, type, matchId: fullMatchId, match: updatedMatch });

    await persistDocs({
        matchId: fullMatchId,
        match: updatedMatch,
        history,
        pid,
        redisTransaction,
    });

    updatedMatch.matchId = matchId;
    return formatMatchInfoForClient(updatedMatch);
}

async function getCarouselMatchItems(options: {
    pid: string;
    matchType: "ranked" | "friendly";
    matchState: "playerTurn" | "waitingTurn" | "completed";
    actionListName: string;
    actions: any;
}): Promise<{ items: any[]; actionLists: Record<string, any> }> {
    const { pid, matchType, matchState, actionListName, actions } = options;

    const { history } = await getMatchHistory(pid);
    await updateMatchHistory({ pid, history, matchType });

    // Persist updated history
    await persistDocs({ pid, history });

    const listContainer = history.data[matchType];
    const matchIds: string[] = [];
    if (matchState === "completed") {
        matchIds.push(...(listContainer?.completed || []));
    } else {
        matchIds.push(...(listContainer?.inProgress || []));
        if (history.data.updatePending) matchIds.push(history.data.updatePending);
    }

    const matchDocs = await getMatchDocs(matchIds);
    const opponentDCs = await getOpponentProfiles(pid, matchDocs);

    return getMatchItems({
        pid,
        matchType,
        matchState,
        actionListName,
        actions,
        matchDocs,
        opponentDCs,
        history,
    });
}

export default {
    getCarouselMatchItems,
    createNewMatch,
    cancelMatch,
    startRound,
    finalizeRound,
    getChallengesByMapForPid,
};
