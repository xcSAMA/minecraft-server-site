// ========== 配置 ==========
const API = 'http://localhost:3001/api';

// ========== 状态 ==========
let currentUser = null;
let currentPage = 'console';
let logLines = [];

// ========== DOM ==========
const dom = {
    loginOverlay: document.getElementById('loginOverlay'),
    loginBid: document.getElementById('loginBid'),
    loginPassword: document.getElementById('loginPassword'),
    loginError: document.getElementById('loginError'),
    sidebarUser: document.getElementById('sidebarUser'),
    consoleLoginBtn: document.getElementById('consoleLoginBtn'),
    consoleUserBtn: document.getElementById('consoleUserBtn'),
    consoleUsername: document.getElementById('consoleUsername'),
};

// ========== 页面切换 ==========
document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        switchPage(page);
    });
});

function switchPage(page) {
    currentPage = page;
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.sidebar-link[data-page="${page}"]`).classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');

    // 建议区检查登录
    if (page === 'suggest') {
        const locked = document.getElementById('suggestLocked');
        const form = document.getElementById('suggestForm');
        if (currentUser) {
            locked.classList.add('hidden');
            form.classList.remove('hidden');
        } else {
            locked.classList.remove('hidden');
            form.classList.add('hidden');
        }
    }
}

// ========== 登录 ==========
function showLogin() {
    dom.loginOverlay.classList.remove('hidden');
    dom.loginBid.focus();
    dom.loginError.textContent = '';
}

function hideLogin() {
    dom.loginOverlay.classList.add('hidden');
}

async function handleLogin() {
    const bid = dom.loginBid.value.trim();
    const password = dom.loginPassword.value.trim();

    if (!bid || !password) {
        dom.loginError.textContent = '请输入 BID 和密码';
        return;
    }

    try {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bid, password })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.user;
            dom.loginError.textContent = '';
            dom.loginError.style.color = 'var(--accent-green)';
            dom.loginError.textContent = '✅ 登录成功！';
            setTimeout(() => {
                hideLogin();
                updateUserUI();
                addLog('success', `玩家 ${currentUser.displayName} 登录了控制台`);
            }, 500);
        } else {
            dom.loginError.textContent = '❌ ' + (data.message || 'BID 或密码错误');
        }
    } catch (err) {
        dom.loginError.textContent = '❌ 连接服务器失败';
    }
}

function updateUserUI() {
    if (currentUser) {
        dom.sidebarUser.innerHTML = `<span class="sidebar-user-icon">👤</span><span>${currentUser.displayName}</span>`;
        dom.consoleLoginBtn.classList.add('hidden');
        dom.consoleUserBtn.classList.remove('hidden');
        dom.consoleUsername.textContent = currentUser.displayName;
        document.querySelector('.sidebar-badge-lock').textContent = '✅';
    }
}

// Enter 键登录
document.getElementById('loginPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
});

// 点击遮罩关闭
dom.loginOverlay.addEventListener('click', (e) => {
    if (e.target === dom.loginOverlay) hideLogin();
});

// ========== 提交建议 ==========
function submitSuggest() {
    const text = document.getElementById('suggestInput').value.trim();
    if (!text) return;
    addLog('info', `建议已提交: "${text.slice(0, 30)}..."`);
    document.getElementById('suggestInput').value = '';
    alert('✅ 感谢你的建议！');
}

// ========== 控制台日志 ==========
function addLog(type, message) {
    const now = new Date();
    const time = `[${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}]`;
    logLines.push({ time, type, message });
    if (logLines.length > 100) logLines.shift();
    renderLog();
}

function renderLog() {
    const body = document.getElementById('logBody');
    body.innerHTML = logLines.map(line =>
        `<div class="log-line ${line.type}"><span class="log-time">${line.time}</span> [${line.type.toUpperCase()}] ${line.message}</div>`
    ).join('');
    body.scrollTop = body.scrollHeight;
}

// ========== 获取服务器状态 ==========
async function fetchStatus() {
    try {
        const res = await fetch(`${API}/status`);
        const data = await res.json();
        updateStats(data);
    } catch (err) {
        addLog('error', '无法连接到后端服务器');
    }
}

function updateStats(data) {
    if (!data) return;

    // 内存
    const memUsed = data.memory?.used ?? 0;
    const memMax = data.memory?.max ?? 2048;
    const memPercent = memMax > 0 ? (memUsed / memMax) * 100 : 0;
    document.getElementById('memUsed').textContent = Math.round(memUsed);
    document.getElementById('memMax').textContent = Math.round(memMax);
    document.getElementById('memPercent').textContent = `${Math.round(memPercent)}%`;
    setBar('memBar', memPercent, memPercent);

    // Ping（模拟）
    const ping = Math.floor(Math.random() * 30) + 5;
    document.getElementById('pingValue').textContent = ping;
    document.getElementById('pingLabel').textContent = ping < 20 ? '极佳' : ping < 50 ? '良好' : '一般';
    setBar('pingBar', ping, 100, true);

    // 玩家
    const online = data.players?.online ?? 0;
    const max = data.players?.max ?? 20;
    document.getElementById('onlinePlayers').textContent = online;
    document.getElementById('maxPlayers').textContent = max;
    document.getElementById('playerLabel').textContent = `${online}/${max} 在线`;
    setBar('playerBar', max > 0 ? (online/max)*100 : 0);

    // 磁盘（模拟）
    const diskGB = (Math.random() * 20 + 10).toFixed(1);
    document.getElementById('diskValue').textContent = diskGB;
    document.getElementById('diskLabel').textContent = `${diskGB} / 50 GB`;
    setBar('diskBar', (parseFloat(diskGB)/50)*100);

    // CPU
    const cpu = Math.floor(Math.random() * 40) + 5;
    document.getElementById('cpuValue').textContent = cpu;
    document.getElementById('cpuLabel').textContent = cpu < 30 ? '空闲' : cpu < 60 ? '正常' : '高负载';
    setBar('cpuBar', cpu, 100);

    // 服务器状态
    document.getElementById('serverStatusText').textContent = data.online ? '🟢 在线' : '🔴 离线';
    document.getElementById('uptimeLabel').textContent = data.online ? '服务器运行中' : '已离线';
    setBar('uptimeBar', data.online ? 100 : 0);

    // 关于页面
    if (data.server) {
        document.getElementById('aboutVersion').textContent = data.server.version || data.server.minecraft_version || '1.21.1';
        document.getElementById('aboutAddress').textContent = data.server.server_ip || 'play.example.com';
    }
    if (data.plugins) {
        document.getElementById('pluginCount').textContent = `${Array.isArray(data.plugins) ? data.plugins.length : 0} 个`;
    }
}

function setBar(elementId, value, max = 100, reverse = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const percent = Math.min(100, Math.max(0, reverse ? (1 - value/max) * 100 : (value/max) * 100));
    el.style.width = `${percent}%`;

    // 颜色
    if (percent > 80) el.style.background = 'linear-gradient(90deg, #dc2626, var(--accent-red))';
    else if (percent > 60) el.style.background = 'linear-gradient(90deg, var(--accent-orange), #f97316)';
    else if (percent > 30) el.style.background = 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))';
    else el.style.background = 'linear-gradient(90deg, #16a34a, var(--accent-green))';
}

// ========== 初始化 ==========
function init() {
    addLog('info', '控制台已连接');
    addLog('info', '正在获取服务器状态...');
    fetchStatus();

    // 每 3 秒刷新状态
    setInterval(fetchStatus, 3000);
}

// 暴露全局
window.showLogin = showLogin;
window.handleLogin = handleLogin;
window.submitSuggest = submitSuggest;

document.addEventListener('DOMContentLoaded', init);
