import os from "node:os";

import cache from "./cache";
import cacheKeys from "./cache-keys";
import { getStore } from "./metrics-store";
import skusLib from "./skus";

/**
 * Returns a full system + app metrics snapshot as a plain object.
 * Consumed by the GET /metrics endpoint.
 */
export async function getMetricsSnapshot() {
    const store = getStore();
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    const skus = skusLib.info;

    return {
        timestamp: new Date().toISOString(),
        uptime: {
            seconds: process.uptime(),
            human: formatUptime(process.uptime()),
        },
        memory: {
            rss: toMB(mem.rss),
            heapUsed: toMB(mem.heapUsed),
            heapTotal: toMB(mem.heapTotal),
            external: toMB(mem.external),
        },
        cpu: {
            userMs: (cpu.user / 1000).toFixed(2),
            systemMs: (cpu.system / 1000).toFixed(2),
        },
        os: {
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            loadAvg: os.loadavg(),
            totalMemoryMB: toMB(os.totalmem()),
            freeMemoryMB: toMB(os.freemem()),
            cpuCount: os.cpus().length,
        },
        process: {
            pid: process.pid,
            version: process.version,
            env: process.env.NODE_ENV ?? "unknown",
        },
        cache: {
            skusLoaded: skus !== null,
            skuCount: skus ? Object.keys(skus).length : 0,
        },
        requests: store.requests,
        skus: store.skus,
        tickets: store.tickets,
        pings: store.pings,
        cheats: store.cheats
    };
}

const toMB = (bytes: number) => parseFloat((bytes / 1024 / 1024).toFixed(2));

const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
};