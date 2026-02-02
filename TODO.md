# TODO - VibeEnglish 可理解输入英语学习工具

## 项目概述
基于视频内容生成带词汇高亮的英文文稿，使用可理解输入（Comprehensible Input）方法学习英语。

## 核心技术栈
- **视觉分析**：GLM-4V-Flash / Qwen2-VL
- **语言处理**：spacy (分词) + wordfreq (Zipf frequency 难度计算)
- **难度分级**：CEFR 标准 (A1/A2 → B1/B2 → C1/C2)

---

## 里程碑 1：核心验证 (PoC)

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
- [ ] 验证滑动窗口提示词（叙事连贯性）
- [x] 验证词汇高亮准确性 ✅ 识别 47 个高级词汇，每帧推荐核心词
- [ ] 性能测试（响应时间、Token 消耗）

---

## 里程碑 2：本地 Web MVP

### M2.1 项目初始化
- [ ] 搭建 Next.js 项目框架
- [ ] 设计目录结构
- [ ] 配置依赖包

### M2.2 媒体处理模块
- [ ] 实现视频上传/选择
- [ ] 集成 ffmpeg.wasm 实现浏览器内抽帧
- [ ] 场景变化检测算法
- [ ] 图片压缩优化

### M2.3 后端 API 服务
- [ ] 搭建 Next.js API Routes
- [ ] 封装智谱 AI / 硅基流动 API
- [ ] 语言学处理服务（spacy 后端化）
- [ ] 滑动窗口上下文管理

### M2.4 前端渲染模块
- [ ] 视频播放器组件
- [ ] SRT 字幕同步显示
- [ ] 词汇高亮交互（点击弹出解释）
- [ ] 完整文稿侧边栏

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
- ✅ 初始代码库创建（test.py）
- ✅ 项目文档（可理解输入英语学习工具.md）

### 进行中
- 🚧 里程碑 1：核心验证

### 下一步
1. 优化 test.py 的错误处理
2. 准备测试视频
3. 实现视频抽帧功能

---

## 提交记录
- `init`: 初始化项目，添加核心文档和 test.py
- `21cf96b`: docs: add TODO.md with project roadmap and milestones
- `1f58cdd`: feat: improve test.py with error handling, retry logic, and better output
- `920bd1c`: feat: add video frame extraction and end-to-end pipeline
- `719ca6a`: test: successful end-to-end test with real video ✅ MILESTONE 1 COMPLETE
