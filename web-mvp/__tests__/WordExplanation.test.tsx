/**
 * WordExplanation 组件单元测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WordExplanation from '../app/components/WordExplanation';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

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
    
    expect(screen.getByRole('status')).toBeInTheDocument();
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
      expect(screen.getByText(mockVocabulary.lemma)).toBeInTheDocument();
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

  test('has close button', () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button');
    expect(closeButton).toBeInTheDocument();
  });

  test('calls onClose when close button clicked', () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('closes when clicking outside modal', () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);
    
    const overlay = screen.getByText('✕').parentElement?.parentElement;
    fireEvent.click(overlay!);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does not close when clicking inside modal', () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);
    
    const modal = screen.getByText('Got it, thanks! 🙏').parentElement?.parentElement?.parentElement?.parentElement;
    fireEvent.click(modal!);
    
    expect(onClose).not.toHaveBeenCalled();
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
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  test('hides definition during loading', () => {
    render(<WordExplanation vocabulary={mockVocabulary} onClose={onClose} />);
    
    expect(screen.queryByText('📖 Definition')).not.toBeInTheDocument();
  });
});

export {};
