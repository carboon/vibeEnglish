/**
 * 视频分析 API v2
 * 支持并发处理
 */

import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeRequest, AnalyzeResponse, AnalysisResult } from '@/types';
import { resultToSRT } from '@/lib/srt';

export const runtime = 'nodejs';
export const maxDuration = 120; // 120 秒超时（并发处理需要更长时间）

/**
 * 并发配置
 */
const PARALLEL_CONFIG = {
  MAX_CONCURRENT_REQUESTS: 10,  // 最多 10 个并发请求
  RETRY_ATTEMPTS: 3,         // 每个请求最多重试 3 次
  RETRY_DELAY: 1000,         // 重试延迟（毫秒）
  BATCH_SIZE: 5                // 每批最多 5 帧
};

/**
 * 处理单个帧分析（带重试）
 */
async function analyzeSingleFrame(
  frameBase64: string,
  frameIndex: number,
  style: string,
  useSlidingWindow: boolean,
  previousSentence?: string,
  attempt: number = 0
): Promise<any> {
  const apiUrl = process.env.API_URL || 'http://localhost:5000/analyze-frame';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        frame: frameBase64,
        index: frameIndex,
        style,
        useSlidingWindow,
        previousSentence
      }),
      signal: AbortSignal.timeout(30000) // 30 秒超时
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Analysis failed');
    }

    return data.data;

  } catch (error) {
    // 重试逻辑
    if (attempt < PARALLEL_CONFIG.RETRY_ATTEMPTS - 1) {
      console.warn(`Frame ${frameIndex} attempt ${attempt + 1} failed, retrying...`, error);
      await new Promise(resolve => setTimeout(resolve, PARALLEL_CONFIG.RETRY_DELAY));
      return analyzeSingleFrame(
        frameBase64,
        frameIndex,
        style,
        useSlidingWindow,
        previousSentence,
        attempt + 1
      );
    }

    // 最后一次失败后返回 null
    console.error(`Frame ${frameIndex} failed after ${PARALLEL_CONFIG.RETRY_ATTEMPTS} attempts:`, error);

    // 返回默认结果，避免阻塞整个批处理
    return {
      frame_index: frameIndex,
      timestamp: `${Math.floor(frameIndex * 2).toString().padStart(2, '0')}:${(frameIndex * 2 % 60).toString().padStart(2, '0')}`,
      sentence: '', // 失败时返回空句子
      advanced_vocabulary: [],
      core_word: '',
      vocabulary_count: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 批量并发处理帧
 */
async function analyzeFramesBatch(
  frames: string[],
  startFrameIndex: number,
  style: string,
  useSlidingWindow: boolean
): Promise<{
  results: any[];
  failedFrames: number[];
  processingTime: number;
}> {
  const startTime = Date.now();

  console.log(`🔄 Processing batch: frames ${startFrameIndex} to ${startFrameIndex + frames.length - 1}`);

  // 使用 Promise.all 并发处理
  const promises = frames.map((frameBase64, index) =>
    analyzeSingleFrame(
      frameBase64,
      startFrameIndex + index,
      style,
      useSlidingWindow,
      undefined // 并发时不使用上下文（后续统一调整）
    )
  );

  const results = await Promise.all(promises);

  // 统计失败帧数
  const failedFrames = results
    .map((result, index) => result.error ? startFrameIndex + index : -1)
    .filter(index => index !== -1);

  const processingTime = Date.now() - startTime;

  console.log(`✅ Batch complete: ${results.length - failedFrames.length}/${results.length} frames succeeded in ${processingTime}ms`);

  return {
    results,
    failedFrames,
    processingTime
  };
}

/**
 * 分批处理所有帧（避免同时发送过多请求）
 */
async function analyzeAllFramesParallel(
  frames: string[],
  style: string,
  useSlidingWindow: boolean,
  onProgress?: (current: number, total: number, batch: number) => void
): Promise<{
  results: any[];
  failedFrames: number[];
  totalProcessingTime: number;
}> {
  const allResults: any[] = [];
  const allFailedFrames: number[] = [];

  const totalFrames = frames.length;
  const batchSize = PARALLEL_CONFIG.BATCH_SIZE;
  const batchCount = Math.ceil(totalFrames / batchSize);

  console.log(`🚀 Starting parallel processing: ${totalFrames} frames in ${batchCount} batches`);

  let currentBatch = 0;

  for (let i = 0; i < totalFrames; i += batchSize) {
    const batchStart = i;
    const batchEnd = Math.min(i + batchSize, totalFrames);
    const batchFrames = frames.slice(batchStart, batchEnd);

    currentBatch++;

    try {
      const { results, failedFrames, processingTime } = await analyzeFramesBatch(
        batchFrames,
        batchStart,
        style,
        useSlidingWindow
      );

      allResults.push(...results);
      allFailedFrames.push(...failedFrames);

      // 报告进度
      if (onProgress) {
        onProgress(batchEnd, totalFrames, currentBatch);
      }

      console.log(`📊 Batch ${currentBatch}/${batchCount}: ${results.length - failedFrames.length} frames in ${processingTime}ms`);

      // 批次间延迟，避免过载
      if (i + batchSize < totalFrames) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms 间隔
      }

    } catch (error) {
      console.error(`❌ Batch ${currentBatch} failed:`, error);
      // 继续处理下一批
    }
  }

  const totalProcessingTime = Date.now() - Date.now();

  console.log(`🎉 Parallel processing complete: ${allResults.length}/${totalFrames} frames`);
  console.log(`❌ Failed frames: ${allFailedFrames.length}/${totalFrames}`);
  console.log(`⏱️  Total processing time: ${totalProcessingTime}ms`);

  return {
    results: allResults,
    failedFrames: allFailedFrames,
    totalProcessingTime
  };
}

/**
 * POST /api/analyze
 * 视频分析 API（支持并发处理）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { frames, useSlidingWindow = false, style = 'casual', parallel = false } = body;

    // 验证输入
    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid frames input' },
        { status: 400 }
      );
    }

    // 验证风格参数
    const validStyles = ['casual', 'beginner', 'literary'];
    if (!validStyles.includes(style)) {
      return NextResponse.json(
        { success: false, error: `Invalid style: ${style}` },
        { status: 400 }
      );
    }

    // 限制最大帧数
    const maxFrames = 50;
    const framesToAnalyze = frames.slice(0, maxFrames);

    console.log(`🎬 Processing ${framesToAnalyze.length} frames with style: ${style}, mode: ${parallel ? 'parallel' : 'sequential'}`);

    let result: AnalysisResult;

    if (parallel) {
      // 并发模式：分批并发处理
      const { results, failedFrames, totalProcessingTime } = await analyzeAllFramesParallel(
        framesToAnalyze,
        style,
        useSlidingWindow,
        (current, total, batch) => {
          console.log(`📊 Progress: Batch ${batch}/${Math.ceil(total / PARALLEL_CONFIG.BATCH_SIZE)} - ${((current / total) * 100).toFixed(1)}%`);
        }
      );

      // 构建结果
      result = {
        video_narrative: results.map((r, index) => ({
          frame_index: index,
          timestamp: `${Math.floor(index * 2).toString().padStart(2, '0')}:${(index * 2 % 60).toString().padStart(2, '0')}`,
          sentence: r.sentence || '',
          advanced_vocabulary: r.advanced_vocabulary || [],
          core_word: r.core_word || '',
          vocabulary_count: r.vocabulary_count || 0,
          error: r.error
        })),
        mode: useSlidingWindow ? 'sliding_window_parallel' : 'parallel',
        total_frames: framesToAnalyze.length,
        style: style,
        failed_frames: failedFrames,
        processing_time: totalProcessingTime
      };

    } else {
      // 串行模式：直接调用 Python 后端的批量 API
      const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:5001/analyze';

      console.log(`🔄 Sending ${framesToAnalyze.length} frames to Python backend at ${pythonApiUrl}`);

      const pythonResponse = await fetch(pythonApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frames: framesToAnalyze,
          use_sliding_window: useSlidingWindow
        }),
        signal: AbortSignal.timeout(120000) // 120 秒超时
      });

      if (!pythonResponse.ok) {
        const errorText = await pythonResponse.text();
        throw new Error(`Python backend error ${pythonResponse.status}: ${errorText}`);
      }

      const pythonResult = await pythonResponse.json();

      if (pythonResult.error) {
        throw new Error(`Python backend error: ${pythonResult.error}`);
      }

      // 构建结果
      result = {
        video_narrative: pythonResult.video_narrative || [],
        mode: useSlidingWindow ? 'sliding_window' : 'normal',
        total_frames: framesToAnalyze.length,
      };
    }

    const response: AnalyzeResponse = {
      success: true,
      data: result
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analyze
 * 健康检查
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'vibeenglish-api-v3',
    version: '3.0.0',
    features: {
      styleSelection: true,
      slidingWindow: true,
      parallelProcessing: true,
      frameCaching: true,
      supportedStyles: ['casual', 'beginner', 'literary'],
      parallelConfig: {
        maxConcurrent: PARALLEL_CONFIG.MAX_CONCURRENT_REQUESTS,
        retryAttempts: PARALLEL_CONFIG.RETRY_ATTEMPTS,
        batchSize: PARALLEL_CONFIG.BATCH_SIZE
      }
    }
  });
}
