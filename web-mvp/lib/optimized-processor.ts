/**
 * 并发处理优化模块
 * 自适应批大小、智能重试、进度持久化
 */

import { CacheEntry } from './cache';

/**
 * 网络条件评估
 */
interface NetworkCondition {
  latency: 'low' | 'medium' | 'high';
  bandwidth: 'slow' | 'medium' | 'fast';
  reliability: number; // 0-1
}

/**
 * 并发配置
 */
const CONCURRENCY_CONFIG = {
  // 批大小配置
  MIN_BATCH_SIZE: 3,               // 最小批次大小
  MAX_BATCH_SIZE: 10,              // 最大批次大小
  ADAPTIVE_STEP: 1,               // 每次调整步长

  // 重试策略
  MAX_RETRY_ATTEMPTS: 5,         // 最大重试次数
  BASE_RETRY_DELAY: 1000,          // 基础重试延迟（毫秒）
  MAX_RETRY_DELAY: 10000,          // 最大重试延迟（毫秒）
  RETRY_BACKOFF: 2.0,             // 退避因子

  // 并发控制
  MAX_CONCURRENT_REQUESTS: 10,     // 最大并发请求数
  MAX_QUEUE_SIZE: 50,               // 最大队列大小

  // 超时控制
  REQUEST_TIMEOUT: 30000,           // 单个请求超时（毫秒）
  TOTAL_TIMEOUT: 300000,           // 总处理超时（毫秒）

  // 资源限制
  MAX_MEMORY_MB: 512,             // 最大内存使用（MB）
  CLEANUP_THRESHOLD: 0.8           // 清理阈值（80%）
};

/**
 * 进度信息接口
 */
interface ProgressEntry {
  taskId: string;
  current: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  errors: string[];
}

/**
 * 优化处理管理器
 */
export class OptimizedProcessor {
  private activeRequests: Map<string, Promise<any>> = new Map();
  private requestQueue: Array<{ taskId: string; promise: Promise<any> }> = [];
  private networkCondition: NetworkCondition = {
    latency: 'medium',
    bandwidth: 'medium',
    reliability: 1.0
  };

  /**
   * 评估网络条件
   */
  async assessNetworkCondition(): Promise<void> {
    console.log('📡 Assessing network conditions...');

    const startTime = Date.now();
    const testUrl = 'https://httpbin.org/post';

    try {
      const response = await fetch(testUrl, {
        method: 'POST',
        body: JSON.stringify({ test: 'ping' }),
        signal: AbortSignal.timeout(5000)
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      // 评估延迟
      if (latency < 500) {
        this.networkCondition.latency = 'low';
        this.networkCondition.bandwidth = 'fast';
      } else if (latency < 1500) {
        this.networkCondition.latency = 'medium';
        this.networkCondition.bandwidth = 'medium';
      } else {
        this.networkCondition.latency = 'high';
        this.networkCondition.bandwidth = 'slow';
      }

      this.networkCondition.reliability = response.ok ? 1.0 : 0.5;

      console.log(`✅ Network assessed: latency=${latency}ms (${this.networkCondition.latency})`);

    } catch (error) {
      console.error('❌ Network assessment failed:', error);
      this.networkCondition.latency = 'high';
      this.networkCondition.bandwidth = 'slow';
      this.networkCondition.reliability = 0.3;
    }
  }

  /**
   * 计算自适应批大小
   */
  calculateAdaptiveBatchSize(): number {
    const { latency, bandwidth, reliability } = this.networkCondition;

    let batchSize = CONCURRENCY_CONFIG.MIN_BATCH_SIZE;

    // 根据延迟调整
    if (latency === 'low') {
      batchSize += 4; // 低延迟可以处理更大的批次
    } else if (latency === 'medium') {
      batchSize += 2;
    } else if (latency === 'high') {
      batchSize += 0; // 高延迟保持小批次
    }

    // 根据带宽调整
    if (bandwidth === 'fast') {
      batchSize += 2;
    } else if (bandwidth === 'slow') {
      batchSize -= 1;
    }

    // 根据可靠性调整
    batchSize = Math.floor(batchSize * reliability);

    // 限制在范围内
    return Math.max(
      CONCURRENCY_CONFIG.MIN_BATCH_SIZE,
      Math.min(batchSize, CONCURRENCY_CONFIG.MAX_BATCH_SIZE)
    );
  }

  /**
   * 计算智能重试延迟（指数退避 + 抖动）
   */
  calculateRetryDelay(attempt: number): number {
    // 指数退避
    const backoffDelay = Math.min(
      CONCURRENCY_CONFIG.MAX_RETRY_DELAY,
      CONCURRENCY_CONFIG.BASE_RETRY_DELAY * Math.pow(CONCURRENCY_CONFIG.RETRY_BACKOFF, attempt - 1)
    );

    // 添加随机抖动（避免雷群效应）
    const jitter = Math.random() * 1000; // 0-1 秒抖动

    return Math.floor(backoffDelay + jitter);
  }

  /**
   * 并发处理帧（带优化）
   */
  async processFramesOptimized(
    frames: string[],
    style: string,
    useSlidingWindow: boolean,
    onProgress?: (current: number, total: number, batch: number) => void
  ): Promise<{
    results: any[];
    failedFrames: number[];
    networkCondition: NetworkCondition;
    totalProcessingTime: number;
  }> {
    const startTime = Date.now();

    // 评估网络条件
    await this.assessNetworkCondition();
    const batchSize = this.calculateAdaptiveBatchSize();

    console.log(`📊 Network condition: ${JSON.stringify(this.networkCondition)}`);
    console.log(`📊 Adaptive batch size: ${batchSize}`);

    // 检查并发限制
    const activeCount = this.activeRequests.size;
    if (activeCount >= CONCURRENCY_CONFIG.MAX_CONCURRENT_REQUESTS) {
      console.warn(`⚠️  Concurrent limit reached (${activeCount}), queueing requests`);
    }

    const allResults: any[] = [];
    const allFailedFrames: number[] = [];
    let processedCount = 0;
    const totalFrames = frames.length;
    const batchCount = Math.ceil(totalFrames / batchSize);

    // 分批处理
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min((batchIndex + 1) * batchSize, totalFrames);
      const batchFrames = frames.slice(batchStart, batchEnd);

      console.log(`🔄 Processing batch ${batchIndex + 1}/${batchCount}: frames ${batchStart}-${batchEnd}`);

      try {
        // 等待可用并发槽
        while (this.activeRequests.size >= CONCURRENCY_CONFIG.MAX_CONCURRENT_REQUESTS) {
          console.log(`⏳ Waiting for available slots... (${this.activeRequests.size}/${CONCURRENCY_CONFIG.MAX_CONCURRENT_REQUESTS})`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 创建批处理 Promise
        const batchPromises = batchFrames.map((frame, frameIndex) => {
          const taskId = `frame_${batchStart + frameIndex}_${Date.now()}`;
          
          const promise = this.processFrameWithRetry(
            frame,
            batchStart + frameIndex,
            style,
            useSlidingWindow,
            taskId
          ).then(result => {
            this.activeRequests.delete(taskId);
            return result;
          }).catch(error => {
            this.activeRequests.delete(taskId);
            throw error;
          });

          this.activeRequests.set(taskId, promise);
          return promise;
        });

        // 等待批完成
        const batchResults = await Promise.all(batchPromises);

        // 处理结果
        const batchSuccessful = batchResults.filter(r => !r.error);
        const batchFailed = batchResults.filter(r => r.error);

        allResults.push(...batchSuccessful);
        allFailedFrames.push(...batchFailed.map((r, idx) => batchStart + idx));

        processedCount = batchEnd;

        // 报告进度
        if (onProgress) {
          onProgress(processedCount, totalFrames, batchIndex + 1);
        }

        // 批次间延迟（避免过载）
        if (batchIndex < batchCount - 1) {
          const delay = this.networkCondition.latency === 'low' ? 500 : 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        console.error(`❌ Batch ${batchIndex + 1} failed:`, error);
        // 整批失败
        batchFrames.forEach((_, frameIndex) => {
          allFailedFrames.push(batchStart + frameIndex);
        });
      }
    }

    const totalProcessingTime = Date.now() - startTime;

    console.log(`✅ Optimized processing complete`);
    console.log(`📊 Total time: ${totalProcessingTime}ms`);
    console.log(`📊 Success: ${allResults.length}/${totalFrames}`);
    console.log(`📊 Failed: ${allFailedFrames.length}/${totalFrames}`);

    return {
      results: allResults,
      failedFrames: allFailedFrames,
      networkCondition: this.networkCondition,
      totalProcessingTime
    };
  }

  /**
   * 处理单个帧（带智能重试）
   */
  private async processFrameWithRetry(
    frame: string,
    frameIndex: number,
    style: string,
    useSlidingWindow: boolean,
    taskId: string
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < CONCURRENCY_CONFIG.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const startTime = Date.now();

        // 调用分析 API
        const response = await fetch('/api/analyze-frame', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          'X-Request-ID': taskId,
            'X-Attempt-Number': String(attempt + 1)
          },
          body: JSON.stringify({
            frame,
            index: frameIndex,
            style,
            useSlidingWindow
          }),
          signal: AbortSignal.timeout(CONCURRENCY_CONFIG.REQUEST_TIMEOUT)
        });

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Analysis failed');
        }

        // 成功返回结果
        console.log(`✓ Frame ${frameIndex} (attempt ${attempt + 1}): ${processingTime}ms`);
        
        return {
          ...data.data,
          processingTime,
          attempt: attempt + 1,
          taskId
        };

      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️  Frame ${frameIndex} attempt ${attempt + 1} failed:`, error.message);

        // 最后一次尝试失败后返回错误
        if (attempt < CONCURRENCY_CONFIG.MAX_RETRY_ATTEMPTS - 1) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // 所有重试都失败，返回错误结果
    console.error(`❌ Frame ${frameIndex} failed after ${CONCURRENCY_CONFIG.MAX_RETRY_ATTEMPTS} attempts`);

    return {
      error: true,
      message: lastError?.message || 'Max retries exceeded',
      attempts: CONCURRENCY_CONFIG.MAX_RETRY_ATTEMPTS,
      taskId
    };
  }

  /**
   * 保存进度到 IndexedDB
   */
  async saveProgress(progress: ProgressEntry): Promise<void> {
    // 这里应该保存到 IndexedDB
    // 暂时只记录到 console
    console.log(`💾 Saving progress: ${progress.taskId} (${progress.current}/${progress.total}) - ${progress.status}`);
  }

  /**
   * 从 IndexedDB 加载进度
   */
  async loadProgress(taskId: string): Promise<ProgressEntry | null> {
    // 这里应该从 IndexedDB 加载
    console.log(`📂 Loading progress for: ${taskId}`);
    return null;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    console.log('🧹 Cleaning up optimized processor...');

    // 取消所有活跃请求
    this.activeRequests.forEach((promise, taskId) => {
      console.log(`🚫 Cancelling request: ${taskId}`);
      // 注意：AbortController 在实际实现中需要
    });

    this.activeRequests.clear();
    this.requestQueue = [];
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    activeRequests: number;
    queuedRequests: number;
    networkCondition: NetworkCondition;
    adaptiveBatchSize: number;
  } {
    return {
      activeRequests: this.activeRequests.size,
      queuedRequests: this.requestQueue.length,
      networkCondition: this.networkCondition,
      adaptiveBatchSize: this.calculateAdaptiveBatchSize()
    };
  }
}
