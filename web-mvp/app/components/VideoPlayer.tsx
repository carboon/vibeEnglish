/**
 * 视频播放器组件
 */

'use client';

import { useRef, useState, useEffect } from 'react';

interface VideoPlayerProps {
  videoUrl: string | null;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
}

export default function VideoPlayer({
  videoUrl,
  currentTime: externalCurrentTime = 0,
  onTimeUpdate,
  onDurationChange
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  // 同步外部时间（用于字幕同步）
  useEffect(() => {
    if (externalCurrentTime !== currentTime && videoRef.current) {
      videoRef.current.currentTime = externalCurrentTime;
      setCurrentTime(externalCurrentTime);
    }
  }, [externalCurrentTime]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  };

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
      {/* Video Element */}
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

      {/* Controls */}
      <div className="bg-gray-900 p-4 space-y-3">
        {/* Progress Bar */}
        <div
          className="relative w-full h-2 bg-gray-700 rounded-full cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="absolute top-0 left-0 h-2 bg-indigo-600 rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="text-white text-2xl hover:text-indigo-400 transition-colors"
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>

          {/* Time Display */}
          <div className="text-white font-mono">
            <span className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Volume */}
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
