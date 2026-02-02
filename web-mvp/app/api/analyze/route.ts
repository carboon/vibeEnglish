import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeRequest, AnalyzeResponse } from '@/types';
import { analyzeVideoFramesFlash, analyzeVideoFramesWithSlidingWindow } from '@/lib/vision';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 秒超时

/**
 * 视频分析 API
 * POST /api/analyze
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { frames, useSlidingWindow = false } = body;

    // 验证输入
    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid frames input' },
        { status: 400 }
      );
    }

    // 限制最大帧数
    const maxFrames = 20;
    const framesToAnalyze = frames.slice(0, maxFrames);

    // 选择分析模式
    const result = useSlidingWindow
      ? await analyzeVideoFramesWithSlidingWindow(framesToAnalyze)
      : await analyzeVideoFramesFlash(framesToAnalyze);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Analysis failed' },
        { status: 500 }
      );
    }

    const response: AnalyzeResponse = {
      success: true,
      data: result
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
