'use client';

import { useState } from 'react';
import { AnalysisProgress, AnalysisResult } from '@/types';

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress>({
    status: 'idle',
    currentFrame: 0,
    totalFrames: 0,
    message: 'Ready to analyze'
  });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [useSlidingWindow, setUseSlidingWindow] = useState(true);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setProgress({
        status: 'idle',
        currentFrame: 0,
        totalFrames: 0,
        message: `Loaded: ${file.name}`
      });
      setResult(null); // 清除之前的结果
    }
  };

  const extractFramesFromVideo = async (videoFile: File): Promise<string[]> => {
    // 模拟抽帧（实际会使用 FFmpeg.wasm）
    // 这里暂时返回空数组，让后端 Python 脚本处理
    return [];
  };

  const handleAnalyze = async () => {
    if (!videoFile) {
      alert('Please select a video first');
      return;
    }

    setProgress({
      status: 'analyzing',
      currentFrame: 0,
      totalFrames: 0,
      message: 'Initializing analysis...'
    });

    try {
      // 提取帧（模拟）
      const frames = await extractFramesFromVideo(videoFile);

      // 调用 API 分析
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frames,
          useSlidingWindow
        })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setProgress({
          status: 'complete',
          currentFrame: data.data.total_frames || 0,
          totalFrames: data.data.total_frames || 0,
          message: `Analysis complete! Mode: ${data.data.mode || 'normal'}`
        });

        setResult(data.data);
      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (error) {
      setProgress({
        status: 'error',
        currentFrame: 0,
        totalFrames: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-indigo-900 mb-4">
            🎬 VibeEnglish
          </h1>
          <p className="text-xl text-gray-700">
            Learn English through Comprehensible Input from Videos
          </p>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Upload Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              📹 Upload Video
            </h2>

            <div className="space-y-6">
              {/* File Input */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors">
                <input
                  type="file"
                  id="video"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                />
                <label
                  htmlFor="video"
                  className="cursor-pointer block"
                >
                  <div className="text-6xl mb-4">📤</div>
                  <p className="text-lg text-gray-700">
                    {videoFile ? videoFile.name : 'Click to select a video file'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports MP4, WebM, MOV (max 100MB)
                  </p>
                </label>
              </div>

              {/* Settings */}
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSlidingWindow}
                    onChange={(e) => setUseSlidingWindow(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-gray-700 font-medium">
                    Use Sliding Window (Narrative Continuity) 📖
                  </span>
                </label>
                <p className="text-sm text-gray-500 mt-2 ml-8">
                  Maintains story flow and consistent terminology across frames
                </p>
              </div>

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={!videoFile || progress.status === 'analyzing'}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold text-lg
                         hover:bg-indigo-700 transition-colors disabled:bg-gray-400
                         disabled:cursor-not-allowed"
              >
                {progress.status === 'analyzing' ? '🔄 Analyzing...' : '🚀 Start Analysis'}
              </button>

              {/* Progress */}
              {progress.status !== 'idle' && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-700">
                      {progress.status === 'analyzing' && '🔄 Processing...'}
                      {progress.status === 'complete' && '✅ Complete!'}
                      {progress.status === 'error' && '❌ Error'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {progress.currentFrame} / {progress.totalFrames} frames
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${progress.totalFrames > 0
                          ? (progress.currentFrame / progress.totalFrames) * 100
                          : 0}%`
                      }}
                    />
                  </div>

                  <p className="text-sm text-gray-600 mt-2">
                    {progress.message}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          {result && result.video_narrative && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  📊 Analysis Results
                </h2>
                {result.mode && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Mode: {result.mode}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {result.video_narrative.map((entry) => (
                  <div
                    key={entry.frame_index}
                    className="bg-gray-50 rounded-xl p-6 border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-indigo-600">
                        Frame {entry.frame_index} [{entry.timestamp}]
                      </span>
                      {entry.core_word && (
                        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                          Core: {entry.core_word}
                        </span>
                      )}
                    </div>

                    {/* 上下文提示 */}
                    {entry.context_continuity && (
                      <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-200">
                        <p className="text-xs text-gray-600 mb-1">
                          🔗 Previous Context:
                        </p>
                        <p className="text-sm text-gray-700 italic">
                          {entry.context_continuity.previous_sentence}
                        </p>
                      </div>
                    )}

                    <p className="text-lg text-gray-800 mb-3">
                      {entry.sentence}
                    </p>

                    {entry.advanced_vocabulary && entry.advanced_vocabulary.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-600 mb-2">
                          Advanced Vocabulary ({entry.vocabulary_count || entry.advanced_vocabulary.length} words):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {entry.advanced_vocabulary.slice(0, 8).map((vocab) => (
                            <span
                              key={vocab.word}
                              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium
                                       hover:bg-blue-200 transition-colors cursor-pointer"
                              title={`${vocab.level} | ${vocab.frequency}`}
                            >
                              {vocab.word}
                              <span className="text-xs ml-1 opacity-75">({vocab.level})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 统计 */}
              <div className="mt-6 bg-indigo-50 rounded-xl p-6 border border-indigo-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  📈 Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Frames:</span>
                    <span className="font-semibold text-gray-800 ml-2">
                      {result.total_frames || result.video_narrative.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Vocabulary:</span>
                    <span className="font-semibold text-gray-800 ml-2">
                      {result.video_narrative.reduce((sum, entry) => sum + (entry.vocabulary_count || entry.advanced_vocabulary?.length || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
