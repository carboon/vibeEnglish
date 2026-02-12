# VibeEnglish - 可理解输入英语学习工具

基于视频的智能英语学习平台，通过 AI 多模态分析视频帧生成带词汇分级的英文叙述字幕，实现"可理解输入"（Comprehensible Input）学习法。

## 📖 项目简介

VibeEnglish 让学习者上传任意视频，系统自动：
1. 在浏览器端用 FFmpeg.wasm 提取关键帧
2. 将帧发送给智谱 AI (GLM-4V) 生成英文场景描述
3. 通过 NLP 管线标注 B2+ 词汇并生成 SRT 字幕
4. 在视频播放器中同步展示字幕和词汇信息

### 核心功能

| 功能 | 描述 |
|------|------|
| 🎬 浏览器端视频抽帧 | FFmpeg.wasm 在浏览器内提取帧，无需服务端处理视频 |
| 🤖 AI 多模态分析 | GLM-4V 模型看图说话，生成自然英语叙述 |
| 📚 CEFR 词汇分级 | spaCy + wordfreq 自动标注 B1/B2/C1/C2 词汇 |
| 🎯 滑动窗口上下文 | 帧间传递上下文，保证叙述连贯性 |
| 📝 SRT 字幕生成 | 自动生成标准 SRT 字幕，支持下载 |
| 💾 IndexedDB 缓存 | 分析结果本地缓存，避免重复处理 |
| 🎨 三种叙述风格 | Casual / Beginner / Literary 风格可选 |

---

## 🏗 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                     浏览器 (Frontend)                         │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐   │
│  │  page.tsx   │  │VideoPlayer │  │  SubtitleEditor /    │   │
│  │  主控制器   │  │ 视频+字幕  │  │  WordExplanation     │   │
│  └──────┬─────┘  └────────────┘  └──────────────────────┘   │
│         │                                                    │
│  ┌──────┴─────┐  ┌────────────┐  ┌──────────────────────┐   │
│  │  video.ts   │  │  cache.ts  │  │      srt.ts          │   │
│  │ FFmpeg.wasm │  │ IndexedDB  │  │ SRT 生成/解析        │   │
│  └────────────┘  └────────────┘  └──────────────────────┘   │
│                                                              │
│            │ POST /api/analyze (Next.js Route)               │
└────────────┼─────────────────────────────────────────────────┘
             │ frames (base64[])
             ▼
┌──────────────────────────────────────────────────────────────┐
│               Next.js API Route (route.ts)                   │
│              转发请求到 Python 后端                            │
└────────────┬─────────────────────────────────────────────────┘
             │ POST /analyze
             ▼
┌──────────────────────────────────────────────────────────────┐
│                Python 后端 (api_server.py)                    │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────┐     │
│  │  zai.py   │  │   spaCy    │  │     wordfreq         │     │
│  │ 智谱 AI   │  │   NLP      │  │   词频分级            │     │
│  └──────────┘  └────────────┘  └──────────────────────┘     │
│                                                              │
│  流程: 接收帧 → GLM-4V 生图描述 → NLP 后处理 → 返回结果     │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 项目结构

```
vibeEnglish/
├── web-mvp/                        # 主项目目录
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # 主页面 - 上传/处理/展示控制器
│   │   ├── layout.tsx              # 页面布局
│   │   ├── globals.css             # 全局样式
│   │   ├── api/
│   │   │   └── analyze/
│   │   │       └── route.ts        # API 路由 - 转发到 Python 后端
│   │   └── components/
│   │       ├── VideoPlayer.tsx     # 视频播放器 + SRT 字幕叠加
│   │       ├── SubtitleEditor.tsx  # 字幕列表编辑器
│   │       └── WordExplanation.tsx # 词汇详情弹窗
│   ├── lib/                        # 核心工具库
│   │   ├── video.ts               # FFmpeg.wasm 视频处理（抽帧）
│   │   ├── cache.ts               # IndexedDB 缓存管理
│   │   ├── srt.ts                 # SRT 字幕生成/解析/时间计算
│   │   ├── prompts.ts             # AI Prompt 模板
│   │   └── vision.ts              # 视觉处理辅助
│   ├── types/
│   │   └── index.ts               # TypeScript 类型定义
│   ├── api_server.py              # Python Flask 后端 API
│   ├── zai.py                     # 智谱 AI SDK 封装
│   ├── package.json               # 前端依赖
│   └── __tests__/                 # 前端测试
├── video_extractor.py             # 独立的视频抽帧脚本（OpenCV）
├── test.py                        # 集成测试脚本
└── README.md                      # 本文件
```

---

## 🔧 核心模块详解

### 前端数据流 (`page.tsx`)

`Home` 组件管理完整的处理流水线：

```
用户选择视频 → handleVideoChange()
    │
    ├── 创建 Blob URL 用于播放
    ├── 检查 IndexedDB 缓存（命中则直接展示）
    └── 状态重置为 idle
         │
         ▼ 用户点击 Analyze
    handleAnalyze() / processVideo()
    │
    ├── [extracting] FFmpeg.wasm 抽取 10 帧
    ├── [analyzing]  Blob URL → base64 转换 → POST /api/analyze
    ├── [complete]   结果 → SRT 生成 → 字幕展示 + 缓存
    └── [error]      错误处理
```

### 视频处理 (`lib/video.ts`)

`VideoProcessor` 类在浏览器中运行 FFmpeg.wasm：

- **`getVideoDuration()`** — 用 HTML5 `<video>` 元素获取时长（比 FFmpeg 更可靠）
- **`extractFrames()`** — 均匀抽取 N 帧，输出 JPEG Blob URL
- **`extractKeyFrames()`** — 基于帧间差异检测场景变化抽帧
- FFmpeg 核心文件从 `unpkg.com` CDN 加载

### 缓存系统 (`lib/cache.ts`)

`CacheManager` 基于 IndexedDB，按视频文件名 + 大小哈希作为键：

- 缓存提取的帧和分析结果
- 自动清理过期条目
- 存储容量管理（超限时删除最旧条目）

### SRT 字幕 (`lib/srt.ts`)

- **`resultToSRT()`** — 将 AI 分析结果转为 SRT 格式，时间由 `index × frameDuration` 计算
- **`parseSRT()`** — 解析 SRT 为结构化数据
- **`findCurrentSRTEntry()`** — 根据播放时间查找当前字幕

### Python 后端 (`api_server.py`)

Flask API 接受帧图片，逐帧调用智谱 AI：

```python
POST /analyze
# 请求体：
{
    "frames": ["base64_img_1", "base64_img_2", ...],
    "use_sliding_window": true   # 可选：帧间上下文传递
}

# 响应：
{
    "video_narrative": [
        {
            "frame_index": 0,
            "timestamp": "00:00",
            "sentence": "A golden retriever bounds across...",
            "advanced_vocabulary": [
                {"word": "bounds", "lemma": "bound", "level": "B2", ...}
            ],
            "core_word": "bounds",
            "vocabulary_count": 3
        },
        ...
    ],
    "mode": "sliding_window",
    "total_frames": 10
}
```

**处理流程：**
1. 逐帧构建 Prompt（含风格指令 + 上下文）
2. 调用 GLM-4V 多模态模型生成英文描述
3. spaCy 分词 + wordfreq 词频分析 → CEFR 分级
4. 返回带词汇标注的叙述结果

---

## 🚀 快速开始

### 前置要求

- **Node.js** ≥ 22
- **Python** ≥ 3.9
- **智谱 AI API Key**（已硬编码在 `api_server.py` 中，可替换）

### 1. 安装依赖

```bash
# 前端
cd web-mvp
npm install

# Python 后端
pip install flask flask-cors spacy wordfreq zhipuai pillow
python -m spacy download en_core_web_sm
```

### 2. 启动服务

需要**同时启动两个服务**：

```bash
# 终端 1 — Python 后端（端口 5001）
cd web-mvp
python api_server.py

# 终端 2 — Next.js 前端（端口 3000）
cd web-mvp
npm run dev
```

### 3. 使用

1. 浏览器打开 `http://localhost:3000`
2. 选择一个视频文件（mp4 格式）
3. 可选：调整 Caption Style 和 Narrative Mode
4. 点击 **Analyze** 开始处理
5. 等待抽帧和 AI 分析完成
6. 在播放器中观看视频 + 同步字幕
7. 在右侧面板浏览字幕列表和词汇标注

---

## 🛠 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (Turbopack) | 16.1.6 |
| UI | React | 19.2.3 |
| 样式 | Tailwind CSS | 4 |
| 状态 | React useState + useRef | — |
| 视频处理 | @ffmpeg/ffmpeg (WASM) | 0.12.15 |
| 缓存 | IndexedDB (原生 API) | — |
| 后端 | Flask + Flask-CORS | — |
| AI 模型 | 智谱 GLM-4V (glm-4.6v-flash) | — |
| NLP | spaCy (en_core_web_sm) | — |
| 词频 | wordfreq (Zipf frequency) | — |
| 语言 | TypeScript (前端) / Python (后端) | — |

---

## 🐛 故障排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| FFmpeg 加载失败 | 网络无法访问 unpkg.com CDN | 检查网络或使用代理 |
| Python 后端连接失败 | 后端未启动或端口错误 | 确认 `python api_server.py` 在端口 **5001** 运行 |
| 字幕内容为空 | 智谱 AI API 调用失败 | 检查 API Key 是否有效 |
| 分析卡住不动 | IndexedDB 缓存异常 | 浏览器 DevTools → Application → Clear Storage |
| 视频无法播放 | 浏览器不支持该编码 | 转换为 H.264 MP4 格式 |

---

## 🧪 测试

```bash
cd web-mvp

# 运行前端单元测试
npm test

# 检查后端健康状态
curl http://localhost:5001/health
```

---

## 📄 许可证

MIT License

**Happy Learning! 🎉**
