'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AnalysisResult, Vocabulary } from '@/types';
import { VideoProcessor, type VideoFrame } from '@/lib/video';
import { generateSRTBlob, downloadSRT, resultToSRT } from '@/lib/srt';
import { CacheManager } from '@/lib/cache';
import VideoPlayer from './components/VideoPlayer';
import WordExplanation from './components/WordExplanation';
import { StyleType, STYLE_CONFIGS } from '@/lib/prompts';

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [processingProgress, setProcessingProgress] = useState({
    status: 'idle' as 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'complete' | 'error',
    current: 0,
    total: 0,
    message: 'Ready to analyze'
  });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showWordExplanation, setShowWordExplanation] = useState(false);
  const [selectedVocabulary, setSelectedVocabulary] = useState<Vocabulary | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StyleType>('casual');
  const [useSlidingWindow, setUseSlidingWindow] = useState(true);
  const [extractedFrames, setExtractedFrames] = useState<VideoFrame[]>([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [srtContent, setSrtContent] = useState('');
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(0);
  const [cacheHit, setCacheHit] = useState(false);
  
  const videoProcessorRef = useRef<VideoProcessor | null>(null);
  const cacheManagerRef = useRef<CacheManager | null>(null);

  // 初始化
  useEffect(() => {
    videoProcessorRef.current = new VideoProcessor();
    cacheManagerRef.current = new CacheManager();

    // 清理过期缓存
    if (cacheManagerRef.current) {
      cacheManagerRef.current.cleanExpiredCache().catch(err => {
        console.error('Failed to clean expired cache:', err);
      });
    }

    return () => {
      videoProcessorRef.current?.cleanup();
      cacheManagerRef.current?.close();
    };
  }, []);

  const handleVideoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setProcessingProgress({
        status: 'uploading',
        current: 0,
        total: 0,
        message: `Loading: ${file.name}`
      });
      setAnalysisResult(null);
      setExtractedFrames([]);
      setSrtContent('');

      // 检查缓存
      if (cacheManagerRef.current) {
        const cachedResult = await cacheManagerRef.current.getAnalysisResult(file);
        const cachedFrames = await cacheManagerRef.current.getFrames(file);

        if (cachedResult && cachedFrames && cachedFrames.length > 0) {
          console.log('✅ Found cached result, skipping analysis');
          setCacheHit(true);
          setAnalysisResult(cachedResult);
          setExtractedFrames(cachedFrames);
          
          const frameDuration = cachedFrames.length > 0 ? (cachedResult as any).duration || (file.size / 100000) : 2.0;
          const srtContent = resultToSRT(cachedResult, frameDuration);
          setSrtContent(srtContent);
          
          setProcessingProgress({
            status: 'complete',
            current: cachedFrames.length,
            total: cachedFrames.length,
            message: `Loaded from cache (${cachedResult.mode || 'normal'} style)`
          });
          return;
        }
      }

      setCacheHit(false);
    }
  }, []);

  // 处理视频
  const processVideo = async (skipCache: boolean = false) => {
    if (!videoFile || !videoProcessorRef.current || !cacheManagerRef.current) {
      setProcessingProgress({
        status: 'error',
        current: 0,
        total: 0,
        message: 'Please select a video file first'
      });
      return;
    }

    try {
      console.log('🎬 Starting video processing...');
      
      // 步骤 1: 检查缓存（除非跳过）
      let frames = extractedFrames;
      let duration = videoDuration;

      if (!skipCache && !cacheHit) {
        const cachedFrames = await cacheManagerRef.current.getFrames(videoFile);
        
        if (cachedFrames && cachedFrames.length > 0) {
          console.log('✅ Found cached frames, skipping extraction');
          frames = cachedFrames;
          duration = (await cacheManagerRef.current.getAnalysisResult(videoFile) as any)?.duration || (videoFile.size / 100000);
          setExtractedFrames(frames);
          setVideoDuration(duration);

          setProcessingProgress({
            status: 'analyzing',
            current: 0,
            total: frames.length,
            message: `Analyzing frames with ${selectedStyle} style...`
          });

          // 步骤 2: AI 分析
          const framesBase64 = frames.map(f => f.imageUrl.split(',')[1] || '');
          
          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              frames: framesBase64,
              useSlidingWindow,
              style: selectedStyle
            })
          });

          if (!response.ok) {
            throw new Error(`Analysis failed: ${response.statusText}`);
          }

          const data = await response.json();

          if (data.success && data.data) {
            console.log('✅ Analysis complete');
            
            const frameDuration = frames.length > 0 ? duration / frames.length : 0;
            const srtContent = resultToSRT(data.data, frameDuration);
            setSrtContent(srtContent);

            // 保存到缓存
            await cacheManagerRef.current.saveAnalysisResult(videoFile, data.data);

            setAnalysisResult(data.data);
            setProcessingProgress({
              status: 'complete',
              current: frames.length,
              total: frames.length,
              message: `Analysis complete! Style: ${selectedStyle}`
            });
          } else {
            throw new Error(data.error || 'Analysis failed');
          }
        } else {
          console.log('📸 No cached frames, extracting...');
          
          // 抽取帧
          setProcessingProgress({
            status: 'extracting',
            current: 0,
            total: 0,
            message: 'Extracting frames from video...'
          });

          const extractionResult = await videoProcessorRef.current.extractFrames(
            videoFile,
            10
          );

          frames = extractionResult.frames;
          duration = extractionResult.duration;
          setExtractedFrames(frames);
          setVideoDuration(duration);

          console.log(`✅ Extracted ${frames.length} frames, duration: ${duration}s`);

          // 保存到缓存
          await cacheManagerRef.current.saveFrames(videoFile, frames, duration);

          // 步骤 2: AI 分析
          setProcessingProgress({
            status: 'analyzing',
            current: 0,
            total: frames.length,
            message: `Analyzing frames with ${selectedStyle} style...`
          });

          const framesBase64 = frames.map(f => f.imageUrl.split(',')[1] || '');
          
          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              frames: framesBase64,
              useSlidingWindow,
              style: selectedStyle
            })
          });

          if (!response.ok) {
            throw new Error(`Analysis failed: ${response.statusText}`);
          }

          const data = await response.json();

          if (data.success && data.data) {
            console.log('✅ Analysis complete');
            
            const frameDuration = frames.length > 0 ? duration / frames.length : 0;
            const srtContent = resultToSRT(data.data, frameDuration);
            setSrtContent(srtContent);

            // 保存到缓存
            await cacheManagerRef.current.saveAnalysisResult(videoFile, data.data);

            setAnalysisResult(data.data);
            setProcessingProgress({
              status: 'complete',
              current: frames.length,
              total: frames.length,
              message: `Analysis complete! Style: ${selectedStyle}`
            });
          } else {
            throw new Error(data.error || 'Analysis failed');
          }
        }
      }

    } catch (error) {
      console.error('❌ Processing error:', error);
      setProcessingProgress({
        status: 'error',
        current: 0,
        total: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleAnalyze = () => {
    setCacheHit(false);
    processVideo(false).catch(err => {
      console.error('Analysis failed:', err);
    });
  };

  // 重新生成字幕（使用缓存）
  const handleRegenerate = () => {
    if (!videoFile || !extractedFrames || extractedFrames.length === 0) {
      alert('Please upload and analyze a video first');
      return;
    }

    console.log('🔄 Regenerating subtitles from cache...');
    setProcessingProgress({
      status: 'analyzing',
      current: 0,
      total: extractedFrames.length,
      message: 'Regenerating subtitles from cached frames...'
    });

    // 直接使用缓存中的分析结果
    if (analysisResult && analysisResult.video_narrative) {
      const frameDuration = videoDuration > 0 ? videoDuration / extractedFrames.length : 2.0;
      const srtContent = resultToSRT(analysisResult, frameDuration);
      setSrtContent(srtContent);

      setProcessingProgress({
        status: 'complete',
        current: extractedFrames.length,
        total: extractedFrames.length,
        message: 'Subtitles regenerated from cache!'
      });
    }
  };

  const handleVocabularyClick = (vocab: Vocabulary) => {
    setSelectedVocabulary(vocab);
    setShowWordExplanation(true);
  };

  const handleDownloadSRT = () => {
    if (analysisResult && analysisResult.video_narrative) {
      const frameDuration = videoDuration > 0 && extractedFrames.length > 0
        ? videoDuration / extractedFrames.length
        : 2.0;
      downloadSRT(analysisResult, frameDuration);
    }
  };

  const handleWordExplanationClose = () => {
    setShowWordExplanation(false);
    setSelectedVocabulary(null);
  };

  const styles = [
    { id: 'casual', ...STYLE_CONFIGS['casual'] },
    { id: 'beginner', ...STYLE_CONFIGS['beginner'] },
    { id: 'literary', ...STYLE_CONFIGS['literary'] }
  ];

  const getStatusIcon = () => {
    switch (processingProgress.status) {
      case 'idle':
        return '📹';
      case 'uploading':
        return '📤';
      case 'extracting':
        return '🎞️';
      case 'analyzing':
        return '🤖';
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📝';
    }
  };

  const getStatusColor = () => {
    switch (processingProgress.status) {
      case 'idle':
        return 'bg-gray-600';
      case 'uploading':
        return 'bg-blue-600';
      case 'extracting':
        return 'bg-purple-600';
      case 'analyzing':
        return 'bg-indigo-600';
      case 'complete':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  if (!videoFile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-8">
            <h1 className="text-5xl font-bold text-indigo-900 mb-4">
              🎬 VibeEnglish
            </h1>
            <p className="text-xl text-gray-700">
              Learn English through Comprehensible Input from Videos
            </p>
            <div className="flex items-center justify-center space-x-2 mt-4">
              <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-medium">
                Browser-Side Video Extraction
              </span>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                IndexedDB Caching
              </span>
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
                Three Caption Styles
              </span>
            </div>
          </header>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              📤 Upload Video
            </h2>

            <div className="space-y-6">
              <div className="border-2 border-dashed rounded-xl p-8 text-center transition-colors">
                <input
                  type="file"
                  id="video"
                  accept="video/*"
                  onChange={handleVideoChange}
                  disabled={processingProgress.status !== 'idle'}
                  className="hidden"
                />
                <label
                  htmlFor="video"
                  className={`cursor-pointer block ${processingProgress.status !== 'idle' ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="text-6xl mb-4">📤</div>
                  <p className="text-lg text-gray-700">
                    {videoFile ? videoFile.name : 'Click to select a video file'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports MP4, WebM, MOV (max 500MB)
                  </p>
                  {cacheHit && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-800 font-medium">
                        ✅ Loaded from cache (skip extraction)
                      </p>
                    </div>
                  )}
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    🎨 Caption Style
                  </h3>
                  <div className="space-y-2">
                    {styles.map(style => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id as StyleType)}
                        disabled={processingProgress.status !== 'idle'}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          selectedStyle === style.id 
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' 
                            : 'bg-white text-gray-700 hover:bg-indigo-50 ring-2 ring-transparent'
                        }`}
                      >
                        <div className="font-medium mb-1">{style.name}</div>
                        <p className="text-xs text-gray-500">{style.description}</p>
                        <p className="text-xs text-gray-400">Target: {style.targetAudience}</p>
                        {selectedStyle === style.id && (
                          <span className="inline-block ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            ✓ Selected
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    🔗 Narrative Mode
                  </h3>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSlidingWindow}
                      onChange={(e) => setUseSlidingWindow(e.target.checked)}
                      disabled={processingProgress.status !== 'idle'}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-gray-700 font-medium">
                      Sliding Window (Narrative Continuity) 📖
                    </span>
                  </label>
                  <p className="text-xs text-gray-400 mt-2">
                    Maintains story flow across frames
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleAnalyze}
                  disabled={!videoFile || processingProgress.status !== 'idle' || processingProgress.status === 'analyzing'}
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-semibold text-lg
                           hover:bg-indigo-700 transition-colors disabled:bg-gray-400
                           disabled:cursor-not-allowed"
                >
                  {processingProgress.status === 'analyzing' ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin mr-3">⚙️</span>
                      Analyzing...
                    </span>
                  ) : (
                    <span>🚀 Analyze with {selectedStyle} Style</span>
                  )}
                </button>

                {analysisResult && extractedFrames.length > 0 && (
                  <button
                    onClick={handleRegenerate}
                    disabled={processingProgress.status !== 'idle'}
                    className="flex-1 bg-green-600 text-white py-4 rounded-xl font-semibold text-lg
                             hover:bg-green-700 transition-colors disabled:bg-gray-400
                             disabled:cursor-not-allowed"
                  >
                    🔄 Regenerate (From Cache)
                  </button>
                )}
              </div>

              {processingProgress.status !== 'idle' && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor()}`}>
                        <span className="text-xl text-white">
                          {getStatusIcon()}
                        </span>
                      </div>
                      <span className="font-semibold text-gray-800">
                        {processingProgress.status.charAt(0).toUpperCase() + processingProgress.status.slice(1)}
                      </span>
                    </div>
                    {processingProgress.total > 0 && (
                      <span className="text-sm text-gray-500">
                        {processingProgress.current}/{processingProgress.total}
                      </span>
                    )}
                  </div>

                  {processingProgress.total > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          processingProgress.status === 'complete' ? 'bg-green-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                      />
                    </div>
                  )}

                  <p className="text-sm text-gray-600 mt-2">
                    {processingProgress.message}
                  </p>

                  {processingProgress.status === 'extracting' && extractedFrames.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 mb-1">
                        📹 Frames extracted: {extractedFrames.length}
                      </p>
                      <p className="text-sm text-blue-800 mb-1">
                        ⏱️  Video duration: {videoDuration.toFixed(1)}s
                      </p>
                      <p className="text-sm text-blue-800">
                        📊 Average interval: {(videoDuration / extractedFrames.length).toFixed(2)}s per frame
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {analysisResult && analysisResult.video_narrative && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  📊 Analysis Results
                </h2>
                <div className="flex items-center space-x-4">
                  {cacheHit && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      🗄️ Cache Hit
                    </span>
                  )}
                  {analysisResult.style && (
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                      {analysisResult.style} Style
                    </span>
                  )}
                  {analysisResult.mode && (
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                      {analysisResult.mode}
                    </span>
                  )}
                  {srtContent && (
                    <button
                      onClick={handleDownloadSRT}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      📥 Download SRT
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <VideoPlayer 
                    videoUrl={extractedFrames.length > 0 ? extractedFrames[0].imageUrl : null}
                    currentTime={0}
                    srtContent={srtContent}
                    onTimeUpdate={(time) => {
                      if (analysisResult.video_narrative && analysisResult.video_narrative.length > 0) {
                        const frameIndex = Math.min(
                          Math.floor(time / (videoDuration / extractedFrames.length)),
                          analysisResult.video_narrative.length - 1
                        );
                        setCurrentSubtitleIndex(frameIndex);
                      }
                    }}
                  />
                </div>

                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      📈 Statistics
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Frames:</span>
                        <span className="font-semibold text-gray-800">
                          {analysisResult.total_frames || extractedFrames.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Duration:</span>
                        <span className="font-semibold text-gray-800">
                          {videoDuration.toFixed(1)}s
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Frame Interval:</span>
                        <span className="font-semibold text-gray-800">
                          {(videoDuration / extractedFrames.length).toFixed(2)}s
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Vocab:</span>
                        <span className="font-semibold text-gray-800">
                          {analysisResult.video_narrative.reduce((sum, entry) => 
                            sum + (entry.vocabulary_count || entry.advanced_vocabulary?.length || 0), 
                            0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      📝 Video Narrative
                    </h3>
                    
                    {analysisResult.video_narrative.map((entry, index) => {
                      const isActive = index === currentSubtitleIndex;

                      return (
                        <div 
                          key={entry.frame_index}
                          className={`p-4 rounded-xl border transition-all ${
                            isActive 
                              ? 'border-indigo-500 bg-indigo-50' 
                              : 'border-gray-200 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-semibold text-indigo-600">
                                Frame {entry.frame_index}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                entry.core_word ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {entry.timestamp}
                              </span>
                            </div>
                            {entry.core_word && (
                              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                                Core: {entry.core_word}
                              </span>
                            )}
                          </div>

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

                          <p className="text-lg text-gray-800 mb-3 leading-relaxed">
                            {entry.sentence}
                          </p>

                          {entry.advanced_vocabulary && entry.advanced_vocabulary.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-gray-600 mb-2">
                                Advanced Vocabulary ({entry.vocabulary_count} words):
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {entry.advanced_vocabulary.slice(0, 10).map((vocab, vIndex) => (
                                  <span
                                    key={vIndex}
                                    onClick={() => handleVocabularyClick(vocab)}
                                    className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                                      vocab.level === 'C1/C2' 
                                          ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                                          : vocab.level === 'B2'
                                              ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                    }`}
                                    title={`${vocab.word} (${vocab.level})`}
                                  >
                                    <span className="font-medium">
                                      {vocab.word}
                                    </span>
                                    <span className="text-xs opacity-75">
                                      ({vocab.level})
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showWordExplanation && selectedVocabulary && (
            <WordExplanation
              vocabulary={selectedVocabulary}
              onClose={handleWordExplanationClose}
            />
          )}
        </div>
    );
  }
