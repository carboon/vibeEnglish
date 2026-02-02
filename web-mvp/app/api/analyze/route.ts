import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { AnalyzeRequest, AnalyzeResponse } from '@/types';

const execAsync = promisify(exec);

/**
 * 视频分析 API v2
 * 直接调用现有的 Python 脚本
 */

export const runtime = 'nodejs';

// 临时目录
const TEMP_DIR = path.join(process.cwd(), '../temp_frames');
const OUTPUT_DIR = path.join(process.cwd(), '../');

/**
 * 保存 base64 图片为临时文件
 */
async function saveFrameImages(frames: string[]): Promise<string[]> {
  await fs.mkdir(TEMP_DIR, { recursive: true });

  const framePaths: string[] = [];
  for (let i = 0; i < frames.length; i++) {
    const base64Data = frames[i].replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const framePath = path.join(TEMP_DIR, `frame_${String(i).padStart(2, '0')}.jpg`);
    await fs.writeFile(framePath, buffer);
    framePaths.push(framePath);
  }

  return framePaths;
}

/**
 * 清理临时文件
 */
async function cleanupTempFrames() {
  try {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

/**
 * 调用 Python 分析脚本
 */
async function runPythonAnalysis(
  scriptPath: string,
  framePaths: string[]
): Promise<any | null> {
  try {
    const command = `cd .. && python ${scriptPath} ${framePaths.join(' ')}`;
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 300000, // 5 分钟超时
    });

    if (stderr) {
      console.error('Python stderr:', stderr);
    }

    // 读取输出结果
    let outputPath: string;
    if (scriptPath.includes('sliding')) {
      outputPath = path.join(OUTPUT_DIR, 'output_sliding.json');
    } else {
      outputPath = path.join(OUTPUT_DIR, 'output.json');
    }

    const resultData = await fs.readFile(outputPath, 'utf-8');
    return JSON.parse(resultData);

  } catch (error) {
    console.error('Python analysis error:', error);
    return null;
  }
}

/**
 * POST /api/analyze
 * 视频分析 API（直接调用 Python 脚本）
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
    const framesToProcess = frames.slice(0, maxFrames);

    console.log(`Processing ${framesToProcess.length} frames...`);

    // 保存图片为临时文件
    const framePaths = await saveFrameImages(framesToProcess);

    try {
      // 选择 Python 脚本
      const scriptPath = useSlidingWindow
        ? 'test_sliding.py'
        : 'test.py';

      // 运行 Python 分析
      const result = await runPythonAnalysis(scriptPath, framePaths);

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Analysis failed' },
          { status: 500 }
        );
      }

      const response: AnalyzeResponse = {
        success: true,
        data: {
          ...result,
          mode: useSlidingWindow ? 'sliding_window' : 'normal',
          total_frames: framesToProcess.length
        }
      };

      return NextResponse.json(response);

    } finally {
      // 清理临时文件
      await cleanupTempFrames();
    }

  } catch (error) {
    console.error('API error:', error);
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
    service: 'vibeenglish-api-v2',
    version: '2.0.0'
  });
}
