/**
 * 视频处理模块
 * 使用 FFmpeg.wasm 在浏览器端进行视频抽帧
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { VideoFrame } from '@/types';

export class VideoProcessor {
  private ffmpeg: FFmpeg | null = null;

  async initialize(): Promise<void> {
    if (this.ffmpeg) return;

    this.ffmpeg = new FFmpeg();

    // 加载 FFmpeg 核心文件
    await this.ffmpeg.load({
      coreURL: await toBlobURL(
        new Uint8Array(
          await (
            await fetch('https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js')
          ).arrayBuffer()
        ),
        'video/mp4'
      ),
    });
  }

  /**
   * 从视频文件中均匀抽取帧
   * @param videoFile 视频文件
   * @param frameCount 要抽取的帧数
   * @returns 抽取的帧列表
   */
  async extractFrames(
    videoFile: File,
    frameCount: number = 10
  ): Promise<VideoFrame[]> {
    await this.initialize();

    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }

    // 写入视频文件
    const inputName = 'input.mp4';
    await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    // 获取视频时长
    const duration = await this.getVideoDuration(inputName);
    const interval = duration / frameCount;

    const frames: VideoFrame[] = [];

    for (let i = 0; i < frameCount; i++) {
      const timestamp = Math.floor(i * interval);
      const frameName = `frame_${String(i).padStart(6, '0')}.jpg`;

      // 抽取帧
      await this.ffmpeg.exec([
        '-i',
        inputName,
        '-ss',
        String(timestamp),
        '-vframes',
        '1',
        '-q:v',
        '2',
        '-vf',
        'scale=1280:-2',
        frameName,
      ]);

      // 读取帧数据
      const frameData = await this.ffmpeg.readFile(frameName);
      const imageUrl = URL.createObjectURL(
        new Blob([frameData.buffer], { type: 'image/jpeg' })
      );

      frames.push({
        id: frameName,
        index: i,
        timestamp: formatTimestamp(timestamp),
        imageUrl,
      });
    }

    return frames;
  }

  /**
   * 获取视频时长（秒）
   */
  private async getVideoDuration(inputName: string): Promise<number> {
    if (!this.ffmpeg) return 0;

    const output = await this.ffmpeg.exec([
      '-i',
      inputName,
      '-f',
      'null',
      '-',
    ]);

    // 从输出中解析时长
    const match = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
    if (match) {
      const [, hours, minutes, seconds] = match;
      return (
        parseInt(hours) * 3600 +
        parseInt(minutes) * 60 +
        parseInt(seconds)
      );
    }

    return 0;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // FFmpeg.wasm 会在页面关闭时自动清理
  }
}

/**
 * 将 File 转换为 Uint8Array
 */
async function fetchFile(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 格式化时间戳为 HH:MM:SS
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
