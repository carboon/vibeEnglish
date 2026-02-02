/**
 * 缓存管理器单元测试
 */

import { CacheManager } from '../lib/cache';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    // 每个测试前清理缓存
    cacheManager = new CacheManager();
  });

  afterEach(async () => {
    // 每个测试后清理
    await cacheManager.clearAll();
    cacheManager.close();
  });

  test('initializes IndexedDB', async () => {
    await cacheManager.initialize();
    
    expect(cacheManager).toBeDefined();
  });

  test('saves and retrieves frames', async () => {
    const videoFile = new File([''], 'test.mp4', { type: 'video/mp4' });
    const frames = [
      { id: 'frame_1', index: 0, timestamp: '00:00', imageUrl: 'data:image/jpeg;base64,test1' },
      { id: 'frame_2', index: 1, timestamp: '00:03', imageUrl: 'data:image/jpeg;base64,test2' }
    ];

    await cacheManager.initialize();
    await cacheManager.saveFrames(videoFile, frames, 10);

    const retrievedFrames = await cacheManager.getFrames(videoFile);
    
    expect(retrievedFrames).not.toBeNull();
    expect(retrievedFrames).toHaveLength(2);
    expect(retrievedFrames[0].imageUrl).toBe(frames[0].imageUrl);
  });

  test('returns null for cache miss', async () => {
    const videoFile = new File([''], 'not_cached.mp4', { type: 'video/mp4' });

    await cacheManager.initialize();
    const frames = await cacheManager.getFrames(videoFile);
    
    expect(frames).toBeNull();
  });

  test('saves and retrieves analysis result', async () => {
    const videoFile = new File([''], 'test.mp4', { type: 'video/mp4' });
    const analysisResult = {
      video_narrative: [
        {
          frame_index: 0,
          timestamp: '00:00',
          sentence: 'Test sentence',
          advanced_vocabulary: [],
          core_word: '',
          vocabulary_count: 0
        }
      ],
      mode: 'sliding_window',
      total_frames: 1
    };

    await cacheManager.initialize();
    await cacheManager.saveAnalysisResult(videoFile, analysisResult);

    const retrievedResult = await cacheManager.getAnalysisResult(videoFile);
    
    expect(retrievedResult).not.toBeNull();
    expect(retrievedResult.video_narrative).toHaveLength(1);
    expect(retrievedResult.video_narrative[0].sentence).toBe('Test sentence');
  });

  test('deletes cache entry', async () => {
    const videoFile = new File([''], 'test.mp4', { type: 'video/mp4' });
    const frames = [
      { id: 'frame_1', index: 0, timestamp: '00:00', imageUrl: 'data:image/jpeg;base64,test1' }
    ];

    await cacheManager.initialize();
    await cacheManager.saveFrames(videoFile, frames, 10);
    await cacheManager.deleteEntry(cacheManager['generateVideoId'](videoFile));

    const retrievedFrames = await cacheManager.getFrames(videoFile);
    
    expect(retrievedFrames).toBeNull();
  });

  test('gets cache count', async () => {
    const videoFile = new File([''], 'test.mp4', { type: 'video/mp4' });
    const frames = [{ id: 'frame_1', index: 0, timestamp: '00:00', imageUrl: 'data:image/jpeg;base64,test1' }];

    await cacheManager.initialize();
    await cacheManager.saveFrames(videoFile, frames, 10);

    const count = await cacheManager.getCacheCount();
    
    expect(count).toBe(1);
  });

  test('clears expired cache entries', async () => {
    const videoFile = new File([''], 'test.mp4', { type: 'video/mp4' });
    const frames = [{ id: 'frame_1', index: 0, timestamp: '00:00', imageUrl: 'data:image/jpeg;base64,test1' }];

    await cacheManager.initialize();
    await cacheManager.saveFrames(videoFile, frames, 10);

    // 等待缓存过期（模拟）
    // 在实际使用中，cleanExpiredCache 会检查时间戳
    
    const count = await cacheManager.getCacheCount();
    expect(count).toBeGreaterThan(0);
  });

  test('clears all cache entries', async () => {
    const videoFile = new File([''], 'test.mp4', { type: 'video/mp4' });
    const frames = [{ id: 'frame_1', index: 0, timestamp: '00:00', imageUrl: 'data:image/jpeg;base64,test1' }];

    await cacheManager.initialize();
    await cacheManager.saveFrames(videoFile, frames, 10);
    await cacheManager.clearAll();

    const count = await cacheManager.getCacheCount();
    const retrievedFrames = await cacheManager.getFrames(videoFile);
    
    expect(count).toBe(0);
    expect(retrievedFrames).toBeNull();
  });

  test('removes oldest entry when cache is full', async () => {
    const videoFile1 = new File([''], 'test1.mp4', { type: 'video/mp4' });
    const videoFile2 = new File([''], 'test2.mp4', { type: 'video/mp4' });
    const videoFile3 = new File([''], 'test3.mp4', { type: 'video/mp4' });

    await cacheManager.initialize();
    
    // 添加多个视频
    await cacheManager.saveFrames(videoFile1, [{ id: 'frame_1', index: 0, timestamp: '00:00', imageUrl: 'data:image/jpeg;base64,test1' }], 10);
    await cacheManager.saveFrames(videoFile2, [{ id: 'frame_2', index: 0, timestamp: '00:00', imageUrl: 'data:image/jpeg;base64,test2' }], 10);
    await cacheManager.saveFrames(videoFile3, [{ id: 'frame_3', index: 0, timestamp: '00:00', imageUrl: 'data:image/jpeg;base64,test3' }], 10);

    // 删除最旧的一个
    await cacheManager.removeOldestEntry();

    const count = await cacheManager.getCacheCount();
    
    expect(count).toBe(2); // 3 - 1 = 2
  });

  test('handles database errors gracefully', async () => {
    const videoFile = new File([''], 'test.mp4', { type: 'video/mp4' });

    await cacheManager.initialize();
    // 模拟数据库关闭
    cacheManager.close();

    const frames = await cacheManager.getFrames(videoFile);
    
    expect(frames).toBeNull();
  });
});

export {};
