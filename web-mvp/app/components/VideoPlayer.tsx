/**
 * 视频播放器组件 v2
 * 添加 SRT 字幕支持
 */

'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  findCurrentSRTEntry,
  calculateSRTProgress,
  parseSRT
} from '@/lib/srt';

interface VideoPlayerProps {
  videoUrl: string | null;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  srtContent?: string | null;  // SRT 字幕内容
}

export default function VideoPlayer({
  videoUrl,
  currentTime: externalCurrentTime = 0,
  onTimeUpdate,
  onDurationChange,
  srtContent
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  // 使用 ref 来跟踪 SRT 条目，避免 cascading renders
  const srtEntryRef = useRef<{ id: number; startTime: number; endTime: number; text: string } | null>(null);
  const [srtProgress, setSRTProgress] = useState(0);

  // 使用 useMemo 解析 SRT 内容
  const parsedSRT = useMemo(() => {
    if (!srtContent) return null;
    return parseSRT(srtContent);
  }, [srtContent]);

  // 计算当前 SRT 条目（不使用 useState 来避免 cascading renders）
  const currentSRTEntry = useMemo(() => {
    if (!parsedSRT) return null;
    return findCurrentSRTEntry(currentTime, parsedSRT.entries);
  }, [parsedSRT, currentTime]);

  // 更新 ref 和进度
  useEffect(() => {
    srtEntryRef.current = currentSRTEntry;
    // 使用 setTimeout 将状态更新移出同步阶段
    const newProgress = currentSRTEntry
      ? calculateSRTProgress(currentTime, currentSRTEntry)
      : 0;
    setTimeout(() => {
      setSRTProgress(newProgress);
    }, 0);
  }, [currentSRTEntry, currentTime]);

  // 同步外部时间（用于字幕同步）
  const prevExternalTimeRef = useRef(externalCurrentTime);
  useEffect(() => {
    if (externalCurrentTime !== prevExternalTimeRef.current && videoRef.current) {
      prevExternalTimeRef.current = externalCurrentTime;
      videoRef.current.currentTime = externalCurrentTime;
      // 使用 setTimeout 将状态更新移出同步阶段
      setTimeout(() => {
        setCurrentTime(externalCurrentTime);
      }, 0);
    }
  }, [externalCurrentTime]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  }, [onTimeUpdate]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      onDurationChange?.(dur);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    if (videoRef.current) {
      videoRef.current.currentTime = percentage * duration;
    }
  };

  if (!videoUrl) {
    return (
      <div className="bg-gray-100 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🎬</div>
        <p className="text-gray-600">No video selected</p>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
      {/* 视频元素 */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full aspect-video"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* 字幕覆盖层 */}
      {currentSRTEntry && (
        <div
          className="absolute bottom-20 left-0 right-0 px-4 py-3 pointer-events-none"
          style={{
            textShadow: '0px 2px 8px rgba(0, 0, 0, 0.8)',
          }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
              <p className="text-lg font-medium leading-relaxed">
                {currentSRTEntry.text}
              </p>
            </div>

            {/* 进度指示器 */}
            <div className="flex items-center justify-center mt-2 space-x-2">
              <span className="text-sm text-gray-300">
                字幕 {currentSRTEntry.id}
              </span>
              <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-white h-full rounded-full transition-all duration-300"
                  style={{ width: `${srtProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 控制面板 */}
      <div className="bg-gray-900 p-4 space-y-3">
        {/* 进度条 */}
        <div
          className="relative w-full h-2 bg-gray-700 rounded-full cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="absolute top-0 left-0 h-2 bg-indigo-600 rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-between">
          {/* 播放/暂停 */}
          <button
            onClick={togglePlay}
            className="text-white text-2xl hover:text-indigo-400 transition-colors"
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>

          {/* 时间显示 */}
          <div className="flex items-center space-x-4">
            <div className="text-white font-mono">
              <span className="text-sm text-gray-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* 字幕状态 */}
            {srtContent && currentSRTEntry && (
              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                {currentSRTEntry.id}/{currentSRTEntry.text.length > 30
                  ? '30+'
                  : currentSRTEntry.text.length}字
              </span>
            )}
          </div>

          {/* 音量控制 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setVolume(Math.max(0, volume - 0.1))}
              className="text-white hover:text-indigo-400 transition-colors"
            >
              🔈
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 accent-indigo-600"
            />
            <button
              onClick={() => setVolume(Math.min(1, volume + 0.1))}
              className="text-white hover:text-indigo-400 transition-colors"
            >
              🔊
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
