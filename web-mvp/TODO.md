# TODO - VibeEnglish 可理解输入英语学习工具

## 项目概述
基于视频内容生成带词汇高亮的英文文稿，使用可理解输入（Comprehensible Input）方法学习英语。

## 核心技术栈
- **视觉分析**：GLM-4V-Flash / Qwen2-VL
- **语言处理**：spacy (分词) + wordfreq (Zipf frequency 难度计算)
- **难度分级**：CEFR 标准 (A1/A2 → B1/B2 → C1/C2)

---

## 里程碑 1：核心验证 ✅ (PoC) - COMPLETE

### M1.1 完善现有 test.py 功能
- [x] 图片转 base64 编码
- [x] 调用 GLM-4V-Flash 生成描述 + 物体坐标
- [x] 语言学后处理（分词、难度分级、核心词选择）
- [x] 优化 Prompt 稳定性（JSON 格式校验）
- [x] 添加错误处理和重试机制
- [x] 添加结果摘要打印和 JSON 导出

### M1.2 准备测试视频
- [x] 安装 OpenCV 和视频抽帧模块
- [x] 实现视频抽帧功能（固定间隔/均匀抽取/关键帧检测）
- [x] 实现端到端流程测试（pipeline_test.py）
- [x] 完成模拟视频测试（3 帧图片模拟）
- [x] 从免费视频源下载测试视频（Big Buck Bunny 10s）
- [x] 测试完整流程：真实视频 → 抽帧 → AI 分析 → 生成文稿

### M1.3 验证核心功能
- [x] 多帧测试（3-5 帧连续）✅ 成功测试 5 帧视频
- [x] 验证滑动窗口提示词（叙事连贯性）✅ 实现 test_sliding.py，对比测试完成
- [x] 验证词汇高亮准确性 ✅ 识别 47 个高级词汇，每帧推荐核心词
- [ ] 性能测试（响应时间、Token 消耗）

**✅ MILESTONE 1 COMPLETE** - 详见 MILESTONE_1_SUMMARY.md

---

## 里程碑 2：本地 Web MVP 🚧 (IN PROGRESS)

### M2.1 项目初始化
- [x] 搭建 Next.js 项目框架
- [x] 设计目录结构
- [x] 配置依赖包（TypeScript, Tailwind, FFmpeg）

### M2.2 媒体处理模块
- [x] 集成 FFmpeg.wasm（lib/video.ts）
- [x] 实现视频上传/选择
- [ ] 实现浏览器内抽帧（暂用 Python 处理）
- [ ] 场景变化检测算法
- [ ] 图片压缩优化

### M2.3 后端 API 服务
- [x] 搭建 Next.js API Routes (app/api/analyze/route.ts)
- [x] 集成 Python 脚本（test.py/test_sliding.py）
- [x] 语言学处理服务（spacy + wordfreq）
- [x] 滑动窗口上下文管理

### M2.4 前端渲染模块
- [x] 视频上传 UI
- [x] 滑动窗口选项切换
- [ ] 视频播放器组件
- [ ] SRT 字幕同步显示
- [x] 词汇高亮展示（带 CEFR 等级）
- [ ] 点击弹出解释
- [x] 完整文稿展示（带上下文）
- [ ] 统计信息面板

### M2.5 集成测试
- [ ] 本地端到端测试
- [ ] 不同视频类型测试（动画、真人、纪录片）

---

## 里程碑 3：可理解性输入优化

### M3.1 叙事质量优化
- [ ] Prompt 优化：文学性、描述性语言
- [ ] 滑动窗口策略调整（保持语境连贯）
- [ ] 多模型对比（GLM vs Qwen）

### M3.2 核心词筛选算法
- [ ] 多候选词评分算法
- [ ] 语境相关性计算
- [ ] 词频 + 语境加权

### M3.3 UI/UX 优化
- [ ] AI 解释弹窗设计
- [ ] 词汇收藏功能
- [ ] 进度追踪（观看时长、掌握词汇）

---

## 里程碑 4：多端与工程化

### M4.1 Flutter 适配
- [ ] 架构设计（共享逻辑层）
- [ ] iOS 本地视频读取
- [ ] Android 本地视频读取
- [ ] 移动端 UI 适配

### M4.2 性能优化
- [ ] IndexedDB 本地缓存
- [ ] 增量抽帧策略
- [ ] API 调用批处理

### M4.3 云端同步（可选）
- [ ] 用户账户系统
- [ ] 学习进度同步
- [ ] 词汇云端同步

---

## 进度跟踪

### 已完成
- ✅ Milestone 1: PoC 核心验证
- ✅ 滑动窗口叙事优化
- ✅ Next.js Web MVP 项目初始化
- ✅ FFmpeg.wasm 集成框架
- ✅ API 路由结构搭建

### 进行中
- 🚧 Milestone 2: Web MVP 开发

### 下一步
1. 完善视频抽帧实现
2. 连接 Python 后端
3. 实现词汇高亮交互

---

## 提交记录
### Milestone 1
- `init`: 初始化项目
- `21cf96b`: docs: add TODO.md
- `1f58cdd`: feat: improve test.py
- `920bd1c`: feat: add video frame extraction
- `719ca6a`: test: successful end-to-end test
- `c8bd614`: feat: sliding window for continuity
- `076f717`: docs: mark M1 complete
- `3e52f0c`: docs: M1 summary

### Milestone 2
- `c4387c3`: feat: initialize Next.js web MVP with video processing
