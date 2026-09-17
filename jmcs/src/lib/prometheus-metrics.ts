import promClient from "prom-client";
import os from "node:os";

import { getStore } from "./metrics-store";
import liveClient from "./live-client";

// Collect default metrics (event loop lag, GC, memory, etc.)
promClient.collectDefaultMetrics();

// ── HTTP request counters ────────────────────────────────────────────

export const httpRequestsTotal = new promClient.Counter({
    name: "jmcs_http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "path", "status"],
});

export const httpRequestDuration = new promClient.Histogram({
    name: "jmcs_http_request_duration_ms",
    help: "HTTP request duration in milliseconds",
    labelNames: ["method", "path", "status"],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 3000],
});

// ── SKU counters ────────────────────────────────────────────────────

export const skuLookups = new promClient.Counter({
    name: "jmcs_sku_lookups_total",
    help: "Total SKU lookups",
    labelNames: ["result"], // hit | miss
});

export const skuRejections = new promClient.Counter({
    name: "jmcs_sku_rejections_total",
    help: "Total SKU rejections",
    labelNames: ["reason"], // missing | invalid | unavailable | appId_mismatch
});

// ── Ticket counters ──────────────────────────────────────────────────

export const ticketLookups = new promClient.Counter({
    name: "jmcs_ticket_lookups_total",
    help: "Total ticket lookups",
    labelNames: ["result"], // hit | miss
});

export const ticketRejections = new promClient.Counter({
    name: "jmcs_ticket_rejections_total",
    help: "Total ticket rejections",
    labelNames: ["reason"], // missing | invalid | cache_unavailable | expired
});

// ── Ping counter ─────────────────────────────────────────────────────

export const pingHits = new promClient.Counter({
    name: "jmcs_ping_hits_total",
    help: "Total ping hits",
});

// ── Cheat counter ────────────────────────────────────────────────────

export const cheatTotal = new promClient.Counter({
    name: "jmcs_cheat_total",
    help: "Total cheat detections",
});

// ── Gauges ───────────────────────────────────────────────────────────

export const skuCount = new promClient.Gauge({
    name: "jmcs_sku_count",
    help: "Number of loaded SKUs",
});

export const memoryGauge = new promClient.Gauge({
    name: "jmcs_memory_bytes",
    help: "Process memory usage in bytes",
    labelNames: ["type"], // rss | heapUsed | heapTotal | external
});

export const cpuGauge = new promClient.Gauge({
    name: "jmcs_cpu_usage_ms",
    help: "CPU usage in milliseconds",
    labelNames: ["type"], // user | system
});

export const uptimeGauge = new promClient.Gauge({
    name: "jmcs_uptime_seconds",
    help: "Server uptime in seconds",
});

export const infoGauge = new promClient.Gauge({
    name: "jmcs_info",
    help: "Static build info (pid, node_version, env — value=1)",
    labelNames: ["pid", "node_version", "env"],
});

// ── Live / CCU gauge ────────────────────────────────────────────────

export const liveCcu = new promClient.Gauge({
    name: "jmcs_live_ccu",
    help: "Concurrent live players (CCU)",
});

/**
 * Scrapes the in-memory store and updates prometheus metrics.
 * Call this before every /metrics scrape so counters stay in sync.
 */
export async function syncStoreToPrometheus() {
    const store = getStore();
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();

    // Memory
    memoryGauge.set({ type: "rss" }, mem.rss);
    memoryGauge.set({ type: "heapUsed" }, mem.heapUsed);
    memoryGauge.set({ type: "heapTotal" }, mem.heapTotal);
    memoryGauge.set({ type: "external" }, mem.external);

    // CPU
    cpuGauge.set({ type: "user" }, cpu.user);
    cpuGauge.set({ type: "system" }, cpu.system);

    // Uptime
    uptimeGauge.set(process.uptime());

    // Info — set once
    infoGauge.set(
        { pid: String(process.pid), node_version: process.version, env: process.env.NODE_ENV ?? "unknown" },
        1
    );

    // SKU count
    const skusInfo = require("./skus").default?.info;
    skuCount.set(skusInfo ? Object.keys(skusInfo).length : 0);

    // Live CCU
    const ccu = await liveClient.getLiveCount();
    liveCcu.set(ccu);
}
