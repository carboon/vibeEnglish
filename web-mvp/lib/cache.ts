/**
 * IndexedDB 缓存管理
 * 用于存储视频帧和分析结果，避免重复抽帧
 */

import { VideoFrame, AnalysisResult } from '@/types';

/**
 * 缓存条目接口
 */
export interface CacheEntry {
  videoId: string;
  videoName: string;
  frames: VideoFrame[];
  analysisResult: AnalysisResult | null; // 分析结果
  timestamp: number; // 缓存时间戳
  duration: number; // 视频时长
  frameCount: number; // 帧数量
}

/**
 * 缓存配置
 */
const CACHE_CONFIG = {
  DB_NAME: 'vibeenglish-cache',
  DB_VERSION: 1,
  STORE_NAME: 'videos',
  MAX_AGE: 24 * 60 * 60 * 1000, // 24 小时（毫秒）
  MAX_CACHE_SIZE: 50, // 最多缓存 50 个视频
};

/**
 * IndexedDB 管理类
 */
export class CacheManager {
  private db: IDBDatabase | null = null;

  /**
   * 初始化 IndexedDB
   */
  async initialize(): Promise<void> {
    console.log('🗄️ Initializing IndexedDB...');

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_CONFIG.DB_NAME, CACHE_CONFIG.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(new Error('IndexedDB initialization failed'));
      };

      request.onsuccess = () => {
        console.log('✅ IndexedDB initialized successfully');
        this.db = request.result;

        // 检查并创建对象存储
        if (!this.db.objectStoreNames.contains(CACHE_CONFIG.STORE_NAME)) {
          this.db.createObjectStore(CACHE_CONFIG.STORE_NAME, {
            keyPath: 'videoId',
            autoIncrement: true
          });
          console.log('✅ Created object store:', CACHE_CONFIG.STORE_NAME);
        }

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(CACHE_CONFIG.STORE_NAME)) {
          console.log('🔧 Creating object store:', CACHE_CONFIG.STORE_NAME);
          const store = db.createObjectStore(CACHE_CONFIG.STORE_NAME, {
            keyPath: 'videoId',
            autoIncrement: true
          });

          // 创建索引
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('timestamp_expire', ['timestamp', 'expireAt']);
        }
      };
    });
  }

  /**
   * 保存视频帧到缓存
   */
  async saveFrames(
    videoFile: File,
    frames: VideoFrame[],
    duration: number
  ): Promise<void> {
    await this.initialize();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    console.log(`💾 Caching ${frames.length} frames for video: ${videoFile.name}`);

    const videoId = this.generateVideoId(videoFile);
    const cacheEntry: CacheEntry = {
      videoId,
      videoName: videoFile.name,
      frames,
      analysisResult: null,
      timestamp: Date.now(),
      duration,
      frameCount: frames.length
    };

    // 清理过期缓存
    await this.cleanExpiredCache();

    // 检查缓存大小限制
    const count = await this.getCacheCount();
    if (count >= CACHE_CONFIG.MAX_CACHE_SIZE) {
      await this.removeOldestEntry();
    }

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_CONFIG.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const request = store.put(cacheEntry);

      request.onsuccess = () => {
        console.log('✅ Frames cached successfully');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to cache frames:', request.error);
        reject(new Error('Failed to cache frames'));
      };
    });
  }

  /**
   * 从缓存获取视频帧
   */
  async getFrames(videoFile: File): Promise<VideoFrame[] | null> {
    await this.initialize();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const videoId = this.generateVideoId(videoFile);

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CACHE_CONFIG.STORE_NAME], 'readonly');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const request = store.get(videoId);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;

        if (!entry) {
          console.log('❌ Cache miss for video:', videoFile.name);
          resolve(null);
          return;
        }

        // 检查缓存是否过期
        const age = Date.now() - entry.timestamp;
        if (age > CACHE_CONFIG.MAX_AGE) {
          console.log('⏰ Cache expired, removing...');
          this.deleteEntry(videoId);
          resolve(null);
          return;
        }

        console.log(`✅ Cache hit for video: ${videoFile.name} (${(age / 1000 / 60).toFixed(1)} mins old)`);
        resolve(entry.frames);
      };

      request.onerror = () => {
        console.error('Failed to get frames:', request.error);
        resolve(null);
      };
    });
  }

  /**
   * 保存分析结果到缓存
   */
  async saveAnalysisResult(
    videoFile: File,
    analysisResult: AnalysisResult
  ): Promise<void> {
    await this.initialize();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const videoId = this.generateVideoId(videoFile);

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_CONFIG.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);

      // 先获取现有条目
      const getRequest = store.get(videoId);

      getRequest.onsuccess = () => {
        const existingEntry = getRequest.result as CacheEntry | undefined;

        let cacheEntry: CacheEntry;

        if (existingEntry) {
          // 更新现有条目
          cacheEntry = {
            ...existingEntry,
            analysisResult,
            timestamp: Date.now()
          };
          console.log('🔄 Updating analysis result in cache');
        } else {
          // 创建新条目（如果只保存分析结果）
          cacheEntry = {
            videoId,
            videoName: videoFile.name,
            frames: [],
            analysisResult,
            timestamp: Date.now(),
            duration: 0,
            frameCount: 0
          };
          console.log('➕ Creating new analysis cache entry');
        }

        const request = store.put(cacheEntry);

        request.onsuccess = () => {
          console.log('✅ Analysis result cached successfully');
          resolve();
        };

        request.onerror = () => {
          console.error('Failed to cache analysis result:', request.error);
          reject(new Error('Failed to cache analysis result'));
        };
      };

      getRequest.onerror = () => {
        // 获取失败，尝试直接保存
        const cacheEntry: CacheEntry = {
          videoId,
          videoName: videoFile.name,
          frames: [],
          analysisResult,
          timestamp: Date.now(),
          duration: 0,
          frameCount: 0
        };

        const putRequest = store.put(cacheEntry);

        putRequest.onsuccess = () => {
          console.log('✅ Analysis result cached (new entry)');
          resolve();
        };

        putRequest.onerror = () => {
          console.error('Failed to cache analysis result:', putRequest.error);
          reject(new Error('Failed to cache analysis result'));
        };
      };
    });
  }

  /**
   * 从缓存获取分析结果
   */
  async getAnalysisResult(videoFile: File): Promise<AnalysisResult | null> {
    await this.initialize();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const videoId = this.generateVideoId(videoFile);

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CACHE_CONFIG.STORE_NAME], 'readonly');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const request = store.get(videoId);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;

        if (!entry || !entry.analysisResult) {
          console.log('❌ No cached analysis result');
          resolve(null);
          return;
        }

        console.log('✅ Cached analysis result found');
        resolve(entry.analysisResult);
      };

      request.onerror = () => {
        console.error('Failed to get analysis result:', request.error);
        resolve(null);
      };
    });
  }

  /**
   * 删除缓存条目
   */
  async deleteEntry(videoId: string): Promise<void> {
    await this.initialize();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise<void>((resolve) => {
      const transaction = this.db!.transaction([CACHE_CONFIG.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const request = store.delete(videoId);

      request.onsuccess = () => {
        console.log('🗑️ Cache entry deleted:', videoId);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete cache entry:', request.error);
        resolve(); // 即使失败也继续
      };
    });
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredCache(): Promise<void> {
    await this.initialize();

    if (!this.db) {
      return;
    }

    const now = Date.now();
    const expireThreshold = now - CACHE_CONFIG.MAX_AGE;

    return new Promise<void>((resolve) => {
      const transaction = this.db!.transaction([CACHE_CONFIG.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const index = store.index('timestamp');

      // 获取所有 timestamp <= expireThreshold 的条目（即过期的）
      const range = IDBKeyRange.upperBound(expireThreshold);
      const request = index.openCursor(range);
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;

        if (cursor) {
          // 当前条目已过期，删除它
          console.log(`🧹 Deleting expired entry: ${cursor.value.videoName}`);
          cursor.delete();
          deletedCount++;
          cursor.continue(); // 移动到下一条
        } else {
          // 没有更多条目了
          if (deletedCount > 0) {
            console.log(`✅ Cleaned ${deletedCount} expired cache entries`);
          }
          resolve();
        }
      };

      request.onerror = () => {
        console.error('Failed to clean expired cache:', request.error);
        resolve(); // 即使失败也继续
      };
    });
  }

  /**
   * 删除最旧的缓存条目
   */
  async removeOldestEntry(): Promise<void> {
    await this.initialize();

    if (!this.db) {
      return;
    }

    return new Promise<void>((resolve) => {
      const transaction = this.db!.transaction([CACHE_CONFIG.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const index = store.index('timestamp');

      // 按 timestamp 升序打开游标，第一条就是最旧的
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;

        if (cursor) {
          const entry = cursor.value as CacheEntry;
          console.log('🗑️ Removing oldest cache entry:', entry.videoName);
          cursor.delete();
          console.log('✅ Oldest cache entry removed');
        }
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to get oldest entry:', request.error);
        resolve();
      };
    });
  }

  /**
   * 获取缓存数量
   */
  async getCacheCount(): Promise<number> {
    await this.initialize();

    if (!this.db) {
      return 0;
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CACHE_CONFIG.STORE_NAME], 'readonly');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const index = store.index('timestamp');
      const request = index.count();

      request.onsuccess = () => {
        resolve(request.result || 0);
      };

      request.onerror = () => {
        console.error('Failed to count cache:', request.error);
        resolve(0);
      };
    });
  }

  /**
   * 清理所有缓存
   */
  async clearAll(): Promise<void> {
    await this.initialize();

    if (!this.db) {
      return;
    }

    return new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(CACHE_CONFIG.DB_NAME);

      request.onsuccess = () => {
        console.log('🗑️ All cache cleared');
        this.db = null;
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear cache:', request.error);
        resolve();
      };
    });
  }

  /**
   * 生成视频唯一 ID
   */
  private generateVideoId(videoFile: File): string {
    // 使用文件名 + 大小 + 修改时间生成唯一 ID
    return `${videoFile.name}_${videoFile.size}_${videoFile.lastModified}`;
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('🔌 IndexedDB closed');
    }
  }
}
