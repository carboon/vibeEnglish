/**
 * WordExplanation 组件单元测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WordExplanation from '../app/components/WordExplanation';

describe('WordExplanation', () => {
  const mockVocabulary = {
    word: 'plump',
    lemma: 'plump',
    level: 'B2' as const,
    frequency: 'Zipf: 3.19',
    pos: 'ADJ'
  };

  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders word and level', () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    expect(screen.getByText('plump')).toBeInTheDocument();
    expect(screen.getByText('B2')).toBeInTheDocument();
  });

  test('renders part of speech', () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    expect(screen.getByText('ADJ')).toBeInTheDocument();
  });

  test('renders loading state initially', () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    // 检查是否有加载指示器（spinner）
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  test('renders definition after loading', async () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('📖 Definition')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('renders frequency information', async () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Word Frequency:')).toBeInTheDocument();
      expect(screen.getByText(mockVocabulary.frequency)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('renders lemma (base form)', async () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Lemma (base form):')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('renders example sentences', async () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('💬 Example Sentences')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('renders learning tip', async () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('💡 Learning Tip')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('has close button with X symbol', () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    const closeButton = screen.getByText('✕');
    expect(closeButton).toBeInTheDocument();
  });

  test('calls onClose when X button clicked', () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when "Got it" button clicked', async () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    const gotItButton = screen.getByRole('button', { name: /Got it/i });
    fireEvent.click(gotItButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('applies correct color for B2 level', async () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    await waitFor(() => {
      const levelBadge = screen.getByText('B2');
      expect(levelBadge).toHaveClass('bg-orange-100');
    }, { timeout: 3000 });
  });

  test('applies correct color for C1/C2 level', async () => {
    const c2Vocab = { ...mockVocabulary, level: 'C1/C2' as const };
    render(<WordExplanation vocabulary={c2Vocab} onClose={onClose} />);

    await waitFor(() => {
      const levelBadge = screen.getByText('C1/C2');
      expect(levelBadge).toHaveClass('bg-red-100');
    }, { timeout: 3000 });
  });

  test('has "Got it" button', async () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /Got it/i });
      expect(button).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('shows spinner during loading', () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  test('hides definition during loading', () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);

    expect(screen.queryByText('📖 Definition')).not.toBeInTheDocument();
  });
});

export { };
