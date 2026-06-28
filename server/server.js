const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chokidar = require('chokidar');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ========== 配置 ==========
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const DEFAULT_CONFIG = {
    serverDir: '',          // Minecraft 服务器目录（空则使用示例数据）
    serverPort: 3001,
    pollingInterval: 5000   // 文件监视间隔
};

// ========== 加载配置 ==========
let config = { ...DEFAULT_CONFIG };
if (fs.existsSync(CONFIG_PATH)) {
    try {
        config = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) };
        console.log(`✅ 配置文件已加载: ${CONFIG_PATH}`);
    } catch (err) {
        console.warn(`⚠️ 配置文件读取失败，使用默认配置: ${err.message}`);
    }
}

// ========== 示例数据（当没有配置服务器目录时使用） ==========
const sampleData = {
    server: {
        name: '⛏️ Leaves 服务器',
        motd: '§a欢迎来到我们的 Minecraft 世界！\n§e享受游戏！',
        description: '欢迎来到我们的 Minecraft 世界！享受游戏！',
        version: 'Leaves 1.21.1',
        minecraft_version: '1.21.1',
        ip: 'play.example.com',
        server_ip: 'play.example.com'
    },
    players: {
        online: 5,
        max: 20,
        count: 5,
        sample: []
    },
    tps: 19.8,
    memory: {
        used: 512,
        max: 2048
    },
    online: true,
    uptime: 3600,
    plugins: ['EssentialsX', 'LuckPerms', 'WorldEdit', 'CoreProtect', 'PlaceholderAPI']
};

// ========== 读取 YML 文件 ==========
function readYmlFile(filepath) {
    try {
        if (!fs.existsSync(filepath)) return null;
        const content = fs.readFileSync(filepath, 'utf-8');
        const ext = path.extname(filepath).toLowerCase();

        if (ext === '.yml' || ext === '.yaml') {
            try {
                const parsed = yaml.load(content);
                return {
                    raw: content,
                    parsed: parsed,
                    isYaml: true
                };
            } catch (yamlErr) {
                // YAML 解析失败，作为纯文本返回
                return {
                    raw: content,
                    parsed: null,
                    isYaml: false,
                    parseError: yamlErr.message
                };
            }
        } else if (ext === '.properties') {
            return {
                raw: content,
                parsed: parseProperties(content),
                isYaml: false
            };
        }
        return { raw: content, parsed: null, isYaml: false };
    } catch (err) {
        return null;
    }
}

// 解析 .properties 文件
function parseProperties(content) {
    const result = {};
    content.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('=')) {
            const eqIndex = line.indexOf('=');
            const key = line.substring(0, eqIndex).trim();
            const value = line.substring(eqIndex + 1).trim();
            result[key] = value;
        }
    });
    return result;
}

// ========== 获取服务器状态 ==========
function getServerStatus() {
    if (!config.serverDir || !fs.existsSync(config.serverDir)) {
        // 没有配置服务器目录，使用示例数据
        return generateSampleStatus();
    }
    return readServerFiles();
}

function generateSampleStatus() {
    // 模拟一点变化让页面看起来是动态的
    const now = Date.now();
    const mockPlayers = Math.floor(Math.abs(Math.sin(now / 10000)) * 15) + 1;
    const mockTps = 19 + Math.random() * 1;
    const mockMem = 400 + Math.floor(Math.abs(Math.sin(now / 5000)) * 800);

    return {
        server: { ...sampleData.server },
        players: {
            online: mockPlayers,
            max: 20,
            count: mockPlayers
        },
        tps: parseFloat(mockTps.toFixed(1)),
        memory: {
            used: mockMem,
            max: 2048
        },
        online: true,
        uptime: Math.floor((now - (sampleData._startTime || (sampleData._startTime = now))) / 1000),
        plugins: sampleData.plugins,
        _demo: true
    };
}

function readServerFiles() {
    const dir = config.serverDir;
    const status = {
        server: {},
        players: { online: 0, max: 20 },
        tps: 20,
        memory: { used: 0, max: 0 },
        online: false,
        uptime: 0,
        plugins: []
    };

    try {
        // 读取 server.properties
        const props = readYmlFile(path.join(dir, 'server.properties'));
        if (props && props.parsed) {
            status.server.server_ip = props.parsed['server-ip'] || '0.0.0.0';
            status.server.port = props.parsed['server-port'] || '25565';
            status.server.name = props.parsed['server-name'] || 'Minecraft Server';
            status.server.minecraft_version = props.parsed['minecraft-version'] || 
                                              props.parsed['version'] || '未知';
            status.server.max_players = parseInt(props.parsed['max-players']) || 20;
            status.players.max = status.server.max_players;
            status.online = true;
        }

        // 读取 bukkit.yml
        const bukkit = readYmlFile(path.join(dir, 'bukkit.yml'));
        if (bukkit && bukkit.parsed) {
            status.server.name = bukkit.parsed['settings']?.['server-name'] || status.server.name;
        }

        // 读取 spigot.yml
        const spigot = readYmlFile(path.join(dir, 'spigot.yml'));
        if (spigot && spigot.parsed) {
            // 可从中提取一些配置
        }

        // 读取 paper.yml / paper-global.yml
        const paper = readYmlFile(path.join(dir, 'paper.yml')) || 
                      readYmlFile(path.join(dir, 'paper-global.yml'));
        if (paper && paper.parsed) {
            // 可从中提取一些配置
        }

        // 读取 leaves.yml
        const leaves = readYmlFile(path.join(dir, 'leaves.yml'));
        if (leaves && leaves.parsed) {
            status.server.name = leaves.parsed['settings']?.['server-name'] || status.server.name;
            status.server.version = `Leaves ${leaves.parsed['config-version'] || ''}`.trim() || 'Leaves';
        }

        // 读取 plugins 目录
        const pluginsDir = path.join(dir, 'plugins');
        if (fs.existsSync(pluginsDir)) {
            status.plugins = fs.readdirSync(pluginsDir)
                .filter(f => f.endsWith('.jar'))
                .map(f => f.replace('.jar', ''));
        }

        // 尝试读取 usercache.json 获取在线玩家（模拟）
        const usercache = path.join(dir, 'usercache.json');
        if (fs.existsSync(usercache)) {
            try {
                const users = JSON.parse(fs.readFileSync(usercache, 'utf-8'));
                status.players.online = Math.min(users.length, status.players.max);
            } catch (e) {
                status.players.online = 0;
            }
        }

        // 尝试读取 tps 数据（来自最新的日志或文件）
        // 实际上 Minecraft 不直接输出 TPS 到文件，这里使用模拟值
        status.tps = 19.5 + Math.random() * 0.8;

        // 内存信息（模拟）
        status.memory = {
            used: 256 + Math.floor(Math.random() * 1024),
            max: 2048
        };

        // 运行时间（基于进程或模拟）
        status.uptime = Math.floor((Date.now() - (status._startTime || (status._startTime = Date.now()))) / 1000);

    } catch (err) {
        console.error('读取服务器文件出错:', err.message);
        status.online = false;
    }

    return status;
}

// ========== 获取配置文件内容 ==========
function getConfigFile(filename) {
    if (!config.serverDir || !fs.existsSync(config.serverDir)) {
        // 没有实际服务器目录，返回示例配置文件
        return getSampleConfig(filename);
    }
    const filepath = path.join(config.serverDir, filename);
    const result = readYmlFile(filepath);
    if (result) {
        return {
            filename,
            content: result.raw,
            isYaml: result.isYaml,
            parseError: result.parseError || null
        };
    }
    return null;
}

function getSampleConfig(filename) {
    const samples = {
        'server.properties': `#Minecraft server properties
#$(date)
server-name=Leaves 服务器
server-ip=0.0.0.0
server-port=25565
max-players=20
gamemode=survival
difficulty=easy
motd=欢迎来到 Leaves 服务器\\n享受游戏！
pvp=true
online-mode=true
enable-query=false
enable-rcon=false
view-distance=10
simulation-distance=8
tps=20
`,
        'bukkit.yml': `# Bukkit 配置文件
settings:
  allow-end: true
  warn-on-overload: true
  permissions-file: permissions.yml
  update-folder: update
  ping-packet-limit: 100
  use-exact-login-location: false
  plugin-profiling: false
  connection-throttle: 4000
  query-plugins: true
  deprecated-verbose: default
  shutdown-message: 服务器已关闭
spawn-limits:
  monsters: 70
  animals: 15
  water-animals: 5
  water-ambient: 20
  water-underground-creature: 5
  axolotls: 5
  ambient: 15
chunk-gc:
  period-in-ticks: 600
ticks-per:
  animal-spawns: 400
  monster-spawns: 1
  water-spawns: 1
  water-ambient-spawns: 1
  water-underground-creature-spawns: 1
  axolotl-spawns: 1
  ambient-spawns: 1
  autosave: 6000
`,
        'spigot.yml': `# Spigot 配置文件
config-version: 12
settings:
  debug: false
  sample-count: 12
  player-shuffle: 0
  user-cache-size: 1000
  save-user-cache-on-stop-only: false
  moved-too-quickly-multiplier: 10.0
  moved-wrongly-threshold: 0.0625
  bungeecord: false
  late-bind: false
  netty-threads: 4
  timeout-time: 60
  restart-on-crash: true
  restart-script: ./start.sh
  attribute:
    maxHealth:
      max: 2048.0
    movementSpeed:
      max: 2048.0
    attackDamage:
      max: 2048.0
  log-villager-deaths: true
  log-named-deaths: true
messages:
  whitelist: 你不在白名单中！
  unknown-command: 未知命令
  server-full: 服务器已满！
  outdated-client: 客户端版本过低！请使用 {0}
  outdated-server: 服务端版本过低！请使用 {0}
  restart: 服务器正在重启
advancements:
  disable-saving: false
  disabled:
    - minecraft:story/disabled
players:
  disable-saving: false
world-settings:
  default:
    verbose: true
    view-distance: default
    simulation-distance: default
    thunder-chance: 100000
    merge-radius:
      item: 2.5
      exp: 3.0
    item-despawn-rate: 6000
    arrow-despawn-rate: 1200
    trident-despawn-rate: 1200
    wither-spawn-sound-radius: 0
    enable-zombie-pigmen-portal-spawns: true
    zombie-aggressive-towards-villager: true
    nerf-spawner-mobs: false
    mob-spawner-tick-rate: 1
    seed-bukkit: -746929818
`,
        'paper.yml': `# Paper 配置文件
config-version: 30
data-values:
  all: []
  items: []
  blocks: []
settings:
  book-size:
    page-max: 2560
    total-multiplier: 0.98
  player-connection-pending-limit: -1
  log-player-connections: true
  log-player-login-secure-random: true
  save-player-data: true
  sync-chunks-when-saving: true
  player-auto-save-rate: -1
  max-joins-per-tick: 5
  experience-merge-max-value: -1
  chunk-loading:
    basic:
      enable: true
      global-max-chunks-per-tick: 500
      global-max-concurrent-sends: 7
      max-concurrent-sends-per-player: 3
      autoconfigure-send-distance: true
      global-max-chunks-per-tick-threshold: 5000
    player-max-concurrent-sends: 3
    target-chunk-budget: 4.0
  load-permissions-file-before-plugins: true
  region-file-cache-size: 256
  incoming-packet-spam-threshold: 300
  save-queue-limit: 100
  sleep-between-chunk-saves: true
  alt-item-despawn-rate:
    enabled: true
    items:
      cobblestone: 12000
    random-despawn-rate:
      enabled: false
      items: []
  spark-check-interval: 10
  watchdog:
    early-warning-delay: 10000
    early-warning-every: 5000
timings:
  enabled: false
  verbose: false
  server-name-privacy: false
  hidden-config-entries:
    - database
    - settings.bungeecord-addresses
  history-interval: 300
  history-length: 7200
`,
        'leaves.yml': `# Leaves 配置文件
config-version: 1
settings:
  server-name: "Leaves 服务器"
  enable-leaves-features: true
  performance:
    enable-async-mob-spawning: true
    optimize-redstone: true
    optimize-explosions: true
    optimize-entity-activations: true
    optimize-chunk-system: true
  features:
    anti-cramming: true
    fast-dispenser: true
    fast-furnace: true
    fast-grindstone: true
    fast-loom: true
    fast-stonecutter: true
  misc:
    fix-piston-duplication: true
    fix-tnt-duplication: true
`
    };
    return samples[filename] ? { filename, content: samples[filename], isYaml: false } : null;
}

// ========== API 路由 ==========

// 获取服务器状态
app.get('/api/status', (req, res) => {
    const status = getServerStatus();
    res.json(status);
});

// 获取配置文件列表
app.get('/api/config', (req, res) => {
    const files = ['server.properties', 'bukkit.yml', 'spigot.yml', 'paper.yml', 'leaves.yml'];
    res.json({ files });
});

// 获取指定配置文件
app.get('/api/config/:filename', (req, res) => {
    const filename = req.params.filename;
    // 安全检查：防止目录遍历
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: '非法的文件名' });
    }
    const result = getConfigFile(filename);
    if (result) {
        res.json(result);
    } else {
        res.status(404).json({ error: `配置文件 ${filename} 未找到` });
    }
});

// 获取服务器目录信息
app.get('/api/info', (req, res) => {
    res.json({
        serverDir: config.serverDir || '未配置（使用示例数据）',
        hasServerDir: !!(config.serverDir && fs.existsSync(config.serverDir)),
        isDemo: !config.serverDir || !fs.existsSync(config.serverDir)
    });
});

// ========== BID 账号认证 ==========
const ACCOUNTS_PATH = path.join(__dirname, '..', 'data', 'accounts.json');

function loadAccounts() {
    try {
        if (fs.existsSync(ACCOUNTS_PATH)) {
            return JSON.parse(fs.readFileSync(ACCOUNTS_PATH, 'utf-8'));
        }
    } catch (err) {
        console.warn(`⚠️ 账号文件读取失败: ${err.message}`);
    }
    // 如果服务器目录下有 accounts.json，也尝试读取
    if (config.serverDir) {
        const serverAccounts = path.join(config.serverDir, 'accounts.json');
        if (fs.existsSync(serverAccounts)) {
            try {
                return JSON.parse(fs.readFileSync(serverAccounts, 'utf-8'));
            } catch (e) {}
        }
    }
    return [];
}

// BID 登录
app.post('/api/auth/login', (req, res) => {
    const { bid, password } = req.body;
    if (!bid || !password) {
        return res.json({ success: false, message: '请输入 BID 和密码' });
    }

    const accounts = loadAccounts();
    const user = accounts.find(a => a.bid === bid && a.password === password);

    if (user) {
        res.json({
            success: true,
            user: {
                bid: user.bid,
                displayName: user.displayName || user.bid,
                role: user.role || 'user'
            }
        });
    } else {
        res.json({ success: false, message: 'BID 或密码错误' });
    }
});

// 获取所有 BID 列表（仅返回用户名，不返回密码）
app.get('/api/auth/accounts', (req, res) => {
    const accounts = loadAccounts();
    res.json({
        accounts: accounts.map(a => ({
            bid: a.bid,
            displayName: a.displayName || a.bid,
            role: a.role || 'user'
        }))
    });
});

// ========== 配置文件监视（实时更新） ==========
let watcher = null;

function startFileWatcher() {
    if (watcher) watcher.close();

    if (!config.serverDir || !fs.existsSync(config.serverDir)) {
        console.log('📁 未配置服务器目录，使用模拟数据模式');
        return;
    }

    const watchFiles = ['server.properties', 'bukkit.yml', 'spigot.yml', 'paper.yml', 'leaves.yml'];
    watcher = chokidar.watch(
        watchFiles.map(f => path.join(config.serverDir, f)),
        {
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 500,
                pollInterval: 100
            }
        }
    );

    watcher.on('change', (filepath) => {
        const filename = path.basename(filepath);
        console.log(`🔄 配置文件已变更: ${filename}`);
        // 通过 WebSocket 通知所有客户端
        io.emit('config-update', { filename });
    });

    console.log(`👀 正在监视配置文件变更: ${config.serverDir}`);
}

// ========== 定期推送状态 ==========
setInterval(() => {
    const status = getServerStatus();
    io.emit('status', { type: 'status', payload: status });
}, config.pollingInterval || 5000);

// ========== WebSocket 连接 ==========
io.on('connection', (socket) => {
    console.log(`🔗 客户端已连接: ${socket.id}`);

    // 发送当前状态
    const status = getServerStatus();
    socket.emit('status', { type: 'status', payload: status });

    socket.on('disconnect', () => {
        console.log(`🔌 客户端已断开: ${socket.id}`);
    });
});

// ========== 启动服务器 ==========
const PORT = config.serverPort || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║   ⛏️ Minecraft 服务器状态面板         ║
    ║                                          ║
    ║   🌐 本地地址: http://localhost:${PORT}  ║
    ║   📁 服务器目录: ${(config.serverDir || '未配置（示例模式）').padEnd(20)} ║
    ║   📡 WebSocket: 已启用                   ║
    ║                                          ║
    ║   按 Ctrl+C 停止服务器                    ║
    ╚══════════════════════════════════════════╝
    `);

    startFileWatcher();

    if (!config.serverDir) {
        console.log('💡 提示: 要连接到实际的 Minecraft 服务器目录，请编辑 config.json 文件');
        console.log(`   设置 "serverDir" 为您的服务器目录路径，例如: "C:\\\\Minecraft\\\\server"`);
    }
});
