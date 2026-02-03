# VibeEnglish - 可理解输入英语学习工具

基于视频的智能英语学习平台，通过 AI 生成带词汇分级的英文文稿，实现"可理解输入"（Comprehensible Input）。

## 📖 项目简介

VibeEnglish 将视频转换为适合语言学习者的英文文稿，自动标注 B2 以上词汇，支持视频与字幕同步播放，让学习者在真实的视频场景中高效学英语。

### 核心功能

- 🎬 **视频关键帧提取** - 基于场景变化智能抽帧
- 🤖 **AI 多模态生成** - 使用 GLM-4V/Qwen2-VL 生成英文描述
- 📚 **词汇分级标注** - 自动识别并标注 CEFR B2+ 词汇
- 🎯 **叙事连贯优化** - 滑动窗口机制保证文稿连贯性
- 📱 **本地 Web MVP** - 浏览器内完整工作流

## 🛠 技术栈

### 前端 (Next.js)
- **框架**: Next.js 16.1.6 + React 19
- **样式**: Tailwind CSS 4
- **状态管理**: Zustand
- **语言**: TypeScript

### 后端 (Python)
- **API 框架**: Flask + Flask-CORS
- **视频处理**: OpenCV
- **NLP**: spaCy + wordfreq
- **AI**: Zhipu AI SDK (GLM-4V)

### 核心依赖
- `@ffmpeg/ffmpeg` - 浏览器端视频处理
- `zai` - 智谱 AI 客户端

## 🚀 快速开始

### 前置要求

- Node.js >= 22
- Python >= 3.9
- npm 或 pnpm

### 一键安装依赖

```bash
# 安装前端依赖
cd /Volumes/HDD/dev/vibeEnglish/web-mvp
npm install

# 或使用 pnpm（推荐）
pnpm install
```

### 运行项目

项目采用 **前后端分离** 架构，需要同时启动两个服务：

#### 1️⃣ 启动后端 API 服务器

```bash
cd /Volumes/HDD/dev/vibeEnglish/web-mvp
python api_server.py
```

后端默认运行在 `http://localhost:5000`

#### 2️⃣ 启动前端开发服务器（新终端）

```bash
cd /Volumes/HDD/dev/vibeEnglish/web-mvp
npm run dev
```

前端访问地址：`http://localhost:3000`

### 📋 完整启动脚本

如果你想在同一终端启动两个服务（后台运行）：

```bash
cd /Volumes/HDD/dev/vibeEnglish/web-mvp

# 启动后端（后台）
python api_server.py &
BACKEND_PID=$!

# 启动前端（前台）
npm run dev

# 停止后端（Ctrl+C 停止前端后执行）
kill $BACKEND_PID
```

## 🔧 编译与生产部署

### 开发模式（热更新）
```bash
npm run dev
```

### 生产构建
```bash
# 构建前端
npm run build

# 启动生产服务器
npm start
```

### 代码检查
```bash
npm run lint
```

### 运行测试
```bash
npm test
```

## 📁 项目结构

```
vibeEnglish/
├── web-mvp/                    # Next.js 前端项目
│   ├── app/                    # Next.js App Router 页面
│   ├── lib/                    # 工具函数和库
│   ├── public/                 # 静态资源
│   ├── api_server.py           # Flask 后端 API
│   ├── generate_subtitles.py   # 字幕生成脚本
│   ├── package.json            # 前端依赖配置
│   └── README.md               # 前端说明
├── video_extractor.py          # 视频抽帧模块
├── test.py                    # 测试脚本
├── TODO.md                    # 待办事项
├── 可理解输入英语学习工具.md    # 项目设计文档（中文）
└── README.md                  # 本文件
```

## 🎯 核心模块说明

### 1. 视频抽帧 (video_extractor.py)

支持三种抽帧模式：

```python
from video_extractor import VideoFrameExtractor

# 模式 1: 按时间间隔提取
extractor = VideoFrameExtractor('video.mp4', 'output')
frames = extractor.extract_frames_by_interval(interval_seconds=2.0)

# 模式 2: 基于场景变化提取
frames = extractor.extract_key_frames(threshold=30.0)

# 模式 3: 均匀抽取固定数量
frames = extractor.extract_fixed_frames(num_frames=10)
```

### 2. 字幕生成 (api_server.py)

Flask API 端点：

- `POST /api/extract-frames` - 提取视频帧
- `POST /api/generate-subtitles` - 生成 AI 字幕
- `POST /api/analyze-vocabulary` - 词汇分级分析

### 3. 前端页面 (web-mvp/app/)

- `page.tsx` - 主页面（视频上传和处理）
- `api/` - API 路由（如有）

## 🧪 测试

### 运行模拟字幕生成
```bash
cd /Volumes/HDD/dev/vibeEnglish/web-mvp
python simple_generate_subtitles.py
```

生成文件：
- `test_subtitles.json` - JSON 格式字幕
- `test_subtitles.srt` - SRT 格式字幕

### 运行前端测试
```bash
cd /Volumes/HDD/dev/vibeEnglish/web-mvp
npm test
```

## 📚 API 使用示例

### 调用视频分析 API

```bash
curl -X POST http://localhost:5000/api/extract-frames \
  -F "video=@test_video.mp4"
```

### 调用字幕生成 API

```bash
curl -X POST http://localhost:5000/api/generate-subtitles \
  -H "Content-Type: application/json" \
  -d '{
    "frames": ["frame1.jpg", "frame2.jpg"],
    "style": "casual"
  }'
```

## 🎓 学习资源

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Flask 文档](https://flask.palletsprojects.com)
- [OpenCV 教程](https://docs.opencv.org)

## 🐛 故障排查

### 问题: 无法启动前端
**解决方案**:
```bash
# 检查 Node 版本
node --version  # 需要 >= 22

# 清除缓存重装
rm -rf node_modules package-lock.json
npm install
```

### 问题: Python 后端报错
**解决方案**:
```bash
# 安装 Python 依赖
pip install flask flask-cors spacy wordfreq zai pillow opencv-python

# 下载 spaCy 模型
python -m spacy download en_core_web_sm
```

### 问题: 端口被占用
**解决方案**:
```bash
# 修改 api_server.py 中的端口（默认 5000）
# 或修改 .env.local 中的端口配置
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 LICENSE 文件

## 📮 联系方式

- 项目主页: [GitHub](https://github.com/carboon/vibeEnglish)
- 问题反馈: [Issues](https://github.com/carboon/vibeEnglish/issues)

---

**Happy Learning! 🎉**
