/**
 * VideoPlayer 组件单元测试
 */

import { render, screen } from '@testing-library/react';
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

    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', mockVideoUrl);
  });

  test('has controls elements', () => {
    render(<VideoPlayer videoUrl={mockVideoUrl} />);

    // 检查播放按钮
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('has play button', () => {
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

  test('handles missing videoUrl gracefully', () => {
    render(<VideoPlayer videoUrl={null} />);

    // 不应该有视频元素
    expect(document.querySelector('video')).not.toBeInTheDocument();

    // 应该显示占位符
    expect(screen.getByText('No video selected')).toBeInTheDocument();
  });
});

export { };
