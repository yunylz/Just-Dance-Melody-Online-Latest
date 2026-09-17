import { Express, Request, Response, Router } from 'express';
import winston from 'winston';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recordPingHit } from '../lib/metrics-store';
import liveClient from '../lib/live-client';
import { backOfficeTicketRequired, ticketRequired } from '../lib/harbour-ticket-client';
import skus from '../lib/skus';
import config from '../config';
import httpMiddleware from '../lib/http-middleware';
import songs from '../lib/songs';
import profiles from '../lib/profiles';
import tracking from '../lib/tracking';
import utils from '../lib/utils';

// Capture boot time when server starts
const bootTime = Date.now();

// Read Git info embedded at build time (used in Docker containers where Git is unavailable)
function getGitInfo(): { revision: string; branch: string; deploymentTime: number } {
    // Try git-info.json first (embedded during Docker build)
    try {
        const filePath = join(__dirname, '..', '..', 'git-info.json');
        return JSON.parse(readFileSync(filePath, 'utf8'));
    } catch {
        // Not available — continue to fallbacks
    }

    // Fallback: try Git CLI commands
    try {
        const revision = execSync('git rev-parse --short HEAD').toString().trim();
        const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
        let deploymentTime = 0;
        try {
            const timestamp = execSync('git log -1 --format=%ct').toString().trim();
            deploymentTime = parseInt(timestamp) * 1000;
        } catch {}
        return { revision, branch, deploymentTime };
    } catch {
        return { revision: "unknown", branch: "unknown", deploymentTime: 0 };
    }
}

export default (app: Express, publicRouter: Router, privateRouter: Router, logger: winston.Logger) => {

    /**
     * GET /ping
     * Ping endpoint to check if the server is up and running.
     */
    publicRouter.get("/ping", (req: Request, res: Response) => {
        const isDocker = req.query.isDocker && req.query.isDocker == "true";

        // Don't record ping hit if it's not from a Docker container (to avoid skewing metrics)
        if (!isDocker) recordPingHit();

        return res.end();
    });

    publicRouter.get("/ccu", async (_req: Request, res: Response) => {
        const ccu = await liveClient.getLiveCount();
        return res.send(`${ccu}`);
    });

    publicRouter.get("/languages", (_req: Request, res: Response) => {
        return res.send(config.LANGUAGES);
    });

    publicRouter.get("/skus", httpMiddleware.isS2s, (_req: Request, res: Response) => {
        return res.send(skus.info);
    });

    publicRouter.get("/stats", httpMiddleware.isS2s, async (_req: Request, res: Response) => {
        const ccu = await liveClient.getLiveCount();
        const wdfCcu = 0; // TODO: do wdfCCU
        const songCount = await songs.getSongCount();
        const playerCount = await profiles.getProfileCount();
        const songsPlayed = await tracking.getPlayCount();

        return res.send({
            livePlayers: ccu,
            songCount,
            playerCount,
            songsPlayed
        });
    });

    /**
     * GET /info
     * Info endpoint to provide details about the server's boot time, Git revision, branch, and deployment time.
     */
    publicRouter.get("/info", (_req: Request, res: Response) => {
        const gitInfo = getGitInfo();
        return res.json({
            bootTime,
            revision: gitInfo.revision,
            branch: gitInfo.branch,
            deploymentTime: gitInfo.deploymentTime,
            environment: process.env.NODE_ENV,
            version: utils.getProjectVersion()
        });
    });
};