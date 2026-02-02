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
  });

  test('renders subtitle info correctly', () => {
    const { getByText } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    expect(getByText('📝 Subtitle Editor')).toBeInTheDocument();
    expect(getByText('Current: 1 / 3')).toBeInTheDocument();
    expect(getByText('○ Playing')).toBeInTheDocument();
  });

  test('displays current subtitle text', () => {
    const { getByDisplayValue } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={1}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    const textarea = getByDisplayValue('Textarea');
    expect(textarea).toHaveValue('The rabbit stands up.');
  });

  test('highlights playing subtitle', () => {
    const { getByText } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={2}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    expect(getByText('● Playing')).toBeInTheDocument();
  });

  test('shows core word when available', () => {
    const coreWordSubtitle = {
      ...mockSubtitles[0],
      core_word: 'rabbit'
    };

    const { getByText } = render(
      <SubtitleEditor
        subtitles={[coreWordSubtitle, ...mockSubtitles.slice(1)]}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    expect(getByText('Core: rabbit')).toBeInTheDocument();
  });

  test('allows editing subtitle text', () => {
    const { getByDisplayValue } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    const textarea = getByDisplayValue('Textarea');
    const newText = 'The rabbit jumps over the moon.';

    fireEvent.change(textarea, { target: { value: newText } });

    expect(textarea).toHaveValue(newText);
  });

  test('saves modified subtitle', () => {
    const { getByText } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    const saveButton = getByText('💾 Save');
    const textarea = getByDisplayValue('Textarea');

    // 修改文本
    fireEvent.change(textarea, { target: { value: 'Modified text' } });

    // 点击保存按钮
    fireEvent.click(saveButton);

    expect(onUpdateSubtitle).toHaveBeenCalledWith(0, 'Modified text');
  });

  test('auto-saves after delay', async () => {
    jest.useFakeTimers();

    const { getByDisplayValue, getByText } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    const textarea = getByDisplayValue('Textarea');
    const newText = 'Auto-saved text';

    fireEvent.change(textarea, { target: { value: newText } });

    // 等待 1 秒自动保存
    jest.advanceTimersByTime(1000);

    expect(onUpdateSubtitle).toHaveBeenCalledWith(0, newText);

    jest.useRealTimers();
  });

  test('navigates to next subtitle', () => {
    const { getByDisplayValue, getByText } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    const nextButton = getByText('Next', { exact: true });

    fireEvent.click(nextButton);

    // 应该切换到第二个字幕
    expect(getByDisplayValue('Textarea')).toHaveValue(mockSubtitles[1].sentence);
  });

  test('navigates to previous subtitle', () => {
    const { getByDisplayValue, getByText } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={1}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    const prevButton = getByText('Previous');

    fireEvent.click(prevButton);

    // 应该切换到第一个字幕
    expect(getByDisplayValue('Textarea')).toHaveValue(mockSubtitles[0].sentence);
  });

  test('disables navigation at boundaries', () => {
    const { getByRole } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    const buttons = getByRole('button');
    const prevButton = buttons[2]; // Previous button

    expect(prevButton).toBeDisabled();
  });

  test('shows keyboard shortcuts', () => {
    const { getByText } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    expect(getByText('⌨️ Keyboard Shortcuts')).toBeInTheDocument();
    expect(getByText('Ctrl+S')).toBeInTheDocument();
    expect(getByText('Previous')).toBeInTheDocument();
    expect(getByText('Next')).toBeInTheDocument();
  });

  test('shows previous context', () => {
    const { getByText } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={1}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    expect(getByText('🔗 Previous Context:')).toBeInTheDocument();
    expect(getByText('A plump white rabbit rests on a grassy lawn.')).toBeInTheDocument();
  });

  test('updates on time change', () => {
    const { rerender } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    // 切换到第二个字幕
    rerender(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={1}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    const { getByDisplayValue } = render();
    const textarea = getByDisplayValue('Textarea');

    expect(textarea).toHaveValue(mockSubtitles[1].sentence);
    expect(getByText('Current: 2 / 3')).toBeInTheDocument();
    expect(getByText('○ Playing')).toBeInTheDocument();
  });

  test('shows character count', () => {
    const { getByText, getByDisplayValue } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    const longSubtitle = {
      ...mockSubtitles[0],
      sentence: 'This is a very long subtitle with many words and characters that exceeds the normal limit.'
    };

    rerender(
      <SubtitleEditor
        subtitles={[longSubtitle, ...mockSubtitles.slice(1)]}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    expect(getByText('118 characters')).toBeInTheDocument();
  });

  test('shows quick jump buttons', () => {
    const { getByRole, getByText } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    expect(getByText('Quick Jump')).toBeInTheDocument();
    expect(getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(getByRole('button', { name: '3' })).toBeInTheDocument();
    expect(getByRole('button', { name: '4' })).toBeInTheDocument();
    expect(getByRole('button', { name: '5' })).toBeInTheDocument();
  });

  test('shows modified status indicator', () => {
    const { getByText, getByDisplayValue } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={0}
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    // 修改文本
    const textarea = getByDisplayValue('Textarea');
    fireEvent.change(textarea, { target: { value: 'Modified text' } });

    // 检查修改指示器
    expect(getByText('● Modified (auto-saves in 1s)')).toBeInTheDocument();
  });

  test('disables editor when no current subtitle', () => {
    const { getByDisplayValue } = render(
      <SubtitleEditor
        subtitles={mockSubtitles}
        currentSubtitleIndex={-1} // 没有当前字幕
        onUpdateSubtitle={onUpdateSubtitle}
      />
    );

    const textarea = getByDisplayValue('Textarea');
    expect(textarea).toBeDisabled();
  });
});

export {};
