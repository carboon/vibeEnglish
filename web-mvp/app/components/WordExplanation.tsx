/**
 * 词汇解释弹窗组件
 */

'use client';

import { useState } from 'react';

interface Vocabulary {
  word: string;
  lemma: string;
  level: 'C1/C2' | 'B2' | 'B1/B2' | 'A1/A2';
  frequency: string;
  pos: string;
}

interface WordExplanationProps {
  vocabulary: Vocabulary;
  onClose: () => void;
}

export default function WordExplanation({
  vocabulary,
  onClose
}: WordExplanationProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [explanation, setExplanation] = useState<string>('');
  const [examples, setExamples] = useState<string[]>([]);

  // 模拟获取词义解释
  const fetchExplanation = async () => {
    setIsLoading(true);
    try {
      // 这里应该调用 AI API 获取详细解释
      // 暂时使用模拟数据
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockExplanation = {
        'plump': 'Having a full, rounded shape or body; well-developed and fleshy.',
        'butterfly': 'A nectar-feeding insect with two pairs of large, typically brightly colored wings.',
        'meadow': 'A piece of grassland, especially one used for hay.',
        'ascends': 'Goes up; rises to a higher position or level.',
        'robust': 'Strong and healthy; vigorous.',
        'default': `The word "${vocabulary.word}" is a ${vocabulary.level} level word.`
      };

      const mockExamples: Record<string, string[]> = {
        'plump': [
          'The plump rabbit hopped across the meadow.',
          'She noticed the plump bird on the branch.'
        ],
        'butterfly': [
          'The colorful butterfly landed on the flower.',
          'Butterflies migrate thousands of miles each year.'
        ]
      };

      setExplanation(mockExplanation[vocabulary.lemma] || mockExplanation.default);
      setExamples(mockExamples[vocabulary.lemma] || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch explanation:', error);
      setExplanation('Unable to load explanation.');
      setIsLoading(false);
    }
  };

  // 组件挂载时获取解释
  useState(() => {
    fetchExplanation();
  });

  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'C1/C2':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'B2':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'B1/B2':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
         onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border-2 border-indigo-200"
         onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
              {vocabulary.word}
            </h3>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getLevelColor(vocabulary.level)}`}>
                {vocabulary.level}
              </span>
              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                {vocabulary.pos}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 词义解释 */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">
                📖 Definition
              </h4>
              <p className="text-gray-700 leading-relaxed">
                {explanation}
              </p>
            </div>

            {/* 频率信息 */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Word Frequency:
                </span>
                <span className="text-sm font-mono font-semibold text-gray-800">
                  {vocabulary.frequency}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-600">
                  Lemma (base form):
                </span>
                <span className="text-sm font-mono font-semibold text-gray-800">
                  {vocabulary.lemma}
                </span>
              </div>
            </div>

            {/* 例句 */}
            {examples.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">
                  💬 Example Sentences
                </h4>
                <ul className="space-y-2">
                  {examples.map((example, index) => (
                    <li 
                      key={index}
                      className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-gray-700"
                    >
                      "{example}"
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 学习提示 */}
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
              <h4 className="text-sm font-semibold text-indigo-900 mb-2">
                💡 Learning Tip
              </h4>
              <p className="text-sm text-indigo-800">
                Practice using this word in context. Try to create your own 
                sentences using "{vocabulary.word}" to reinforce your understanding.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold
                   hover:bg-indigo-700 transition-colors"
          >
            Got it, thanks! 🙏
          </button>
        </div>
      </div>
    </div>
  );
}
