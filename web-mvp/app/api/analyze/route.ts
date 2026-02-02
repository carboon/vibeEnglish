import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeRequest, AnalyzeResponse, AnalysisResult } from '@/types';
import { generatePrompt } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 秒超时

/**
 * 带风格支持的 API
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest & { style?: string } = await request.json();
    const { frames, useSlidingWindow = false, style = 'casual' } = body;

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
        { success: false, error: `Invalid style: ${style}. Must be one of: ${validStyles.join(', ')}` },
        { status: 400 }
      );
    }

    // 限制最大帧数
    const maxFrames = 20;
    const framesToAnalyze = frames.slice(0, maxFrames);

    console.log(`🎬 Processing ${framesToAnalyze.length} frames with style: ${style}`);
    console.log(`📝 Mode: ${useSlidingWindow ? 'sliding window' : 'normal'}`);

    const all_narratives = [];
    let previousSentence = '';

    // 为每一帧生成 Prompt
    for (let i = 0; i < framesToAnalyze.length; i++) {
      const prompt = generatePrompt(
        style as 'casual' | 'beginner' | 'literary',
        useSlidingWindow,
        previousSentence
      );

      // 这里应该调用 Python 进行分析
      // 暂时使用模拟结果，实际会集成 Python
      console.log(`Frame ${i}: Prompt generated with style: ${style}`);

      // 模拟 AI 响应
      const mockNarrative = {
        frame_index: i,
        timestamp: `${(i * 2).toString().padStart(2, '0')}:${(i * 2 % 60).toString().padStart(2, '0')}`,
        sentence: `Sample ${style} narrative for frame ${i}`,
        advanced_vocabulary: [],
        core_word: '',
        vocabulary_count: 0
      };

      if (mockNarrative.sentence) {
        previousSentence = mockNarrative.sentence;
      }

      all_narratives.push(mockNarrative);
    }

    // 构建结果
    const result: AnalysisResult = {
      video_narrative: all_narratives,
      mode: useSlidingWindow ? 'sliding_window' : 'normal',
      total_frames: framesToAnalyze.length,
      style: style,
      context_type: useSlidingWindow ? 'narrative_continuity' : 'none'
    };

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

/**
 * GET /api/analyze
 * 健康检查和配置信息
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'vibeenglish-api-v2',
    version: '2.0.0',
    features: {
      styleSelection: true,
      supportedStyles: ['casual', 'beginner', 'literary'],
      slidingWindow: true,
      maxFrames: 20
    },
    styleDescriptions: {
      casual: 'Everyday conversational style (8-15 words)',
      beginner: 'A1/A2 beginner-friendly style (8-12 words)',
      literary: 'B1/C1 literary prose style (15-25 words)'
    }
  });
}
