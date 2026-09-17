"use strict";

// ─── Inline SVG icons (used in JS-generated HTML where Lucide CDN can't auto-init) ─
const SVG = {
    x: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    edit: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    inbox: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
    chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
    chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
    plus: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
};


// ─── Auth ─────────────────────────────────────────────────────────────────────

const TOKEN_KEY = "harbour_jwt";

function getToken() {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('harbour_jwt='))?.split('=')[1];
    return cookie || localStorage.getItem(TOKEN_KEY);
}

function authHeaders() {
    return { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` };
}

async function api(method, path, body) {
    const opts = { method, headers: authHeaders() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`/v1/admin${path}`, opts);
    if (res.status === 401) { logout(); return null; }
    return res.json();
}

function logout() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/v1/admin/logout";
}

async function loadUserInfo() {
    const data = await api("GET", "/auth/me");
    if (data?.ok && data.user) {
        const u = data.user;
        const profileEl = document.getElementById("user-profile");
        if (!profileEl) return;

        profileEl.style.display = "flex";
        document.getElementById("user-name").textContent = u.name || u.email.split("@")[0];
        document.getElementById("user-email").textContent = u.email;

        if (u.picture) {
            document.getElementById("user-avatar").innerHTML = `<img src="${u.picture}" onerror="this.parentElement.textContent='${(u.name || u.email).charAt(0).toUpperCase()}'">`;
        } else {
            document.getElementById("user-avatar").textContent = (u.name || u.email).charAt(0).toUpperCase();
        }
    }
}

// Guard — redirect to login if no valid token
(async function guard() {
    const t = getToken();
    if (!t) return logout();
    try {
        const payload = JSON.parse(atob(t.split(".")[1]));
        if (payload.exp * 1000 < Date.now()) return logout();
        await loadUserInfo();
    } catch { logout(); }
})();

// ─── Toast ───────────────────────────────────────────────────────────────────

function toast(msg, type = "info") {
    const c = document.getElementById("toasts");
    const t = document.createElement("div");
    const icon = type === "success" ? SVG.check : type === "error" ? SVG.x : SVG.info;
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3800);
}

// ─── Navigation ───────────────────────────────────────────────────────────────

const PAGE_META = {
    sessions: { title: "Sessions", subtitle: "Active player sessions" },
    apps: { title: "Applications", subtitle: "Registered apps & platform config" },
    spaces: { title: "Spaces", subtitle: "Brand → Installment → Title hierarchy" },
    entities: { title: "Entities", subtitle: "Space entity data" },
    config: { title: "Configuration", subtitle: "Full app configuration JSON" },
    tickets: { title: "Ticket Tools", subtitle: "Decrypt and create Harbour tickets" }
};

async function navigate(el) {
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    el.classList.add("active");
    const page = el.dataset.page;
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(`page-${page}`).classList.add("active");
    const meta = PAGE_META[page];
    document.getElementById("page-title").textContent = meta.title;
    document.getElementById("page-subtitle").textContent = meta.subtitle;
    if (page === "sessions") { await loadApps(); await loadSessions(); }
    if (page === "apps") await loadApps();
    if (page === "spaces") await loadSpaces();
    if (page === "entities") await loadEntitySpaceSelect();
    if (page === "config") await loadConfigAppSelect();
    if (page === "parameters") await loadParametersTargetSelect();
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

document.addEventListener("keydown", e => {
    if (e.key === "Escape") document.querySelectorAll(".modal-overlay:not(.hidden)").forEach(m => m.classList.add("hidden"));
});

// ─── Sessions ─────────────────────────────────────────────────────────────────

let allSessions = [];

async function loadSessions() {
    const data = await api("GET", "/sessions");
    if (!data) return;
    allSessions = data.sessions || [];
    document.getElementById("session-count").textContent = allSessions.length;
    document.getElementById("stat-sessions").textContent = allSessions.length;
    renderSessions();
}

function renderSessions() {
    const tbody = document.getElementById("sessions-tbody");
    if (!allSessions.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">${SVG.inbox}<p>No active sessions</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = allSessions.map(s => {
        const expiresAt = new Date(s.expiration).getTime();
        const createdAt = s.createdAt ? new Date(s.createdAt) : null;
        const platBadge = platformBadge(s.platform);

        const username = s.user?.username || s.userId.split("-")[0];
        const fullName = (s.user?.firstName && s.user?.lastName) ? `${s.user.firstName} ${s.user.lastName}` : (s.user?.firstName || "");
        const userAvatar = s.user?.picture ? `<img src="${s.user.picture}" class="session-avatar">` : `<div class="session-avatar-placeholder">${username.charAt(0).toUpperCase()}</div>`;

        const app = allApps.find(a => a.appId === s.appId);
        const appName = app ? app.name : "Unknown App";

        return `
        <tr>
            <td><code style="font-size:11px;color:var(--text-3)">${s.sessionId.slice(0, 8)}…</code></td>
            <td>
                <div class="flex items-center gap-2">
                    ${userAvatar}
                    <div class="flex flex-direction-column">
                        <div style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px">
                            ${username}
                            ${s.user?.status?.admin ? '<span class="badge badge-purple" style="font-size:8px;padding:0 4px">ADMIN</span>' : ''}
                        </div>
                        <div style="font-size:11px;color:var(--text-2)">${fullName} ${s.user?.email ? `• ${s.user.email}` : ''}</div>
                    </div>
                </div>
            </td>
            <td>${platBadge}</td>
            <td>
                <div class="flex flex-direction-column" title="${s.appId}">
                    <div style="font-weight:500;font-size:12px">${appName}</div>
                    <code style="font-size:10px;color:var(--text-3)">${s.appId.slice(0, 13)}…</code>
                </div>
            </td>
            <td>
                <div class="flex flex-direction-column">
                    <span class="badge badge-timer" data-expires="${expiresAt}">…</span>
                    ${createdAt ? `<div style="font-size:10px;color:var(--text-3);margin-top:4px">Created: ${createdAt.toLocaleTimeString()}</div>` : ''}
                </div>
            </td>
            <td>
                <div class="flex gap-2">
                    <button class="btn btn-ghost btn-sm" onclick="viewHubUser('${s.userId}')">Hub</button>
                    <button class="btn btn-danger btn-sm btn-icon" onclick="killSession('${s.sessionId}')" title="Kill session">${SVG.x}</button>
                </div>
            </td>
        </tr>`;
    }).join("");
    updateCountdowns();
}

function updateCountdowns() {
    document.querySelectorAll("[data-expires]").forEach(el => {
        const expires = parseInt(el.dataset.expires);
        const diff = expires - Date.now();

        el.classList.remove("badge-green", "badge-purple", "badge-red");

        if (diff <= 0) {
            el.textContent = "expired";
            el.classList.add("badge-red");
        } else {
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            const label = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
            el.textContent = label;
            el.classList.add(diff > 600000 ? 'badge-green' : (diff > 120000 ? 'badge-purple' : 'badge-red'));
        }
    });
}

setInterval(updateCountdowns, 1000);

function viewHubUser(userId) {
    const s = allSessions.find(s => s.userId === userId);
    if (!s || !s.user) {
        toast("User data not available", "error");
        return;
    }
    document.getElementById("hub-user-json").value = JSON.stringify(s.user, null, 4);
    openModal("hub-user-modal-overlay");
}

function platformBadge(p) {
    const colors = { nx: "badge-blue", ps4: "badge-purple", wiiu: "badge-green", ps3: "badge-gray", x360: "badge-gray" };
    return `<span class="badge ${colors[p] || 'badge-gray'}">${(p || "?").toUpperCase()}</span>`;
}

async function killSession(sessionId) {
    if (!confirm("Kill this session?")) return;
    await api("DELETE", `/sessions/${sessionId}`);
    toast("Session killed", "success");
    loadSessions();
}

// ─── Apps ─────────────────────────────────────────────────────────────────────

let allApps = [];
let allPlatforms = [];

async function loadApps() {
    const [appsData, platData] = await Promise.all([api("GET", "/apps"), api("GET", "/platforms")]);
    allApps = appsData?.apps || [];
    allPlatforms = platData?.platforms || [];
    document.getElementById("stat-apps").textContent = allApps.length;
    renderApps();
}

function renderApps() {
    const tbody = document.getElementById("apps-tbody");
    if (!allApps.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">${SVG.inbox}<p>No apps registered</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = allApps.map(a => `
        <tr>
            <td><strong>${a.name}</strong></td>
            <td><code style="font-size:11px;color:var(--text-2)">${a.appId}</code></td>
            <td>${platformBadge(a.platform)}</td>
            <td><code style="font-size:11px;color:var(--text-2)">${a.spaceId || "—"}</code></td>
            <td>${a.uplayGameCode || "—"}</td>
            <td style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-sm" onclick='openAppModal(${JSON.stringify(a).replace(/'/g, "&apos;")})'>${SVG.edit} Edit</button>
                <button class="btn btn-danger btn-sm btn-icon" onclick="deleteApp('${a.appId}')">${SVG.x}</button>
            </td>
        </tr>`).join("");
}

function openAppModal(app = null) {
    document.getElementById("app-modal-title").textContent = app ? "Edit App" : "New App";
    document.getElementById("app-editing-id").value = app?.appId || "";
    document.getElementById("app-appId").value = app?.appId || "";
    document.getElementById("app-name").value = app?.name || "";
    document.getElementById("app-spaceId").value = app?.spaceId || "";
    document.getElementById("app-gameCode").value = app?.uplayGameCode || "";
    document.getElementById("app-buildId").value = app?.buildId || "";
    document.getElementById("app-userAgent").value = app?.userAgent || "";

    const sel = document.getElementById("app-platform");
    sel.innerHTML = allPlatforms.map(p =>
        `<option value="${p.id}" ${app?.platform === p.id ? "selected" : ""}>${p.name} (${p.id})</option>`
    ).join("");
    if (app?.platform) sel.value = app.platform;

    openModal("app-modal-overlay");
}

async function saveApp() {
    const editingId = document.getElementById("app-editing-id").value;
    const payload = {
        appId: document.getElementById("app-appId").value.trim() || undefined,
        name: document.getElementById("app-name").value.trim(),
        platform: document.getElementById("app-platform").value,
        spaceId: document.getElementById("app-spaceId").value.trim() || null,
        uplayGameCode: document.getElementById("app-gameCode").value.trim() || null,
        buildId: document.getElementById("app-buildId").value.trim() || null,
        userAgent: document.getElementById("app-userAgent").value.trim() || null
    };
    if (!payload.name) { toast("Name is required", "error"); return; }

    const res = editingId
        ? await api("PATCH", `/apps/${editingId}`, payload)
        : await api("POST", "/apps", payload);

    if (res?.ok) {
        toast(editingId ? "App updated" : "App created", "success");
        closeModal("app-modal-overlay");
        loadApps();
    } else {
        toast(res?.error || "Failed to save app", "error");
    }
}

async function deleteApp(appId) {
    if (!confirm("Delete this app?")) return;
    const res = await api("DELETE", `/apps/${appId}`);
    if (res?.ok) { toast("App deleted", "success"); loadApps(); }
    else toast(res?.error || "Failed to delete", "error");
}

// ─── Spaces ───────────────────────────────────────────────────────────────────

let allSpaces = [];
let selectedSpaceId = null;
let expandedSpaceIds = new Set();


async function loadSpaces() {
    const data = await api("GET", "/spaces");
    allSpaces = data?.spaces || [];
    document.getElementById("stat-spaces").textContent = allSpaces.length;
    renderSpaceTree();
}

function buildTree(spaces) {
    const map = {};
    spaces.forEach(s => map[s.spaceId] = { ...s, children: [] });
    const roots = [];
    spaces.forEach(s => {
        if (s.parentSpaceId && map[s.parentSpaceId]) {
            map[s.parentSpaceId].children.push(map[s.spaceId]);
        } else {
            roots.push(map[s.spaceId]);
        }
    });
    return roots;
}

function renderSpaceTree() {
    const container = document.getElementById("space-tree");
    const roots = buildTree(allSpaces);
    if (!roots.length) {
        container.innerHTML = `<div class="empty-state" style="padding:20px"><p>No spaces yet</p></div>`;
        return;
    }
    container.innerHTML = "";
    function renderNode(node, depth = 0) {
        const div = document.createElement("div");
        div.className = "tree-node";
        const row = document.createElement("div");
        row.className = `tree-row${selectedSpaceId === node.spaceId ? " selected" : ""}`;

        const isExpanded = expandedSpaceIds.has(node.spaceId);

        row.innerHTML = `
            <span class="tree-toggle tree-toggle-icon">${node.children.length ? (isExpanded ? SVG.chevronDown : SVG.chevronRight) : ""}</span>
            <span class="tree-label truncate">${node.spaceName}</span>`;

        row.onclick = () => selectSpace(node.spaceId);
        div.appendChild(row);

        if (node.children.length) {
            const childWrap = document.createElement("div");
            childWrap.className = "tree-children";
            childWrap.style.display = isExpanded ? "block" : "none";
            node.children.forEach(c => childWrap.appendChild(renderNode(c, depth + 1)));
            div.appendChild(childWrap);

            row.querySelector(".tree-toggle-icon").onclick = e => {
                e.stopPropagation();
                const nowExpanded = childWrap.style.display === "none";
                childWrap.style.display = nowExpanded ? "block" : "none";
                row.querySelector(".tree-toggle-icon").innerHTML = nowExpanded ? SVG.chevronDown : SVG.chevronRight;

                if (nowExpanded) expandedSpaceIds.add(node.spaceId);
                else expandedSpaceIds.delete(node.spaceId);
            };
        }
        return div;
    }
    roots.forEach(r => container.appendChild(renderNode(r)));
}


async function selectSpace(spaceId) {
    selectedSpaceId = spaceId;
    renderSpaceTree();
    const space = allSpaces.find(s => s.spaceId === spaceId);
    if (!space) return;

    loadSpaceEntities(spaceId);
    loadSpacePopulations(spaceId);
    loadSpaceActions(spaceId);
    loadSpaceRewards(spaceId);

    // Reset to details tab
    showSpaceTab('details');

    const card = document.getElementById("space-detail-card");
    card.innerHTML = `
        <div class="card-header">
            <h2>${space.spaceName}</h2>
            <div class="flex gap-2 ml-auto">
                <button class="btn btn-primary btn-sm" onclick="openEventConfigModal('${space.spaceId}')">Events</button>
                <button class="btn btn-ghost btn-sm" onclick='openSpaceModal(${JSON.stringify(space).replace(/'/g, "&apos;")})'>Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteSpace('${space.spaceId}')">Delete</button>
            </div>
        </div>

        <div class="card-body">
            <table class="claims-table" style="width:100%">
                <tbody id="space-details-body">
                    <tr><td>Space ID</td><td><code>${space.spaceId}</code></td></tr>
                    <tr><td>Space Type</td><td><span class="badge badge-purple">${space.spaceType}</span></td></tr>
                    <tr><td>Parent Space</td><td>${space.parentSpaceName || "None"} ${space.parentSpaceId ? `(<code>${space.parentSpaceId}</code>)` : ""}</td></tr>
                    <tr><td>Platform</td><td><span class="badge badge-blue">${space.platformType || "All"}</span></td></tr>
                    <tr><td>Release Type</td><td><span class="badge badge-gray">${space.releaseType || "Prod"}</span></td></tr>
                    <tr><td>Tags</td><td>${(space.tags || []).map(t => `<span class="badge badge-gray">${t}</span>`).join(" ")}</td></tr>
                </tbody>
            </table>

            <div class="space-configs-tabs" style="margin-top:24px; display:flex; gap:16px; border-bottom:1px solid var(--border)">
                <button class="tab-btn active" id="tab-btn-details" onclick="showSpaceTab('details')">Details</button>
                <button class="tab-btn" id="tab-btn-populations" onclick="showSpaceTab('populations')">Populations</button>
                <button class="tab-btn" id="tab-btn-actions" onclick="showSpaceTab('actions')">Actions</button>
                <button class="tab-btn" id="tab-btn-rewards" onclick="showSpaceTab('rewards')">Rewards</button>
                <button class="tab-btn" id="tab-btn-eventsdef" onclick="showSpaceTab('eventsdef')">Events Def</button>
            </div>

            <div id="space-tab-content" style="margin-top:16px">
                <div id="space-tab-details">
                    <div id="space-entities-section">
                        <div class="flex items-center gap-2 mb-3">
                            <h3>Entities</h3>
                            <button class="btn btn-ghost btn-sm ml-auto" onclick="openEntityModal()">
                                ${SVG.plus || '+'} New Entity
                            </button>
                        </div>
                        <div class="table-wrap">
                            <table id="entities-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Revision</th>
                                        <th>Modified</th>
                                        <th style="width:80px"></th>
                                    </tr>
                                </thead>
                                <tbody id="entities-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div id="space-tab-populations" class="hidden">
                    <div class="flex items-center gap-2 mb-3">
                        <h3>Populations</h3>
                        <button class="btn btn-ghost btn-sm ml-auto" onclick="openPopulationModal()">
                            ${SVG.plus || '+'} New Population
                        </button>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Subject</th>
                                    <th>Object</th>
                                    <th style="width:80px"></th>
                                </tr>
                            </thead>
                            <tbody id="populations-body"></tbody>
                        </table>
                    </div>
                </div>

                <div id="space-tab-actions" class="hidden">
                    <div class="flex items-center gap-2 mb-3">
                        <h3>Actions</h3>
                        <button class="btn btn-ghost btn-sm ml-auto" onclick="openActionModal()">
                            ${SVG.plus || '+'} New Action
                        </button>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>XP</th>
                                    <th>Badge</th>
                                    <th style="width:80px"></th>
                                </tr>
                            </thead>
                            <tbody id="actions-body"></tbody>
                        </table>
                    </div>
                </div>

                <div id="space-tab-rewards" class="hidden">
                    <div class="flex items-center gap-2 mb-3">
                        <h3>Rewards</h3>
                        <button class="btn btn-ghost btn-sm ml-auto" onclick="openRewardModal()">
                            ${SVG.plus || '+'} New Reward
                        </button>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>XP</th>
                                    <th>Type</th>
                                    <th style="width:80px"></th>
                                </tr>
                            </thead>
                            <tbody id="rewards-body"></tbody>
                        </table>
                    </div>
                <div id="space-tab-eventsdef" class="hidden">
                    <div class="flex items-center gap-2 mb-3">
                        <h3>Events Definitions</h3>
                        <p style="font-size:12px; color:var(--text-3)">Attributes, compositions, and signals definitions.</p>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:12px">
                        <textarea class="json-editor" id="eventsdef-editor" style="min-height:400px" placeholder="Loading definitions…"></textarea>
                        <div class="flex gap-2">
                             <button class="btn btn-primary btn-sm ml-auto" onclick="saveEventsDef()">
                                <i data-lucide="save" style="width:14px;height:14px"></i>
                                Save Definitions
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

    lucide?.createIcons?.();
}

function showSpaceTab(tabId) {
    const tabs = ['details', 'populations', 'actions', 'rewards', 'eventsdef'];
    tabs.forEach(t => {
        const el = document.getElementById(`space-tab-${t}`);
        const btn = document.getElementById(`tab-btn-${t}`);
        if (el) el.classList.toggle('hidden', t !== tabId);
        if (btn) btn.classList.toggle('active', t === tabId);
    });

    if (tabId === 'eventsdef') loadEventsDef();
}

async function loadEventsDef() {
    const spaceId = selectedSpaceId;
    const editor = document.getElementById("eventsdef-editor");
    if (!editor) return;
    editor.value = "Loading…";
    const res = await api("GET", `/spaces/${spaceId}/eventsDefinitions`);
    if (res) {
        editor.value = JSON.stringify({
            attributes: res.attributes || [],
            compositions: res.compositions || [],
            signals: res.signals || []
        }, null, 4);
    }
}

async function saveEventsDef() {
    const spaceId = selectedSpaceId;
    const editor = document.getElementById("eventsdef-editor");
    try {
        const payload = JSON.parse(editor.value);
        const res = await api("PUT", `/admin/spaces/${spaceId}/eventsDefinitions`, payload);
        if (res?.ok) toast("Events definitions saved", "success");
    } catch (e) {
        toast("Invalid JSON: " + e.message, "error");
    }
}

async function loadSpacePopulations(spaceId) {
    const res = await api("GET", `/spaces/${spaceId}/populations`);
    const body = document.getElementById("populations-body");
    if (!body) return;
    body.innerHTML = "";
    if (res?.populations?.length) {
        res.populations.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${p.name}</td>
                <td><span class="badge badge-blue">${p.subject}</span></td>
                <td><pre style="font-size:10px; max-height:100px; overflow:auto">${JSON.stringify(p.obj, null, 2)}</pre></td>
                <td style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" onclick='openPopulationModal(${JSON.stringify(p).replace(/'/g, "&apos;")})'>${SVG.edit}</button>
                    <button class="btn btn-danger btn-sm btn-icon" onclick="deletePopulation('${p._id}')">${SVG.x}</button>
                </td>
            `;
            body.appendChild(tr);
        });
    } else {
        body.innerHTML = `<tr><td colspan="4" class="empty-state">No populations defined</td></tr>`;
    }
}

async function loadSpaceActions(spaceId) {
    const res = await api("GET", `/spaces/${spaceId}/actions`);
    const body = document.getElementById("actions-body");
    if (!body) return;
    body.innerHTML = "";
    if (res?.actions?.length) {
        res.actions.forEach(a => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><code>${a.id}</code></td>
                <td>${a.name}</td>
                <td>${a.xp}</td>
                <td><span class="badge ${a.isBadge ? 'badge-green' : 'badge-gray'}">${a.isBadge}</span></td>
                <td style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" onclick='openActionModal(${JSON.stringify(a).replace(/'/g, "&apos;")})'>${SVG.edit}</button>
                    <button class="btn btn-danger btn-sm btn-icon" onclick="deleteAction('${a.id}')">${SVG.x}</button>
                </td>
            `;
            body.appendChild(tr);
        });
    } else {
        body.innerHTML = `<tr><td colspan="5" class="empty-state">No actions defined</td></tr>`;
    }
}

async function loadSpaceRewards(spaceId) {
    const res = await api("GET", `/spaces/${spaceId}/rewards`);
    const body = document.getElementById("rewards-body");
    if (!body) return;
    body.innerHTML = "";
    if (res?.rewards?.length) {
        res.rewards.forEach(r => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><code>${r.id}</code></td>
                <td>${r.name}</td>
                <td>${r.xp}</td>
                <td><span class="badge badge-purple">${r.typeName || "Reward"}</span></td>
                <td style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" onclick='openRewardModal(${JSON.stringify(r).replace(/'/g, "&apos;")})'>${SVG.edit}</button>
                    <button class="btn btn-danger btn-sm btn-icon" onclick="deleteReward('${r.id}')">${SVG.x}</button>
                </td>
            `;
            body.appendChild(tr);
        });
    } else {
        body.innerHTML = `<tr><td colspan="5" class="empty-state">No rewards defined</td></tr>`;
    }
}

async function loadSpaceEntities(spaceId) {
    const data = await api("GET", `/spaces/${spaceId}/entities`);
    const tbody = document.getElementById("entities-body");
    if (!tbody) return;
    const entities = data?.entities || [];
    if (!entities.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">${SVG.inbox}<p>No entities in this space</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = entities.map(e => `
        <tr>
            <td><strong>${e.name}</strong></td>
            <td><span class="badge badge-gray">${e.type}</span></td>
            <td style="color:var(--text-3)">r${e.revision}</td>
            <td style="color:var(--text-2);font-size:12px">${e.lastModified ? new Date(e.lastModified).toLocaleDateString() : "—"}</td>
            <td style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-sm" onclick='openEntityModal(${JSON.stringify(e).replace(/'/g, "&apos;")})'>${SVG.edit}</button>
                <button class="btn btn-danger btn-sm btn-icon" onclick="deleteEntity('${e.entityId}')">${SVG.x}</button>
            </td>
        </tr>`).join("");
}

// ─── Populations CRUD ────────────────────────────────────────────────────────
function openPopulationModal(p = null) {
    document.getElementById("population-modal-title").textContent = p ? "Edit Population" : "New Population";
    document.getElementById("population-editing-id").value = p?._id || "";
    document.getElementById("population-name").value = p?.name || "";
    document.getElementById("population-subject").value = p?.subject || "";
    document.getElementById("population-obj").value = p?.obj ? JSON.stringify(p.obj, null, 2) : "{}";
    document.getElementById("population-error").textContent = "";
    openModal("population-modal-overlay");
}

async function savePopulation() {
    const id = document.getElementById("population-editing-id").value;
    const name = document.getElementById("population-name").value.trim();
    const subject = document.getElementById("population-subject").value.trim();
    let obj;
    try { obj = JSON.parse(document.getElementById("population-obj").value); }
    catch { document.getElementById("population-error").textContent = "Invalid JSON"; return; }

    if (!name || !subject) { document.getElementById("population-error").textContent = "Name and subject required"; return; }

    // Admin API takes an array for PUT /spaces/:spaceId/populations
    // We'll fetch all current, modify/add, and push back.
    const res = await api("GET", `/spaces/${selectedSpaceId}/populations`);
    let populations = res?.populations || [];

    if (id) {
        populations = populations.map(p => p._id === id ? { ...p, name, subject, obj } : p);
    } else {
        populations.push({ name, subject, obj });
    }

    const saveRes = await api("PUT", `/spaces/${selectedSpaceId}/populations`, { populations });
    if (saveRes?.ok) {
        toast("Population saved", "success");
        closeModal("population-modal-overlay");
        loadSpacePopulations(selectedSpaceId);
    } else {
        document.getElementById("population-error").textContent = saveRes?.error || "Save failed";
    }
}

async function deletePopulation(id) {
    if (!confirm("Delete this population?")) return;
    const res = await api("GET", `/spaces/${selectedSpaceId}/populations`);
    let populations = res?.populations || [];
    populations = populations.filter(p => p._id !== id);

    const saveRes = await api("PUT", `/spaces/${selectedSpaceId}/populations`, { populations });
    if (saveRes?.ok) {
        toast("Population deleted", "success");
        loadSpacePopulations(selectedSpaceId);
    }
}

// ─── Actions CRUD ────────────────────────────────────────────────────────────
function openActionModal(a = null) {
    document.getElementById("action-modal-title").textContent = a ? "Edit Action" : "New Action";
    document.getElementById("action-editing-id").value = a?.id || "";
    document.getElementById("action-id").value = a?.id || "";
    document.getElementById("action-name").value = a?.name || "";
    document.getElementById("action-xp").value = a?.xp || 0;
    document.getElementById("action-isBadge").checked = a?.isBadge || false;
    document.getElementById("action-error").textContent = "";
    openModal("action-modal-overlay");
}

async function saveAction() {
    const originalId = document.getElementById("action-editing-id").value;
    const id = document.getElementById("action-id").value.trim();
    const name = document.getElementById("action-name").value.trim();
    const xp = parseInt(document.getElementById("action-xp").value);
    const isBadge = document.getElementById("action-isBadge").checked;

    if (!id || !name) { document.getElementById("action-error").textContent = "ID and name required"; return; }

    const res = await api("GET", `/spaces/${selectedSpaceId}/actions`);
    let actions = res?.actions || [];

    if (originalId) {
        actions = actions.map(a => a.id === originalId ? { ...a, id, name, xp, isBadge } : a);
    } else {
        actions.push({ id, name, xp, isBadge });
    }

    const saveRes = await api("PUT", `/spaces/${selectedSpaceId}/actions`, { actions });
    if (saveRes?.ok) {
        toast("Action saved", "success");
        closeModal("action-modal-overlay");
        loadSpaceActions(selectedSpaceId);
    } else {
        document.getElementById("action-error").textContent = saveRes?.error || "Save failed";
    }
}

async function deleteAction(id) {
    if (!confirm("Delete this action?")) return;
    const res = await api("GET", `/spaces/${selectedSpaceId}/actions`);
    let actions = res?.actions || [];
    actions = actions.filter(a => a.id !== id);

    const saveRes = await api("PUT", `/spaces/${selectedSpaceId}/actions`, { actions });
    if (saveRes?.ok) {
        toast("Action deleted", "success");
        loadSpaceActions(selectedSpaceId);
    }
}

// ─── Rewards CRUD ────────────────────────────────────────────────────────────
function openRewardModal(r = null) {
    document.getElementById("reward-modal-title").textContent = r ? "Edit Reward" : "New Reward";
    document.getElementById("reward-editing-id").value = r?.id || "";
    document.getElementById("reward-id").value = r?.id || "";
    document.getElementById("reward-name").value = r?.name || "";
    document.getElementById("reward-xp").value = r?.xp || 0;
    document.getElementById("reward-typeName").value = r?.typeName || "Virtual Item";
    document.getElementById("reward-error").textContent = "";
    openModal("reward-modal-overlay");
}

async function saveReward() {
    const originalId = document.getElementById("reward-editing-id").value;
    const id = document.getElementById("reward-id").value.trim();
    const name = document.getElementById("reward-name").value.trim();
    const xp = parseInt(document.getElementById("reward-xp").value);
    const typeName = document.getElementById("reward-typeName").value.trim();

    if (!id || !name) { document.getElementById("reward-error").textContent = "ID and name required"; return; }

    const res = await api("GET", `/spaces/${selectedSpaceId}/rewards`);
    let rewards = res?.rewards || [];

    if (originalId) {
        rewards = rewards.map(r => r.id === originalId ? { ...r, id, name, xp, typeName } : r);
    } else {
        rewards.push({ id, name, xp, typeName });
    }

    const saveRes = await api("PUT", `/spaces/${selectedSpaceId}/rewards`, { rewards });
    if (saveRes?.ok) {
        toast("Reward saved", "success");
        closeModal("reward-modal-overlay");
        loadSpaceRewards(selectedSpaceId);
    } else {
        document.getElementById("reward-error").textContent = saveRes?.error || "Save failed";
    }
}

async function deleteReward(id) {
    if (!confirm("Delete this reward?")) return;
    const res = await api("GET", `/spaces/${selectedSpaceId}/rewards`);
    let rewards = res?.rewards || [];
    rewards = rewards.filter(r => r.id !== id);

    const saveRes = await api("PUT", `/spaces/${selectedSpaceId}/rewards`, { rewards });
    if (saveRes?.ok) {
        toast("Reward deleted", "success");
        loadSpaceRewards(selectedSpaceId);
    }
}



function openSpaceModal(space = null) {
    document.getElementById("space-modal-title").textContent = space ? "Edit Space" : "New Space";
    document.getElementById("space-editing-id").value = space?.spaceId || "";
    document.getElementById("space-name").value = space?.spaceName || "";
    document.getElementById("space-type").value = space?.spaceType || "title";
    document.getElementById("space-platformType").value = space?.platformType || "";
    document.getElementById("space-releaseType").value = space?.releaseType || "";
    document.getElementById("space-parentId").value = space?.parentSpaceId || "";
    openModal("space-modal-overlay");
}

async function saveSpace() {
    const editingId = document.getElementById("space-editing-id").value;
    const payload = {
        spaceName: document.getElementById("space-name").value.trim(),
        spaceType: document.getElementById("space-type").value,
        platformType: document.getElementById("space-platformType").value.trim(),
        releaseType: document.getElementById("space-releaseType").value.trim(),
        parentSpaceId: document.getElementById("space-parentId").value.trim() || null
    };
    if (!payload.spaceName) { toast("Name is required", "error"); return; }

    const res = editingId
        ? await api("PATCH", `/spaces/${editingId}`, payload)
        : await api("POST", "/spaces", payload);

    if (res?.ok) { toast(editingId ? "Space updated" : "Space created", "success"); closeModal("space-modal-overlay"); loadSpaces(); }
    else toast(res?.error || "Failed to save space", "error");
}

async function deleteSpace(spaceId) {
    if (!confirm("Delete this space?")) return;
    const res = await api("DELETE", `/spaces/${spaceId}`);
    if (res?.ok) { toast("Space deleted", "success"); selectedSpaceId = null; loadSpaces(); }
    else toast(res?.error || "Failed", "error");
}

async function openEventConfigModal(spaceId) {
    document.getElementById("event-config-space-id").value = spaceId;
    document.getElementById("event-config-error").textContent = "";

    // Fetch current config
    const res = await api("GET", `/spaces/${spaceId}/configs/events`);
    const config = res?.config || {
        types: [],
        s2sConfig: { maxBatchSize: 2500, sendPeriodSeconds: 1, sendPlayerEventsPeriodSeconds: 30 },
        publicConfig: { sendPeriodSeconds: 30, hmacEnabled: false }
    };

    document.getElementById("event-config-types").value = (config.types || []).join(", ");
    document.getElementById("event-config-s2s-maxBatchSize").value = config.s2sConfig?.maxBatchSize ?? 2500;
    document.getElementById("event-config-s2s-sendPeriod").value = config.s2sConfig?.sendPeriodSeconds ?? 1;
    document.getElementById("event-config-s2s-sendPlayerEventsPeriod").value = config.s2sConfig?.sendPlayerEventsPeriodSeconds ?? 30;
    document.getElementById("event-config-public-sendPeriod").value = config.publicConfig?.sendPeriodSeconds ?? 30;
    document.getElementById("event-config-public-hmacEnabled").checked = config.publicConfig?.hmacEnabled ?? false;

    openModal("event-config-modal-overlay");
}

async function saveEventConfig() {
    const spaceId = document.getElementById("event-config-space-id").value;
    const payload = {
        types: document.getElementById("event-config-types").value.split(",").map(t => t.trim()).filter(Boolean),
        s2sConfig: {
            maxBatchSize: parseInt(document.getElementById("event-config-s2s-maxBatchSize").value),
            sendPeriodSeconds: parseInt(document.getElementById("event-config-s2s-sendPeriod").value),
            sendPlayerEventsPeriodSeconds: parseInt(document.getElementById("event-config-s2s-sendPlayerEventsPeriod").value)
        },
        publicConfig: {
            sendPeriodSeconds: parseInt(document.getElementById("event-config-public-sendPeriod").value),
            hmacEnabled: document.getElementById("event-config-public-hmacEnabled").checked
        }
    };

    const res = await api("PUT", `/spaces/${spaceId}/configs/events`, payload);
    if (res?.ok) {
        toast("Event configuration saved", "success");
        closeModal("event-config-modal-overlay");
    } else {
        document.getElementById("event-config-error").textContent = res?.error || "Failed to save configuration";
    }
}


// ─── Entities ─────────────────────────────────────────────────────────────────

let allEntities = [];

async function loadEntitySpaceSelect() {
    const data = await api("GET", "/spaces");
    const spaces = data?.spaces || [];
    document.getElementById("stat-spaces").textContent = spaces.length;
    const sel = document.getElementById("entity-space-select");
    sel.innerHTML = `<option value="">Select a space…</option>` +
        spaces.map(s => `<option value="${s.spaceId}">${s.spaceName} (${s.spaceType})</option>`).join("");
}

async function loadEntities() {
    const spaceId = document.getElementById("entity-space-select").value;
    if (!spaceId) return;
    const data = await api("GET", `/spaces/${spaceId}/entities`);
    allEntities = data?.entities || [];
    document.getElementById("stat-entities").textContent = allEntities.length;
    renderEntities();
}

function renderEntities() {
    const tbody = document.getElementById("entities-tbody");
    if (!allEntities.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">${SVG.inbox}<p>No entities in this space</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = allEntities.map(e => `
        <tr>
            <td><strong>${e.name}</strong></td>
            <td><span class="badge badge-gray">${e.type}</span></td>
            <td><code style="font-size:11px;color:var(--text-2)">${e.entityId}</code></td>
            <td style="color:var(--text-2);font-size:12px">${(e.tags || []).join(", ") || "—"}</td>
            <td style="color:var(--text-2);font-size:12px">${e.lastModified ? new Date(e.lastModified).toLocaleDateString() : "—"}</td>
            <td style="color:var(--text-3)">r${e.revision}</td>
            <td style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-sm" onclick='openEntityModal(${JSON.stringify(e).replace(/'/g, "&apos;")})'>${SVG.edit} Edit</button>
                <button class="btn btn-danger btn-sm btn-icon" onclick="deleteEntity('${e.entityId}')">${SVG.x}</button>
            </td>
        </tr>`).join("");
}

function openEntityModal(entity = null) {
    document.getElementById("entity-modal-title").textContent = entity ? "Edit Entity" : "New Entity";
    document.getElementById("entity-editing-id").value = entity?.entityId || "";
    document.getElementById("entity-name").value = entity?.name || "";
    document.getElementById("entity-type").value = entity?.type || "";
    document.getElementById("entity-tags").value = (entity?.tags || []).join(", ");
    document.getElementById("entity-obj").value = entity?.obj ? JSON.stringify(entity.obj, null, 2) : "{}";
    document.getElementById("entity-error").textContent = "";
    openModal("entity-modal-overlay");
}

async function saveEntity() {
    const spaceId = document.getElementById("entity-space-select")?.value || selectedSpaceId;
    if (!spaceId) { toast("No space selected", "error"); return; }

    const editingId = document.getElementById("entity-editing-id").value;
    const errEl = document.getElementById("entity-error");

    let obj;
    try { obj = JSON.parse(document.getElementById("entity-obj").value); }
    catch { errEl.textContent = "Invalid JSON in obj field."; return; }

    const payload = {
        name: document.getElementById("entity-name").value.trim(),
        type: document.getElementById("entity-type").value.trim(),
        tags: document.getElementById("entity-tags").value.split(",").map(t => t.trim()).filter(Boolean),
        obj
    };
    if (!payload.name || !payload.type) { errEl.textContent = "Name and type are required."; return; }
    errEl.textContent = "";

    const res = editingId
        ? await api("PATCH", `/spaces/${spaceId}/entities/${editingId}`, payload)
        : await api("POST", `/spaces/${spaceId}/entities`, payload);

    if (res?.ok) {
        toast(editingId ? "Entity updated" : "Entity created", "success");
        closeModal("entity-modal-overlay");
        if (selectedSpaceId) loadSpaceEntities(selectedSpaceId);
        else loadEntities();
    }
    else { errEl.textContent = res?.error || "Failed to save entity"; }
}


async function deleteEntity(entityId) {
    const spaceId = document.getElementById("entity-space-select")?.value || selectedSpaceId;
    if (!spaceId) return;
    if (!confirm("Delete this entity?")) return;
    const res = await api("DELETE", `/spaces/${spaceId}/entities/${entityId}`);
    if (res?.ok) {
        toast("Entity deleted", "success");
        if (selectedSpaceId) loadSpaceEntities(selectedSpaceId);
        else loadEntities();
    }
    else toast(res?.error || "Failed", "error");
}


// ─── Configuration ────────────────────────────────────────────────────────────

let configOriginal = "";

async function loadConfigAppSelect() {
    if (allApps.length === 0) await loadApps();
    const sel = document.getElementById("config-app-select");
    sel.innerHTML = `<option value="">Select an app…</option>` +
        allApps.map(a => `<option value="${a.appId}">${a.name}</option>`).join("");
}

// ─── Parameters ───────────────────────────────────────────────────────────────

let paramsMode = 'app';
let paramsOriginal = "";

function setParamsMode(mode) {
    paramsMode = mode;
    document.getElementById("params-mode-app").classList.toggle("btn-primary", mode === 'app');
    document.getElementById("params-mode-app").classList.toggle("btn-ghost", mode !== 'app');
    document.getElementById("params-mode-space").classList.toggle("btn-primary", mode === 'space');
    document.getElementById("params-mode-space").classList.toggle("btn-ghost", mode !== 'space');

    loadParametersTargetSelect();
}

async function loadParametersTargetSelect() {
    const sel = document.getElementById("params-target-select");
    sel.innerHTML = `<option value="">Select a ${paramsMode}…</option>`;

    if (paramsMode === 'app') {
        if (allApps.length === 0) await loadApps();
        sel.innerHTML += allApps.map(a => `<option value="${a.appId}">${a.name}</option>`).join("");
    } else {
        if (allSpaces.length === 0) await loadSpaces();
        sel.innerHTML += allSpaces.map(s => `<option value="${s.spaceId}">${s.spaceName}</option>`).join("");
    }
}

async function loadParameters() {
    const targetId = document.getElementById("params-target-select").value;
    const editor = document.getElementById("params-editor");
    const errorEl = document.getElementById("params-error");

    errorEl.textContent = "";
    if (!targetId) { editor.value = ""; return; }

    editor.value = "Loading…";
    const endpoint = paramsMode === 'app' ? `/apps/${targetId}/parameters` : `/spaces/${targetId}/parameters`;
    const res = await api("GET", endpoint);

    if (res?.parameters) {
        paramsOriginal = JSON.stringify(res.parameters, null, 4);
        editor.value = paramsOriginal;
    } else {
        editor.value = "{}";
        paramsOriginal = "{}";
    }
}

async function saveParameters() {
    const targetId = document.getElementById("params-target-select").value;
    const editor = document.getElementById("params-editor");
    const errorEl = document.getElementById("params-error");

    if (!targetId) { toast("No target selected", "error"); return; }

    let parameters;
    try { parameters = JSON.parse(editor.value); }
    catch (e) { errorEl.textContent = "Invalid JSON: " + e.message; return; }

    const endpoint = paramsMode === 'app' ? `/apps/${targetId}/parameters` : `/spaces/${targetId}/parameters`;
    const res = await api("PUT", endpoint, { parameters });

    if (res?.ok) {
        toast("Parameters saved", "success");
        paramsOriginal = JSON.stringify(parameters, null, 4);
        errorEl.textContent = "";
    } else {
        errorEl.textContent = res?.error || "Failed to save parameters";
    }
}

async function loadConfig() {
    const appId = document.getElementById("config-app-select").value;
    const errEl = document.getElementById("config-error");
    if (!appId) { document.getElementById("config-editor").value = ""; return; }

    const data = await api("GET", `/apps/${appId}/configuration`);
    const config = data?.configuration || {};
    const str = JSON.stringify(config, null, 2);
    configOriginal = str;
    document.getElementById("config-editor").value = str;
    document.getElementById("config-editor").classList.remove("error");
    errEl.textContent = "";
}

function resetConfig() {
    document.getElementById("config-editor").value = configOriginal;
    document.getElementById("config-editor").classList.remove("error");
    document.getElementById("config-error").textContent = "";
}

async function saveConfig() {
    const appId = document.getElementById("config-app-select").value;
    const errEl = document.getElementById("config-error");
    if (!appId) { toast("Select an app first", "error"); return; }

    let parsed;
    try {
        parsed = JSON.parse(document.getElementById("config-editor").value);
        document.getElementById("config-editor").classList.remove("error");
        errEl.textContent = "";
    } catch (e) {
        document.getElementById("config-editor").classList.add("error");
        errEl.textContent = "Invalid JSON: " + e.message;
        return;
    }

    const res = await api("PUT", `/apps/${appId}/configuration`, { configuration: parsed });
    if (res?.ok) { toast("Configuration saved", "success"); configOriginal = JSON.stringify(parsed, null, 2); }
    else toast(res?.error || "Failed to save", "error");
}

// ─── Ticket Tools ─────────────────────────────────────────────────────────────

async function decryptTicket() {
    const ticketStr = document.getElementById("decrypt-input").value.trim();
    if (!ticketStr) return;
    const res = await api("POST", "/tickets/decrypt", { ticket: ticketStr });
    if (!res?.ok) { toast(res?.error || "Failed to decrypt", "error"); return; }

    const claims = { ...res.claims, ...res.header };
    const tbody = document.getElementById("claims-tbody");
    tbody.innerHTML = Object.entries(claims).map(([k, v]) =>
        `<tr><td>${k}</td><td><code style="font-size:11px">${typeof v === "object" ? JSON.stringify(v) : v}</code></td></tr>`
    ).join("");
    document.getElementById("decrypt-result").style.display = "block";
    toast("Ticket decoded", "success");
}

async function encryptTicket() {
    const errEl = document.getElementById("encrypt-input");
    let payload;
    try { payload = JSON.parse(document.getElementById("encrypt-input").value); }
    catch { toast("Invalid JSON in payload", "error"); return; }

    const res = await api("POST", "/tickets/encrypt", payload);
    if (!res?.ok) { toast(res?.error || "Failed to encrypt", "error"); return; }

    document.getElementById("ticket-output").value = res.ticket;
    document.getElementById("encrypt-result").style.display = "block";
    toast("Ticket generated", "success");
}

function copyTicket() {
    navigator.clipboard.writeText(document.getElementById("ticket-output").value);
    toast("Copied to clipboard", "success");
}

// ─── Init ─────────────────────────────────────────────────────────────────────

(async function init() {
    await loadSessions();
    // Pre-load apps so config tab works instantly
    const appsData = await api("GET", "/apps");
    const platData = await api("GET", "/platforms");
    allApps = appsData?.apps || [];
    allPlatforms = platData?.platforms || [];

    // Stats
    const spacesData = await api("GET", "/spaces");
    const entitiesCount = 0; // loaded per-space
    document.getElementById("stat-apps").textContent = allApps.length;
    document.getElementById("stat-spaces").textContent = (spacesData?.spaces || []).length;
    document.getElementById("stat-entities").textContent = "—";

    // Auto-refresh sessions every 30s
    setInterval(loadSessions, 30000);
})();
