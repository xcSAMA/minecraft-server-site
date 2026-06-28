# ⛏️ Minecraft 服务器状态网站

一个现代化的 Minecraft 服务器状态监控网站，支持从本地服务器目录读取 YML 配置文件并实时展示。

## ✨ 功能

- 🎮 **服务器状态监控** — 实时显示在线状态、TPS、内存使用、在线玩家数
- ⚙️ **配置文件查看** — 浏览 `server.properties`、`bukkit.yml`、`spigot.yml`、`paper.yml`、`leaves.yml`
- 🔄 **实时更新** — YML 文件变更时自动推送更新到前端
- 🎨 **现代化 UI** — 毛玻璃效果、粒子背景、流畅动画、响应式设计
- 🔗 **加入弹窗** — 优雅的模态框展示服务器地址和加入步骤

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置服务器目录

编辑 `config.json`，设置您的 Minecraft 服务器目录路径：

```json
{
    "serverDir": "C:\\Minecraft\\Leaves-Server",
    "serverPort": 3001,
    "pollingInterval": 5000
}
```

> 💡 如果 `serverDir` 为空，服务器将以**示例模式**运行，显示模拟数据。

### 3. 启动

```bash
npm start
```

### 4. 访问

浏览器打开 http://localhost:3001

## 📁 项目结构

```
minecraft-server-site/
├── index.html          # 主页面
├── config.json         # 服务器配置
├── package.json        # Node.js 依赖
├── README.md           # 本文件
├── css/
│   └── style.css       # 样式（毛玻璃、动画、响应式）
├── js/
│   └── main.js         # 前端逻辑（数据获取、UI更新、Modal）
└── server/
    └── server.js       # 后端服务器（Express + WebSocket + YML 读取）
```

## 🔧 技术栈

- **前端**: 原生 HTML5 + CSS3 + JavaScript
- **后端**: Node.js + Express + Socket.IO
- **文件监控**: Chokidar
- **YML 解析**: js-yaml

## 📡 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/status` | GET | 获取服务器运行状态 |
| `/api/config` | GET | 获取配置文件列表 |
| `/api/config/:filename` | GET | 获取指定配置文件内容 |
| `/api/info` | GET | 获取服务器目录信息 |

## 🌐 WebSocket 事件

| 事件 | 方向 | 说明 |
|------|------|------|
| `status` | 服务端 → 客户端 | 服务器状态更新 |
| `config-update` | 服务端 → 客户端 | 配置文件发生变更 |

## 🎨 截图

启动后在浏览器打开 http://localhost:3001 即可查看效果。

---

Made with 💚 for Minecraft Leaves Server
