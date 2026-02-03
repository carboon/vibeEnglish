/**
 * SRT 字幕生成器 v2
 * 支持风格参数
 */

import { AnalysisResult, StyleType } from '@/types';

/**
 * SRT 字幕条目
 */
interface SRTEntry {
  id: number;
  startTime: string; // HH:MM:SS,mmm
  endTime: string;
  text: string;
}

/**
 * 将时间戳转换为 SRT 时间格式
 */
export function timestampToSRT(timestamp: string): string {
  const parts = timestamp.split(':');
  const hours = parseInt(parts[0] || '0');
  const minutes = parseInt(parts[1] || '0');
  const seconds = parseInt(parts[2]?.split('.')[0] || '0');

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return formatSRTTime(totalSeconds, false);
}

/**
 * 将时间戳字符串转换为秒数
 */
export function timestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':');
  const hours = parseInt(parts[0] || '0');
  const minutes = parseInt(parts[1] || '0');
  const seconds = parseInt(parts[2]?.split('.')[0] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 根据风格调整句子（可选）
 * 这里可以添加风格特定的后处理逻辑
 */
function adjustSentenceByStyle(sentence: string, style: StyleType): string {
  // 当前版本不需要调整，AI 已经根据风格生成了
  // 未来可以添加：
  // - 日常口语：简化句子
  // - 入门风格：确保使用简单词汇
  // - 文学风格：增强文学表达

  return sentence;
}

/**
 * 将分析结果转换为 SRT 格式
 * @param result AI 分析结果
 * @param frameDuration 每帧的时长（秒）
 * @param style 字幕风格（可选）
 */
export function resultToSRT(result: AnalysisResult, frameDuration: number = 2.0, style?: StyleType): string {
  if (!result || !result.video_narrative) {
    return '';
  }

  const narratives = result.video_narrative;
  let srtContent = '';

  narratives.forEach((entry, index) => {
    const id = index + 1;
    const startTime = entry.timestamp;

    // 根据风格调整句子
    const adjustedSentence = adjustSentenceByStyle(entry.sentence, style || 'casual');

    // 计算结束时间（当前帧开始时间 + 帧时长）
    const startSeconds = timestampToSeconds(startTime);
    const endSeconds = startSeconds + frameDuration;
    const endTime = formatSRTTime(endSeconds, false);

    // 清理句子文本（移除多余的引号）
    const text = adjustedSentence
      .replace(/^"(.*)"$/, '$1')  // 移除开头和结尾的引号
      .replace(/"/g, '""')  // 内部引号转义
      .trim();

    srtContent += `${id}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${text}\n`;
    srtContent += `\n`; // 空行分隔
  });

  return srtContent;
}

/**
 * 生成 SRT 文件 Blob
 */
export function generateSRTBlob(result: AnalysisResult, frameDuration: number = 2.0): Blob {
  const srtContent = resultToSRT(result, frameDuration);
  return new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
}

/**
 * 下载 SRT 文件
 */
export function downloadSRT(result: AnalysisResult, frameDuration: number = 2.0): void {
  const srtContent = resultToSRT(result, frameDuration);
  const blob = generateSRTBlob(result, frameDuration);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'captions.srt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 解析 SRT 文件内容
 */
export interface SRTParsed {
  entries: Array<{
    id: number;
    startTime: number;
    endTime: number;
    text: string;
  }>;
}

export function parseSRT(srtContent: string): SRTParsed {
  const lines = srtContent.split('\n').filter(line => line.trim() !== '');
  const entries: SRTParsed['entries'] = [];

  let currentEntry: { id: number, startTime: number, endTime: number, text: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 空行表示新字幕条目
    if (line === '') {
      if (currentEntry) {
        entries.push(currentEntry);
        currentEntry = null;
      }
      continue;
    }

    // 序号行
    if (/^\d+$/.test(line)) {
      const id = parseInt(line);
      if (currentEntry) {
        entries.push(currentEntry);
      }
      currentEntry = { id, startTime: 0, endTime: 0, text: '' };
      continue;
    }

    // 时间戳行 (00:00:03,500 --> 00:00:06,000)
    if (/-->/.test(line)) {
      if (!currentEntry) continue;

      const [startTime, endTime] = line.split('-->').map(t => t.trim());

      currentEntry.startTime = srtTimeToSeconds(startTime);
      currentEntry.endTime = srtTimeToSeconds(endTime);
      continue;
    }

    // 文本行
    if (currentEntry && !(/^\d+$/.test(line)) && !(/-->/.test(line))) {
      currentEntry.text += (currentEntry.text ? ' ' : '') + line;
    }
  }

  // 添加最后一个条目
  if (currentEntry) {
    entries.push(currentEntry);
  }

  return { entries };
}

/**
 * 将 SRT 时间格式转换为秒数
 */
function srtTimeToSeconds(timeStr: string): number {
  // HH:MM:SS,mmm 格式
  const match = timeStr.match(/^(\d+):(\d+):(\d+)(,(\d+))?$/);
  if (!match) return 0;

  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const msStr = match[5]; // 第 5 个捕获组是毫秒数字
  const totalSeconds =
    hours * 3600 +
    minutes * 60 +
    seconds +
    (msStr ? parseInt(msStr) / 1000 : 0);
  return totalSeconds;
}


/**
 * 查找当前时间对应的字幕条目
 */
export function findCurrentSRTEntry(
  currentTime: number,
  srtEntries: SRTParsed['entries']
): { id: number; startTime: number; endTime: number; text: string } | null {
  for (const entry of srtEntries) {
    if (currentTime >= entry.startTime && currentTime <= entry.endTime) {
      return entry;
    }
  }
  return null;
}

/**
 * 计算当前字幕的显示百分比
 */
export function calculateSRTProgress(
  currentTime: number,
  entry: { startTime: number; endTime: number; text: string }
): number {
  if (currentTime < entry.startTime) return 0;
  if (currentTime > entry.endTime) return 100;

  const duration = entry.endTime - entry.startTime;
  const progress = ((currentTime - entry.startTime) / duration) * 100;

  return Math.max(0, Math.min(100, progress));
}

/**
 * 格式化秒数为 SRT 时间格式
 * @param seconds 秒数
 * @param includeMs 是否包含毫秒部分
 */
export function formatSRTTime(seconds: number, includeMs: boolean = true): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return includeMs ? `${timeStr},${String(ms).padStart(3, '0')}` : timeStr;
}
