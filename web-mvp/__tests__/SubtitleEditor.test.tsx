/**
 * Subtitle Editor 组件单元测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubtitleEditor from '../app/components/SubtitleEditor';

// Mock data
const mockSubtitles = [
  {
    frame_index: 0,
    timestamp: '00:00',
    sentence: 'A plump white rabbit rests on a grassy lawn.',
    advanced_vocabulary: [],
    core_word: '',
    vocabulary_count: 0
  },
  {
    frame_index: 1,
    timestamp: '00:03',
    sentence: 'The rabbit stands up.',
    advanced_vocabulary: [],
    core_word: '',
    vocabulary_count: 0
  },
  {
    frame_index: 2,
    timestamp: '00:06',
    sentence: 'A butterfly lands on its head.',
    advanced_vocabulary: [],
    core_word: '',
    vocabulary_count: 0
  }
];

describe('SubtitleEditor', () => {
  const onUpdateSubtitle = jest.fn();

  beforeEach(() => {
    onUpdateSubtitle.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders subtitle info correctly', async () => {
    render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    expect(screen.getByText('📝 Subtitle Editor')).toBeInTheDocument();
    expect(screen.getByText(/Current:/)).toBeInTheDocument();
  });

  test('shows keyboard shortcuts', () => {
    render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    expect(screen.getByText('⌨️ Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
  });

  test('shows core word when available', async () => {
    const coreWordSubtitle = {
      ...mockSubtitles[0],
      core_word: 'rabbit'
    };

    render(
      <SubtitleEditor
        subtitles={[coreWordSubtitle, ...mockSubtitles.slice(1)]}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    // 等待 setTimeout 完成
    await waitFor(() => {
      expect(screen.getByText('Core:')).toBeInTheDocument();
      expect(screen.getByText('rabbit')).toBeInTheDocument();
    });
  });

  test('has navigation buttons', () => {
    render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={1}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    // 使用 getAllByText 因为这些文本可能出现多次（按钮和快捷键里都有）
    expect(screen.getAllByText('Previous').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Next').length).toBeGreaterThan(0);
  });

  test('has textarea for editing', () => {
    render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  test('shows subtitle text label', () => {
    render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    expect(screen.getByText('Subtitle Text')).toBeInTheDocument();
  });

  test('shows previous context when not first subtitle', async () => {
    render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={1}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    // 等待 setTimeout 完成
    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(screen.getByText('🔗 Previous Context:')).toBeInTheDocument();
    });
  });

  test('shows character count', () => {
    render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    expect(screen.getByText(/characters/)).toBeInTheDocument();
  });
});

export { };
