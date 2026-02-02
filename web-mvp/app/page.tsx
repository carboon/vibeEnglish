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
    }
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
      // 模拟分析（实际会调用 API）
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 这里会调用 API: POST /api/analyze
      setProgress({
        status: 'complete',
        currentFrame: 5,
        totalFrames: 5,
        message: 'Analysis complete!'
      });

      // 模拟结果
      const mockResult: AnalysisResult = {
        video_narrative: [
          {
            frame_index: 0,
            timestamp: '00:00',
            sentence: 'A plump white rabbit rests on a grassy lawn...',
            advanced_vocabulary: [],
            core_word: '',
            vocabulary_count: 11
          }
        ],
        mode: 'sliding_window',
        total_frames: 5,
        context_type: 'narrative_continuity'
      };

      setResult(mockResult);

    } catch (error) {
      setProgress({
        status: 'error',
        currentFrame: 0,
        totalFrames: 0,
        message: 'Analysis failed'
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
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                📊 Analysis Results
              </h2>

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

                    <p className="text-lg text-gray-800 mb-3">
                      {entry.sentence}
                    </p>

                    {entry.advanced_vocabulary.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-600 mb-2">
                          Advanced Vocabulary ({entry.vocabulary_count} words):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {entry.advanced_vocabulary.slice(0, 5).map((vocab) => (
                            <span
                              key={vocab.word}
                              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium"
                            >
                              {vocab.word} <span className="text-xs ml-1 opacity-75">({vocab.level})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
