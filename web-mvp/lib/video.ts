/**
 * 视频处理模块 v2
 * 使用 FFmpeg.wasm 在浏览器端进行完整视频处理
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { VideoFrame } from '@/types';

// Re-export VideoFrame for convenience
export type { VideoFrame };

export class VideoProcessor {
  private ffmpeg: FFmpeg | null = null;
  private loaded: boolean = false;

  async initialize(): Promise<void> {
    if (this.loaded && this.ffmpeg) return;

    console.log('🔄 Initializing FFmpeg.wasm...');

    try {
      this.ffmpeg = new FFmpeg();

      // 加载 FFmpeg 核心文件 (使用 CDN)
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

      this.ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
      });

      this.ffmpeg.on('progress', ({ progress }) => {
        console.log(`Progress: ${(progress * 100).toFixed(2)}%`);
      });

      await this.ffmpeg.load({
        coreURL,
        wasmURL,
      });

      this.loaded = true;
      console.log('✅ FFmpeg.wasm loaded successfully');

    } catch (error) {
      console.error('Failed to load FFmpeg.wasm:', error);
      throw new Error(`FFmpeg initialization failed: ${error}`);
    }
  }

  /**
   * 获取视频时长（秒）
   */
  async getVideoDuration(videoFile: File): Promise<number> {
    // 使用浏览器原生 <video> 元素获取时长（比 FFmpeg 更可靠）
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        const duration = video.duration;
        URL.revokeObjectURL(video.src);
        console.log(`📊 Video duration: ${duration.toFixed(2)}s`);
        resolve(duration);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        console.error('Failed to get video duration');
        reject(new Error('Failed to load video metadata'));
      };

      video.src = URL.createObjectURL(videoFile);
    });
  }

  /**
   * 从视频文件中均匀抽取帧
   * @param videoFile 视频文件
   * @param frameCount 要抽取的帧数
   * @param onProgress 进度回调
   * @returns 抽取的帧列表（base64）
   */
  async extractFrames(
    videoFile: File,
    frameCount: number = 10,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ frames: VideoFrame[], duration: number }> {
    await this.initialize();

    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }

    console.log(`🎬 Extracting ${frameCount} frames from video...`);

    // 先用浏览器获取时长（不依赖 FFmpeg 虚拟文件系统）
    const duration = await this.getVideoDuration(videoFile);

    // 写入视频文件到 FFmpeg 虚拟文件系统
    const inputName = 'input.mp4';
    await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    const interval = duration / frameCount;

    console.log(`⏱️  Frame interval: ${interval.toFixed(2)}s (${duration.toFixed(2)}s / ${frameCount} frames)`);

    const frames: VideoFrame[] = [];

    // 提取帧
    for (let i = 0; i < frameCount; i++) {
      const timestamp = i * interval;
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
        '2',  // 质量 2（平衡文件大小和质量）
        '-vf',
        'scale=1280:-2',  // 宽度 1280，高度自适应
        frameName,
      ]);

      // 读取帧数据
      const frameData = await this.ffmpeg.readFile(frameName);
      const uint8Data = frameData instanceof Uint8Array ? frameData : new TextEncoder().encode(frameData as string);
      const imageUrl = URL.createObjectURL(
        new Blob([new Uint8Array(uint8Data)], { type: 'image/jpeg' })
      );

      frames.push({
        id: frameName,
        index: i,
        timestamp: formatTimestamp(timestamp),
        imageUrl,
      });

      // 报告进度
      if (onProgress) {
        onProgress(i + 1, frameCount);
      }

      console.log(`✓ Frame ${i + 1}/${frameCount} extracted`);

      // 清理已处理的帧，避免内存堆积
      await this.ffmpeg.deleteFile(frameName);
    }

    // 清理输入文件
    await this.ffmpeg.deleteFile(inputName);

    console.log(`✅ Successfully extracted ${frames.length} frames`);
    console.log(`📊 Video duration: ${duration.toFixed(2)}s`);

    return { frames, duration };
  }

  /**
   * 场景变化检测（基于帧差异）
   * @param frameCount 最大抽帧数
   * @param threshold 差异阈值（0-255）
   */
  async extractKeyFrames(
    videoFile: File,
    frameCount: number = 10,
    threshold: number = 30,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ frames: VideoFrame[], duration: number }> {
    await this.initialize();

    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }

    console.log(`🔍 Extracting key frames with threshold ${threshold}...`);

    // 写入视频文件
    const inputName = 'input.mp4';
    await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    // 获取视频时长
    const duration = await this.getVideoDuration(videoFile);

    const frames: VideoFrame[] = [];
    let previousFrame: Uint8Array | null = null;
    let frameIndex = 0;

    // 每秒检查一次帧，最多处理 60 秒
    const maxDuration = Math.min(duration, 60);
    const checkInterval = 1.0; // 每秒检查一次

    for (let timestamp = 0; timestamp < maxDuration && frames.length < frameCount; timestamp += checkInterval) {
      const frameName = `keyframe_${String(frames.length).padStart(6, '0')}.jpg`;

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
        'scale=640:-2',  // 较小尺寸用于差异检测
        frameName,
      ]);

      // 读取当前帧
      const currentFrameData = await this.ffmpeg.readFile(frameName);
      const currentFrame = new Uint8Array(currentFrameData.buffer);

      // 计算与前一帧的差异
      let isKeyFrame = false;
      if (previousFrame !== null) {
        const diff = calculateFrameDifference(previousFrame, currentFrame);
        if (diff > threshold) {
          isKeyFrame = true;
        }
      }

      // 如果是关键帧或前几帧，保存它
      if (isKeyFrame || frames.length < 3) {
        const imageUrl = URL.createObjectURL(
          new Blob([currentFrame.buffer], { type: 'image/jpeg' })
        );

        frames.push({
          id: frameName,
          index: frames.length,
          timestamp: formatTimestamp(timestamp),
          imageUrl,
        });

        console.log(`🎯 Key frame ${frames.length + 1} detected at ${timestamp.toFixed(2)}s (diff: ${diff})`);

        // 清理临时帧
        await this.ffmpeg.deleteFile(frameName);
      } else {
        console.log(`⏭️ Skipping frame at ${timestamp.toFixed(2)}s (diff: ${diff})`);
      }

      previousFrame = currentFrame;
      frameIndex++;

      // 报告进度
      if (onProgress) {
        onProgress(timestamp, maxDuration);
      }
    }

    // 清理输入文件
    await this.ffmpeg.deleteFile(inputName);

    console.log(`✅ Extracted ${frames.length} key frames`);
    console.log(`📊 Video duration: ${duration.toFixed(2)}s`);

    return { frames, duration };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // FFmpeg.wasm 会在页面关闭时自动清理
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
      this.ffmpeg = null;
      this.loaded = false;
    }
  }

  /**
   * 将 File 转换为 Uint8Array
   */
  async [Symbol.asyncIterator](): Promise<Uint8Array> {
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
}

/**
 * 计算两帧之间的差异（简单像素差异）
 */
function calculateFrameDifference(frame1: Uint8Array, frame2: Uint8Array): number {
  // 简化版本：只比较部分像素
  const sampleSize = Math.min(frame1.length, 10000); // 采样 10k 像素

  let diff = 0;
  for (let i = 0; i < sampleSize; i++) {
    diff += Math.abs(frame1[i] - frame2[i]);
  }

  // 归一化到 0-255
  return diff / (sampleSize / 256);
}

/**
 * 格式化时间戳为 HH:MM:SS
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
