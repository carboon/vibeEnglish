/**
 * 视觉分析模块
 * 调用 Python 子进程进行视频帧分析
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { AnalysisResult } from '@/types';

const execAsync = promisify(exec);

/**
 * 调用 Python 脚本分析视频帧（普通模式）
 */
export async function analyzeVideoFramesFlash(
  frames: string[]
): Promise<AnalysisResult | null> {
  try {
    const pythonScript = path.join(process.cwd(), '../test.py');
    const args = frames.map((_, i) =>
      `../test_output/frames/frame_${String(i).padStart(2, '0')}.jpg`
    );

    const command = `cd ../ && python test.py ${args.join(' ')}`;
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd()
    });

    if (stderr) {
      console.error('Python stderr:', stderr);
    }

    // 从 output.json 读取结果
    const fs = await import('fs/promises');
    const resultPath = path.join(process.cwd(), '../output.json');
    const resultData = await fs.readFile(resultPath, 'utf-8');
    return JSON.parse(resultData) as AnalysisResult;

  } catch (error) {
    console.error('Analysis error:', error);
    return null;
  }
}

/**
 * 调用 Python 脚本分析视频帧（滑动窗口模式）
 */
export async function analyzeVideoFramesWithSlidingWindow(
  frames: string[]
): Promise<AnalysisResult | null> {
  try {
    const pythonScript = path.join(process.cwd(), '../test_sliding.py');
    const args = frames.map((_, i) =>
      `../test_output/frames/frame_${String(i).padStart(2, '0')}.jpg`
    );

    const command = `cd ../ && python test_sliding.py ${args.join(' ')}`;
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd()
    });

    if (stderr) {
      console.error('Python stderr:', stderr);
    }

    // 从 output_sliding.json 读取结果
    const fs = await import('fs/promises');
    const resultPath = path.join(process.cwd(), '../output_sliding.json');
    const resultData = await fs.readFile(resultPath, 'utf-8');
    return JSON.parse(resultData) as AnalysisResult;

  } catch (error) {
    console.error('Sliding window analysis error:', error);
    return null;
  }
}
