// Tab Switching Logic
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all
        navItems.forEach(nav => nav.classList.remove('active'));
        tabContents.forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked
        item.classList.add('active');
        document.getElementById(item.dataset.tab).classList.add('active');
        
        // Tab specific initialization
        if (item.dataset.tab === 'hosts') loadHosts();
        if (item.dataset.tab === 'logs') {
            const container = document.getElementById('log-output').parentElement;
            container.scrollTop = container.scrollHeight;
        }
    });
});

// --- Dashboard ---
async function fetchStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        document.getElementById('stat-users').textContent = data.active_users_count;
        document.getElementById('stat-connections').textContent = data.active_connections;
        document.getElementById('stat-total').textContent = data.metrics.total_requests;
        document.getElementById('stat-requests').textContent = data.metrics.requests_24h;
        
        // Populate lists
        const usersList = document.getElementById('users-list');
        if (data.authenticated_users.length > 0) {
            usersList.innerHTML = data.authenticated_users.map(u => `
                <li style="display:flex; align-items:center; gap:12px;">
                    <div style="width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg, #3b82f6, #8b5cf6); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.8rem; color:white;">
                        ${u.charAt(0).toUpperCase()}
                    </div>
                    <strong>${u}</strong>
                </li>`).join('');
        } else {
            usersList.innerHTML = '<li class="empty">No active users</li>';
        }
        
        const connList = document.getElementById('connections-list');
        if (data.connection_list.length > 0) {
            connList.innerHTML = data.connection_list.map(c => `
                <li style="display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="color:var(--success); font-size:1.2rem;">●</span>
                        <span style="font-family:monospace; color:var(--text-secondary);">${c[0]}</span>
                    </div>
                    <span style="font-size:0.8rem; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">Port ${c[1]}</span>
                </li>`).join('');
        } else {
            connList.innerHTML = '<li class="empty">No connections</li>';
        }
    } catch (e) {
        console.error("Failed to fetch status", e);
    }
}

// Fetch status every 2 seconds if on dashboard
setInterval(() => {
    if (document.getElementById('dashboard').classList.contains('active')) {
        fetchStatus();
    }
}, 2000);
fetchStatus(); // Initial load

// --- Hosts Management ---
async function loadHosts() {
    try {
        const res = await fetch('/api/hosts');
        const hosts = await res.json();
        const tbody = document.getElementById('hosts-table-body');
        
        if (hosts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">No hosts configured</td></tr>';
            return;
        }
        
        tbody.innerHTML = hosts.map(h => `
            <tr>
                <td><strong>${h.domain}</strong></td>
                <td>${h.target}</td>
                <td>${h.description || '-'}</td>
                <td>
                    <span class="status-badge ${h.enabled ? 'status-active' : 'status-inactive'}">
                        ${h.enabled ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="btn-secondary" style="padding: 5px 10px; font-size: 0.8rem" onclick="toggleHost('${h.domain}', ${!h.enabled})">
                        ${h.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button class="btn-danger" style="padding: 5px 10px; font-size: 0.8rem; margin-left: 5px;" onclick="deleteHost('${h.domain}')">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error("Failed to load hosts", e);
    }
}

document.getElementById('add-host-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const domain = document.getElementById('host-domain').value;
    const target = document.getElementById('host-target').value;
    const desc = document.getElementById('host-desc').value;
    
    try {
        await fetch('/api/hosts', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({domain, target, description: desc})
        });
        e.target.reset();
        loadHosts();
    } catch (e) {
        alert("Failed to add host");
    }
});

window.toggleHost = async (domain, enabled) => {
    await fetch(`/api/hosts/${domain}/toggle`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({enabled})
    });
    loadHosts();
};

window.deleteHost = async (domain) => {
    if(confirm(`Are you sure you want to delete ${domain}?`)) {
        await fetch(`/api/hosts/${domain}`, {method: 'DELETE'});
        loadHosts();
    }
};

// --- Live Logs WebSocket ---
const logOutput = document.getElementById('log-output');
const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProto}//${window.location.host}/api/logs`;
let ws;

function connectLogs() {
    ws = new WebSocket(wsUrl);
    ws.onmessage = (e) => {
        const span = document.createElement('span');
        span.style.display = 'block'; // Force new line natively
        
        let text = e.data;
        // Make colors much brighter so they pop
        if (text.includes(' - INFO - ')) span.style.color = '#60a5fa'; // Bright blue
        else if (text.includes(' - WARNING - ')) span.style.color = '#fbbf24'; // Bright amber
        else if (text.includes(' - ERROR - ')) span.style.color = '#f87171'; // Bright red
        else if (text.includes(' - DEBUG - ')) span.style.color = '#9ca3af'; // Gray
        else span.style.color = '#a3be8c'; // Default green-ish
        
        span.textContent = text;
        
        const container = logOutput.parentElement;
        // Check if user is near the bottom before appending, so we don't force scroll if they're reading history
        const isAtBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 50;
        
        logOutput.appendChild(span);
        
        // Keep only last 500 lines to prevent DOM bloat
        if (logOutput.childNodes.length > 500) {
            logOutput.removeChild(logOutput.firstChild);
        }
        
        // Auto scroll if they were at the bottom
        if (isAtBottom) {
            container.scrollTop = container.scrollHeight;
        }
    };
    
    ws.onclose = () => {
        setTimeout(connectLogs, 3000); // Reconnect
    };
}
connectLogs();

document.getElementById('clear-logs').addEventListener('click', () => {
    logOutput.innerHTML = '';
});

// --- Test Suite ---
document.getElementById('run-test-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('btn-run-tests');
    const outWrapper = document.getElementById('test-results-wrapper');
    const outDisplay = document.getElementById('test-output');
    
    btn.disabled = true;
    btn.textContent = 'Running...';
    outWrapper.style.display = 'block';
    outDisplay.textContent = 'Executing pytest... Please wait.\n';
    
    const payload = {
        proxy_url: document.getElementById('test-proxy').value,
        hub_url: document.getElementById('test-hub').value,
        proxy_secret: document.getElementById('test-secret').value,
        username: document.getElementById('test-user').value,
        password: document.getElementById('test-pass').value
    };
    
    try {
        const res = await fetch('/api/test', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        const result = await res.json();
        let color = result.return_code === 0 ? '#a3be8c' : '#bf616a'; // Green vs Red
        
        outDisplay.innerHTML = `<span style="color: ${color}">Exit Code: ${result.return_code}</span>\n\n`;
        outDisplay.appendChild(document.createTextNode(result.stdout));
        if (result.stderr) {
            outDisplay.appendChild(document.createTextNode('\n\nSTDERR:\n' + result.stderr));
        }
        
    } catch (e) {
        outDisplay.textContent = "Error communicating with server: " + e;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Run Tests';
    }
});
