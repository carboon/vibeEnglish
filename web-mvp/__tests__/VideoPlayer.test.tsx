/**
 * VideoPlayer 组件单元测试（修复版）
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VideoPlayer from '../app/components/VideoPlayer';

describe('VideoPlayer', () => {
  const mockVideoUrl = 'data:video/mp4;base64,mock';
  const onTimeUpdate = jest.fn();
  const onDurationChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders no video state when videoUrl is null', () => {
    render(<VideoPlayer videoUrl={null} />);
    
    expect(screen.getByText('No video selected')).toBeInTheDocument();
  });

  test('renders video element when videoUrl is provided', async () => {
    render(
      <VideoPlayer 
        videoUrl={mockVideoUrl}
        onTimeUpdate={onTimeUpdate}
        onDurationChange={onDurationChange}
      />
    );

    // 检查 video 元素（不使用 role，使用 tagName）
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', mockVideoUrl);
  });

  test('has controls elements', () => {
    render(<VideoPlayer videoUrl={mockVideoUrl} />);
    
    // 检查播放按钮
    expect(screen.getByRole('button')).toBeInTheDocument();
    
    // 检查进度条容器
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  test('formats time correctly', () => {
    render(<VideoPlayer videoUrl={mockVideoUrl} />);
    
    // 初始时间应该是 0:00
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  test('has play button with initial state', () => {
    render(<VideoPlayer videoUrl={mockVideoUrl} />);
    
    // 初始状态应该是播放按钮
    const buttons = screen.getAllByRole('button');
    const playButton = buttons.find(btn => btn.textContent?.includes('▶️'));
    expect(playButton).toBeInTheDocument();
  });

  test('has volume slider', () => {
    render(<VideoPlayer videoUrl={mockVideoUrl} />);
    
    // 检查音量输入
    const volumeInput = screen.getByRole('slider');
    expect(volumeInput).toBeInTheDocument();
  });

  test('has volume increase/decrease buttons', () => {
    render(<VideoPlayer videoUrl={mockVideoUrl} />);
    
    // 应该有音量增减按钮
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3); // 播放 + 音量增减
  });

  test('calls callbacks when provided', async () => {
    render(
      <VideoPlayer 
        videoUrl={mockVideoUrl}
        onTimeUpdate={onTimeUpdate}
        onDurationChange={onDurationChange}
      />
    );

    const video = document.querySelector('video') as HTMLVideoElement;
    
    // 模拟时间更新
    video.currentTime = 5.0;
    fireEvent.timeUpdate(video);
    
    // 不立即检查，让事件循环处理
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // 回调应该被调用
    expect(onTimeUpdate).toHaveBeenCalled();
  });

  test('syncs to external currentTime prop', () => {
    const { rerender } = render(
      <VideoPlayer 
        videoUrl={mockVideoUrl}
        currentTime={0}
      />
    );

    // 更新外部时间
    rerender(<VideoPlayer videoUrl={mockVideoUrl} currentTime={10} />);
    
    // 检查视频时间已更新
    const video = document.querySelector('video') as HTMLVideoElement;
    expect(video.currentTime).toBe(10);
  });

  test('handles missing videoUrl gracefully', () => {
    render(<VideoPlayer videoUrl={null} />);
    
    // 不应该有视频元素
    expect(document.querySelector('video')).not.toBeInTheDocument();
    
    // 应该显示占位符
    expect(screen.getByText('No video selected')).toBeInTheDocument();
  });
});

export {};
