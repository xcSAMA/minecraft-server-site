// ========== 配置 ==========
const CONFIG = {
    apiBase: 'http://localhost:3001/api',
    wsUrl: 'http://localhost:3001',
    pollInterval: 5000,  // 轮询间隔（毫秒）
    serverDir: ''        // 将在启动时从服务器获取
};

// ========== DOM 引用 ==========
const dom = {
    loading: document.getElementById('loadingOverlay'),
    navStatus: document.getElementById('navStatus'),
    statusDot: document.querySelector('.status-dot'),
    serverName: document.getElementById('serverName'),
    serverMotd: document.getElementById('serverMotd'),
    playerCount: document.getElementById('playerCount'),
    serverVersion: document.getElementById('serverVersion'),
    serverTps: document.getElementById('serverTps'),
    onlineStatus: document.getElementById('onlineStatus'),
    memUsed: document.getElementById('memUsed'),
    memMax: document.getElementById('memMax'),
    memBar: document.getElementById('memBar'),
    memPercent: document.getElementById('memPercent'),
    tpsValue: document.getElementById('tpsValue'),
    tpsBar: document.getElementById('tpsBar'),
    tpsLabel: document.getElementById('tpsLabel'),
    onlinePlayers: document.getElementById('onlinePlayers'),
    maxPlayers: document.getElementById('maxPlayers'),
    playerBar: document.getElementById('playerBar'),
    playerLabel: document.getElementById('playerLabel'),
    uptimeBar: document.getElementById('uptimeBar'),
    aboutVersion: document.getElementById('aboutVersion'),
    aboutAddress: document.getElementById('aboutAddress'),
    pluginCount: document.getElementById('pluginCount'),
    modalServerIp: document.getElementById('modalServerIp'),
    modalGameVersion: document.getElementById('modalGameVersion'),
    configContent: document.getElementById('configContent'),
    configFilename: document.getElementById('configFilename'),
};

// ========== 工具函数 ==========
function formatUptime(seconds) {
    if (!seconds || seconds <= 0) return '0 分钟';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days} 天`);
    if (hours > 0) parts.push(`${hours} 小时`);
    if (mins > 0) parts.push(`${mins} 分钟`);
    return parts.join(' ') || '刚刚启动';
}

function updateValue(element, value, animate = true) {
    if (!element) return;
    const oldText = element.textContent;
    element.textContent = value;
    if (animate && oldText !== String(value)) {
        element.classList.remove('updating');
        void element.offsetWidth; // 触发回流以重启动画
        element.classList.add('updating');
    }
}

function updateBar(element, percent, colorClass = 'bar-green') {
    if (!element) return;
    element.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    element.className = `bar-fill ${colorClass}`;
}

function getBarColor(percent) {
    if (percent > 90) return 'bar-red';
    if (percent > 70) return 'bar-orange';
    if (percent > 50) return 'bar-blue';
    return 'bar-green';
}

function getTpsColor(tps) {
    if (tps >= 19) return { class: 'bar-green', label: '优秀' };
    if (tps >= 15) return { class: 'bar-blue', label: '良好' };
    if (tps >= 10) return { class: 'bar-orange', label: '一般' };
    return { class: 'bar-red', label: '差' };
}

// ========== 导航栏滚动效果 ==========
document.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    navbar.classList.toggle('scrolled', window.scrollY > 50);

    // 高亮当前 section 的导航链接
    const sections = document.querySelectorAll('.section, .hero');
    const navLinks = document.querySelectorAll('.nav-link');

    let current = '';
    sections.forEach(section => {
        const top = section.offsetTop - 200;
        if (window.scrollY >= top) {
            current = section.getAttribute('id') || 'home';
        }
    });

    navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
});

// ========== 配置标签切换 ==========
document.querySelectorAll('.config-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
        document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filename = tab.dataset.file;
        await loadConfigFile(filename);
    });
});

async function loadConfigFile(filename) {
    try {
        dom.configContent.textContent = '正在加载...';
        dom.configFilename.textContent = filename;
        const response = await fetch(`${CONFIG.apiBase}/config/${filename}`);
        if (!response.ok) throw new Error('加载失败');
        const data = await response.json();
        dom.configContent.textContent = data.content || '文件为空';
    } catch (err) {
        dom.configContent.textContent = `⚠️ 加载失败: ${err.message}\n\n请确认服务器已启动且配置文件存在。`;
    }
}

// ========== 加载服务器数据 ==========
async function fetchServerData() {
    try {
        const response = await fetch(`${CONFIG.apiBase}/status`);
        if (!response.ok) throw new Error('连接失败');
        return await response.json();
    } catch (err) {
        console.error('获取服务器数据失败:', err);
        return null;
    }
}

function updateUI(data) {
    if (!data) {
        // 服务器离线
        setStatus('offline');
        dom.onlineStatus.textContent = '❌ 离线';
        dom.onlineStatus.style.color = 'var(--accent-red)';
        updateBar(dom.uptimeBar, 0, 'bar-red');
        return;
    }

    setStatus('online');

    // 基本服务器信息
    if (data.server) {
        const s = data.server;
        updateValue(dom.serverName, s.name || '⛏️ Leaves 服务器');
        updateValue(dom.serverMotd, s.motd || s.description || '欢迎来到我们的 Minecraft 世界！');
        updateValue(dom.serverVersion, s.version || s.minecraft_version || '-');
        updateValue(dom.aboutVersion, s.version || s.minecraft_version || '未知');
        updateValue(dom.aboutAddress, s.ip || s.server_ip || 'play.example.com');
        updateValue(dom.modalServerIp.querySelector('code'), s.ip || s.server_ip || 'play.example.com');
        updateValue(dom.modalGameVersion, s.version || s.minecraft_version || '1.21');
    }

    // 玩家信息
    if (data.players) {
        const p = data.players;
        const online = p.online ?? p.count ?? 0;
        const max = p.max ?? 20;
        updateValue(dom.playerCount, online);
        updateValue(dom.onlinePlayers, online);
        updateValue(dom.maxPlayers, max);
        const playerPercent = max > 0 ? (online / max) * 100 : 0;
        updateBar(dom.playerBar, playerPercent, getBarColor(playerPercent));
        dom.playerLabel.textContent = `${online}/${max} 在线`;
    }

    // TPS
    if (data.tps !== undefined) {
        const tps = typeof data.tps === 'number' ? data.tps : 20;
        const rounded = tps.toFixed(1);
        updateValue(dom.serverTps, rounded);
        updateValue(dom.tpsValue, rounded);
        const { class: colorClass, label } = getTpsColor(tps);
        updateBar(dom.tpsBar, (tps / 20) * 100, colorClass);
        dom.tpsLabel.textContent = label;
    } else {
        updateBar(dom.tpsBar, 100, 'bar-green');
        dom.tpsLabel.textContent = '优秀';
    }

    // 内存
    if (data.memory) {
        const mem = data.memory;
        const used = mem.used ?? 0;
        const max = mem.max ?? 1;
        const percent = max > 0 ? (used / max) * 100 : 0;
        updateValue(dom.memUsed, Math.round(used));
        updateValue(dom.memMax, Math.round(max));
        updateBar(dom.memBar, percent, getBarColor(percent));
        dom.memPercent.textContent = `${Math.round(percent)}%`;
    }

    // 运行状态
    if (data.online !== undefined) {
        dom.onlineStatus.textContent = data.online ? '🟢 在线' : '🔴 离线';
        dom.onlineStatus.style.color = data.online ? 'var(--accent-green)' : 'var(--accent-red)';

        // 运行时间
        if (data.uptime !== undefined) {
            const uptimePercent = Math.min(100, (data.uptime / 86400) * 100);
            updateBar(dom.uptimeBar, uptimePercent, data.online ? 'bar-green' : 'bar-red');
            dom.onlineStatus.textContent += ` · ${formatUptime(data.uptime)}`;
        } else {
            updateBar(dom.uptimeBar, 100, 'bar-green');
        }
    }

    // 插件数量
    if (data.plugins !== undefined) {
        const count = Array.isArray(data.plugins) ? data.plugins.length : (data.plugins || 0);
        updateValue(dom.pluginCount, `${count} 个`);
    }
}

function setStatus(status) {
    dom.statusDot.className = `status-dot ${status}`;
    const statusText = dom.navStatus.querySelector('span:last-child');
    if (status === 'online') {
        statusText.textContent = '服务器在线';
    } else if (status === 'offline') {
        statusText.textContent = '服务器离线';
    } else {
        statusText.textContent = '检测中...';
    }
}

// ========== Modal 控制 ==========
function showModal(type) {
    if (type === 'connect') {
        document.getElementById('connectModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(type) {
    if (type === 'connect') {
        document.getElementById('connectModal').classList.remove('active');
        document.body.style.overflow = '';
    }
}

// 点击遮罩关闭
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// ESC 关闭
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(overlay => {
            overlay.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
});

// ========== 复制地址 ==========
function copyAddress() {
    const ip = dom.modalServerIp.querySelector('code').textContent;
    navigator.clipboard.writeText(ip).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = '✅ 已复制';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = '📋 复制';
            btn.classList.remove('copied');
        }, 2000);
    });
}

// ========== 滚动到指定区域 ==========
function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ========== 数据轮询 ==========
async function pollData() {
    const data = await fetchServerData();
    updateUI(data);
}

// ========== WebSocket 连接 ==========
function connectWebSocket() {
    const socket = new WebSocket(`ws://localhost:3001`);

    socket.onopen = () => {
        console.log('WebSocket 已连接');
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'status') {
                updateUI(data.payload);
            } else if (data.type === 'config-update') {
                // 如果当前正在查看更新的文件，刷新显示
                const activeTab = document.querySelector('.config-tab.active');
                if (activeTab && activeTab.dataset.file === data.filename) {
                    loadConfigFile(data.filename);
                }
                // 显示通知徽标
                const badge = document.getElementById('configUpdateBadge');
                if (badge) {
                    badge.textContent = '🔄 已更新';
                    setTimeout(() => { badge.textContent = '实时'; }, 3000);
                }
            }
        } catch (err) {
            console.error('WebSocket 消息解析失败:', err);
        }
    };

    socket.onclose = () => {
        console.log('WebSocket 已断开，5秒后重连...');
        setTimeout(connectWebSocket, 5000);
    };

    socket.onerror = (err) => {
        console.error('WebSocket 错误:', err);
        socket.close();
    };
}

// ========== 初始化 ==========
async function init() {
    // 隐藏加载动画
    setTimeout(() => {
        dom.loading.classList.add('hidden');
    }, 1500);

    // 首次加载配置
    await loadConfigFile('server.properties');

    // 首次数据加载
    await pollData();

    // 启动轮询
    setInterval(pollData, CONFIG.pollInterval);

    // 尝试 WebSocket 连接
    connectWebSocket();
}

// 导出供 HTML 使用
window.showModal = showModal;
window.closeModal = closeModal;
window.copyAddress = copyAddress;
window.scrollToSection = scrollToSection;

// 启动
document.addEventListener('DOMContentLoaded', init);
