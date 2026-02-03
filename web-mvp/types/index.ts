/**
 * 类型定义
 */

// 风格类型
export type StyleType = 'casual' | 'beginner' | 'literary';

// 视频帧
export interface VideoFrame {
  id: string;
  index: number;
  timestamp: string;
  imageUrl: string;
}

// 词汇信息
export interface Vocabulary {
  word: string;
  lemma: string;
  level: 'C1/C2' | 'B2' | 'B1/B2' | 'A1/A2';
  frequency: string;
  pos: string;
  coordinates?: number[][];
}

// 视频叙述条目
export interface NarrativeEntry {
  frame_index: number;
  timestamp: string;
  sentence: string;
  advanced_vocabulary: Vocabulary[];
  core_word: string;
  vocabulary_count: number;
  context_continuity?: {
    previous_sentence: string;
  };
}

// AI 分析结果
export interface AnalysisResult {
  video_narrative: NarrativeEntry[];
  mode?: 'normal' | 'sliding_window';
  total_frames?: number;
  context_type?: string;
}

// API 请求类型
export interface AnalyzeRequest {
  frames: string[]; // base64 编码的图片
  useSlidingWindow?: boolean;
}

export interface AnalyzeResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
}

// 分析状态
export type AnalysisStatus = 'idle' | 'analyzing' | 'complete' | 'error';

// 分析进度
export interface AnalysisProgress {
  status: AnalysisStatus;
  currentFrame: number;
  totalFrames: number;
  message: string;
}
