/**
 * In-memory store for runtime metrics.
 * Resets on server restart — use Loki for persistence.
 */

import {
    skuLookups,
    skuRejections,
    ticketLookups,
    ticketRejections,
    pingHits,
    cheatTotal,
} from "./prometheus-metrics";

interface HttpMetric {
    method: string;
    path: string;
    status: number;
    latencyMs: number;
    ip: string;
    skuId?: string;
    timestamp: string;
}

interface SkuMetric {
    skuId: string;
    ip: string;
    appId?: string;
    skuAppId?: string;
    reason: "missing" | "invalid" | "unavailable" | "appId_mismatch";
    timestamp: string;
}

interface TicketMetric {
    ip: string;
    userId?: string;
    profileId?: string;
    sessionId?: string;
    platform?: string;
    type?: string;
    originalUrl?: string;
    ticket?: string;
    timestamp: string;
    reason: "missing" | "invalid" | "cache_unavailable" | "expired";
}

interface CheatMetric {
    profileId: string;
    nickname: string;
    mapName: string;
    score: number;
    sku: string;
    timestamp: string;
}

interface MetricsStore {
    requests: {
        total: number;
        successful: number;
        failed: number;
        byStatus: Record<number, number>;
        byPath: Record<string, number>;
        recentErrors: HttpMetric[];
    };
    skus: {
        lookups: number;
        hits: number;
        misses: number;
        rejections: SkuMetric[];
    };
    tickets: {
        lookups: number;
        hits: number;
        misses: number;
        rejections: TicketMetric[];
    };
    pings: {
        hits: number;
    };
    cheats: {
        total: number;
        recent: CheatMetric[];
    };
}

const store: MetricsStore = {
    requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byStatus: {},
        byPath: {},
        recentErrors: [],
    },
    skus: {
        lookups: 0,
        hits: 0,
        misses: 0,
        rejections: [],
    },
    tickets: {
        lookups: 0,
        hits: 0,
        misses: 0,
        rejections: [],
    },
    pings: {
        hits: 0
    },
    cheats: {
        total: 0,
        recent: []
    }
};

const MAX_RECENT = 50; // cap recent error lists

export function recordRequest(metric: HttpMetric) {
    store.requests.total++;
    metric.status < 400 ? store.requests.successful++ : store.requests.failed++;
    store.requests.byStatus[metric.status] = (store.requests.byStatus[metric.status] ?? 0) + 1;
    store.requests.byPath[metric.path] = (store.requests.byPath[metric.path] ?? 0) + 1;

    if (metric.status >= 400) {
        store.requests.recentErrors.unshift(metric);
        if (store.requests.recentErrors.length > MAX_RECENT)
            store.requests.recentErrors.pop();
    }
}

export function recordSkuRejection(rejection: SkuMetric) {
    store.skus.lookups++;
    store.skus.misses++;
    store.skus.rejections.unshift(rejection);
    if (store.skus.rejections.length > MAX_RECENT)
        store.skus.rejections.pop();

    skuLookups.inc({ result: "miss" });
    skuRejections.inc({ reason: rejection.reason });
}

export function recordSkuHit() {
    store.skus.lookups++;
    store.skus.hits++;
    skuLookups.inc({ result: "hit" });
}

export function recordTicketRejection(rejection: TicketMetric) {
    store.tickets.lookups++;
    store.tickets.misses++;
    store.tickets.rejections.unshift(rejection);
    if (store.tickets.rejections.length > MAX_RECENT)
        store.tickets.rejections.pop();

    ticketLookups.inc({ result: "miss" });
    ticketRejections.inc({ reason: rejection.reason });
}

export function recordTicketHit() {
    store.tickets.lookups++;
    store.tickets.hits++;
    ticketLookups.inc({ result: "hit" });
}

export function recordPingHit() {
    store.pings.hits++;
    pingHits.inc();
}

export function recordCheat(cheat: CheatMetric) {
    store.cheats.total++;
    store.cheats.recent.unshift(cheat);
    if (store.cheats.recent.length > MAX_RECENT)
        store.cheats.recent.pop();
    cheatTotal.inc();
}

export function getStore(): Readonly<MetricsStore> {
    return store;
}