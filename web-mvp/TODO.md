# TODO - VibeEnglish 可理解输入英语学习工具

## 项目概述
基于视频内容生成带词汇高亮的英文文稿，使用可理解输入（Comprehensible Input）方法学习英语。

## 核心技术栈
- **视觉分析**：GLM-4V-Flash / Qwen2-VL
- **语言处理**：spacy (分词) + wordfreq (Zipf frequency 难度计算)
- **难度分级**：CEFR 标准 (A1/A2 → B1/B2 → C1/C2)
- **Web 框架**：Next.js 16.1.6 + TypeScript + Tailwind CSS
- **测试框架**：Jest + React Testing Library

---

## 里程碑 1：核心验证 ✅ (COMPLETE)

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

**✅ MILESTONE 1 COMPLETE**
详见：MILESTONE_1_SUMMARY.md

---

## 里程碑 2：本地 Web MVP ✅ (COMPLETE)

### M2.1 项目初始化
- [x] 搭建 Next.js 项目框架（16.1.6）
- [x] 设计目录结构（app/, lib/, components/, __tests__/, types/）
- [x] 配置依赖包（TypeScript, Tailwind, FFmpeg, Jest）

### M2.2 媒体处理模块
- [x] 集成 FFmpeg.wasm（lib/video.ts）
- [x] 实现视频上传/选择
- [x] 实现浏览器内抽帧（FFmpeg.wasm）
- [x] 实现均匀分布抽帧（自定义帧数）
- [x] 实现关键帧检测（场景变化算法，基于像素差异）
- [x] 视频时长获取（ffprobe）
- [x] 图片压缩优化（scale=1280:-2, q:v=2）
- [x] 临时文件自动清理

### M2.3 后端 API 服务
- [x] 搭建 Next.js API Routes (app/api/analyze/route.ts)
- [x] 集成 Python 脚本（test.py/test_sliding.py）
- [x] 语言学处理服务（spacy + wordfreq）
- [x] 滑动窗口上下文管理
- [x] 临时文件保存机制（temp_frames/ 目录）
- [x] 错误处理和重试机制
- [ ] 临时文件自动清理（Python 端）

### M2.4 前端渲染模块
- [x] 视频上传 UI（拖拽 + 点击选择）
- [x] 滑动窗口选项切换（开关）
- [x] 视频播放器组件（VideoPlayer.tsx）
  - 播放/暂停控制
  - 进度条拖拽
  - 音量控制
  - 时间显示（当前/总）
  - 外部时间同步
- [x] SRT 字幕同步显示
  - 字幕覆盖层（底部定位）
  - 进度指示器（当前字幕条目/进度）
  - 字幕计数器（总字数显示）
- [x] 词汇高亮展示（带 CEFR 等级）
- [x] 点击弹出解释（WordExplanation.tsx）
  - 词义显示
  - 频率信息
  - Lemma（基础形式）
  - 例句展示
  - 学习提示
  - 关闭行为（按钮 + 点击外部）
  - 颜色编码（C1/C2: 红色，B2: 橙色等）
- [x] 完整文稿展示（带上下文）
- [x] 统计信息面板（总帧数、总词汇数）

### M2.5 单元测试
- [x] VideoPlayer 组件测试（__tests__/VideoPlayer.test.tsx）
  - 测试覆盖率：80%
  - 测试用例：10 个
  - 测试功能：渲染、控制、回调、时间同步
- [x] WordExplanation 弹窗组件测试（__tests__/WordExplanation.test.tsx）
  - 测试覆盖率：65%
  - 测试用例：17 个
  - 测试功能：词义显示、加载状态、关闭行为、颜色编码
- [x] FFmpeg 抽帧逻辑测试（__tests__/VideoExtraction.test.ts）
  - 测试覆盖率：100%
  - 测试用例：10 个
  - 测试功能：间隔计算、时间格式化、文件验证、缩放计算、内存估算
- [x] SRT 字幕生成测试（__tests__/SRT.test.ts）
  - 测试覆盖率：100%
  - 测试用例：21 个
  - 测试功能：SRT 格式转换、时间戳解析、条目查找、进度计算、毫秒处理
- [x] 端到端集成测试（完整流程）
- [ ] 不同视频类型测试（动画、真人、纪录片）

**M2 当前进度：约 90%**
- **测试覆盖率目标：85%（当前约 85%）**

---

## 里程碑 3：可理解性输入优化 🚧 (IN PROGRESS)

### M3.1 Prompt 优化与风格选择
- [ ] 日常口语风格（Casual Spoken）选项
  - 适合日常交流
  - 词汇简单、常用
  - 句式自然、非正式
  - Prompt 设计：使用口语化语言，贴近真实对话

- [ ] 低阶入门风格（Beginner Friendly）选项
  - 适合 A1/A2 级学习者
  - 词汇简单、高频
  - 句式短小、清晰
  - Prompt 设计：避免复杂语法，使用基础词汇

- [ ] 散文文学风格（Literary Prose）选项
  - 适合 B1/C1 学习者
  - 词汇丰富、描写性
  - 句式优雅、连贯
  - Prompt 设计：文学性表达，使用复杂词汇和从句

- [ ] 用户界面风格选择（UI 控件）
  - 下拉菜单选择风格
  - 每种风格的说明和示例
  - 默认风格：日常口语
  - Prompt 动态注入（根据风格调整描述要求）

### M3.2 性能优化与缓存
- [x] 抽帧内容缓存（避免重复抽帧）
  - 保存提取的帧到 IndexedDB
  - 支持重新生成字幕（跳过抽帧，直接使用缓存）
  - 缓存管理（清理过期缓存）

- [ ] 并发字幕生成
  - 批量并发请求 API
  - 而非串行（一帧接着一帧）
  - Promise.all 批处理
  - 进度条显示并发状态

- [ ] 整体字幕调整与连贯性
  - 收集所有字幕后进行整体调整
  - 确保时间顺序和叙事连贯
  - 优化首尾衔接
  - 移除重复内容

### M3.3 高级 Prompt 技术
- [ ] Few-Shot Prompt 示例
  - 在 Prompt 中提供示例对话
  - 模拟多轮对话引导风格
  - Context compression（语境压缩）

- [ ] Chain-of-Thought (思维链）
  - 要求模型先分析、再生成
  - 提供推理过程（可选）
  - 提升词汇准确性和连贯性

- [ ] 模板化 Prompt 系统
  - 可复用的 Prompt 模板
  - 变量注入（风格、难度、主题）
  - 支持 Prompt 版本管理

### M3.4 字幕导出与分享
- [ ] 多格式导出
  - 支持 SRT、VTT、ASS 格式
  - 自定义时间偏移调整
  - 样式自定义（字体、颜色、位置）

- [ ] 字幕编辑功能
  - 在线编辑器（简单的文本编辑）
  - 时间轴调整
  - 字幕合并/拆分

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
- ✅ Milestone 2: 本地 Web MVP（90% 完成）
  - 项目初始化
  - FFmpeg.wasm 浏览器端抽帧
  - Python 后端集成
  - 视频播放器 + SRT 同步
  - 词汇解释弹窗
  - 完整端到端集成测试

### 进行中
- 🚧 Milestone 3: 可理解性输入优化
  - Prompt 优化（计划中）
  - 性能优化（计划中）
  - 高级 Prompt 技术（计划中）

### 下一步
1. **实现 M3.1**：三种风格选项（日常口语/入门/文学）
2. **实现 M3.2**：缓存 + 并发生成 + 整体调整
3. **集成测试**：风格选择的端到端测试

---

## 技术债务

- [ ] Python 临时文件未自动清理（temp_frames/ 目录）
- [ ] 错误处理需要完善（特别是 AI 调用失败）
- [ ] 测试覆盖率目标：85%（当前约 85%）

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
- `c4387c3`: feat: initialize Next.js web MVP
- `726c18d`: docs: update TODO.md
- `267790a`: feat: integrate Python backend
- `bc4770b`: feat: add VideoPlayer component
- `3c294a6`: feat: add WordExplanation component
- `4df0894`: test: add FFmpeg.wasm extraction
- `5cfd225`: docs: complete rewrite of TODO.md
- `08fd5cb`: feat: implement browser-side video extraction
- `df741ef`: docs: update TODO.md
- `efd923a`: feat: implement SRT subtitle sync
- `8af300e`: docs: update TODO.md - reflect SRT
- `361816c`: feat: end-to-end integration

### Milestone 3
- `ec0aea6`: docs: update TODO.md - Milestone 2 complete, prepare for M3

---

## 项目统计

### 代码统计
- **总提交数**: 23 次
- **文件总数**: 90+ 个
- **代码行数**: ~9,000 行

### 功能模块
1. **视频分析核心** ✅ - GLM-4V-Flash + spacy + wordfreq
2. **滑动窗口优化** ✅ - 叙事连贯性提升
3. **视频抽帧** ✅ - FFmpeg.wasm（浏览器端）+ 场景检测
4. **API 服务** ✅ - Next.js Routes + Python 集成
5. **视频播放器** ✅ - 完整播放控制 + SRT 字幕同步
6. **词汇弹窗** ✅ - 交互式词义解释
7. **单元测试** ✅ - Jest + React Testing Library（85% 覆盖率）

---

**最后更新**: 2026-02-03
**状态**: Milestone 2 完成 ✅，准备开始 Milestone 3（可理解性输入优化）
