/**
 * 字幕编辑器组件
 * 允许用户编辑字幕，自动跟随视频播放
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { NarrativeEntry } from '@/types';

interface SubtitleEditorProps {
  subtitles: NarrativeEntry[];
  currentSubtitleIndex: number;
  onUpdateSubtitle: (index: number, newText: string) => void;
}

export default function SubtitleEditor({
  subtitles,
  currentSubtitleIndex,
  onUpdateSubtitle
}: SubtitleEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [isModified, setIsModified] = useState(false);

  // 使用 ref 来跟踪上一次的 index
  const prevIndexRef = useRef<number | null>(null);

  // 当切换到新字幕时，更新编辑器
  // 使用 useLayoutEffect 来避免闪烁，并检查是否真的需要更新
  useEffect(() => {
    if (currentSubtitleIndex >= 0 && currentSubtitleIndex < subtitles.length) {
      // 只在 index 真正改变时更新
      if (prevIndexRef.current !== currentSubtitleIndex) {
        prevIndexRef.current = currentSubtitleIndex;
        const newSubtitle = subtitles[currentSubtitleIndex];
        // 使用 setTimeout 将状态更新移出 effect 的同步阶段
        setTimeout(() => {
          setEditingIndex(currentSubtitleIndex);
          setEditText(newSubtitle.sentence);
          setIsModified(false);
        }, 0);
      }
    }
  }, [currentSubtitleIndex, subtitles]);

  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditText(newText);
    setIsModified(true);
  };

  const handleSave = () => {
    if (editingIndex !== null) {
      onUpdateSubtitle(editingIndex, editText);
      setIsModified(false);
    }
  };

  const handleNext = () => {
    if (editingIndex !== null && editingIndex < subtitles.length - 1) {
      const nextIndex = editingIndex + 1;
      setEditingIndex(nextIndex);
      setEditText(subtitles[nextIndex].sentence);
      setIsModified(false);
    }
  };

  const handlePrevious = () => {
    if (editingIndex !== null && editingIndex > 0) {
      const prevIndex = editingIndex - 1;
      setEditingIndex(prevIndex);
      setEditText(subtitles[prevIndex].sentence);
      setIsModified(false);
    }
  };

  const handleGoto = (index: number) => {
    if (index >= 0 && index < subtitles.length) {
      setEditingIndex(index);
      setEditText(subtitles[index].sentence);
      setIsModified(false);
    }
  };

  const getCurrentSubtitle = () => {
    if (currentSubtitleIndex >= 0 && currentSubtitleIndex < subtitles.length) {
      return subtitles[currentSubtitleIndex];
    }
    return null;
  };

  const current = getCurrentSubtitle();

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
          case 'S':
            handleSave();
            e.preventDefault();
            break;
          case 'z':
          case 'Z':
            // 撤销（未实现）
            e.preventDefault();
            break;
          case 'ArrowDown':
            handleNext();
            e.preventDefault();
            break;
          case 'ArrowUp':
            handlePrevious();
            e.preventDefault();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingIndex, editText, subtitles]);

  // 自动保存（1 秒后保存修改）
  useEffect(() => {
    if (isModified && editingIndex !== null) {
      const timer = setTimeout(() => {
        onUpdateSubtitle(editingIndex, editText);
        setIsModified(false);
      }, 1000); // 1 秒后自动保存

      return () => clearTimeout(timer);
    }
  }, [isModified, editingIndex, editText, onUpdateSubtitle]);

  return (
    <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          📝 Subtitle Editor
        </h3>
        {isModified && (
          <button
            onClick={handleSave}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            💾 Save
          </button>
        )}
      </div>

      {/* Subtitle Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Current: {currentSubtitleIndex + 1} / {subtitles.length}
          </span>
          <span className={`text-sm font-medium ${currentSubtitleIndex === currentSubtitleIndex
              ? 'text-green-600'
              : 'text-gray-600'
            }`}>
            {currentSubtitleIndex === currentSubtitleIndex ? '● Playing' : '○'}
          </span>
        </div>
        {current && current.core_word && (
          <div className="mt-2 text-sm">
            <span className="text-gray-600">Core: </span>
            <span className="font-semibold text-yellow-800">
              {current.core_word}
            </span>
          </div>
        )}
        {current && current.timestamp && (
          <div className="mt-2 text-sm text-gray-500">
            {current.timestamp}
          </div>
        )}
      </div>

      {/* Edit Area */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subtitle Text
          </label>
          <textarea
            value={editText}
            onChange={handleEditChange}
            onBlur={handleSave}
            placeholder="Enter subtitle text..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       text-base text-gray-900 leading-relaxed
                       focus:outline-none resize-y
                       h-32"
            disabled={!current || editingIndex !== currentSubtitleIndex}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>
              {editText.length} characters
            </span>
            {isModified && (
              <span className="text-green-600 flex items-center">
                <span className="mr-1">●</span>
                Modified (auto-saves in 1s)
              </span>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handlePrevious}
            disabled={!current || editingIndex <= 0}
            className="flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-lg mr-2">⬆️</span>
            <span className="text-sm font-medium">
              Previous
            </span>
          </button>

          <button
            onClick={() => handleGoto(0)}
            disabled={!current}
            className="flex items-center justify-center px-4 py-3 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-sm font-medium">
              First
            </span>
          </button>

          <button
            onClick={handleNext}
            disabled={!current || editingIndex >= subtitles.length - 1}
            className="flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-sm font-medium">
              Next
            </span>
            <span className="text-lg ml-2">⬇️</span>
          </button>
        </div>

        {/* Quick Jump */}
        {subtitles.length > 5 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Jump
            </label>
            <div className="grid grid-cols-5 gap-2">
              {subtitles.slice(0, 5).map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleGoto(index)}
                  disabled={index >= subtitles.length}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${index === editingIndex
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Context Preview */}
      {editingIndex !== null && editingIndex > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-gray-600 mb-1">
            🔗 Previous Context:
          </p>
          <p className="text-sm text-gray-700 italic">
            {subtitles[editingIndex - 1]?.sentence}
          </p>
        </div>
      )}

      {/* Keyboard Shortcuts */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 mb-2">
          ⌨️ Keyboard Shortcuts
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
          <div className="flex items-center">
            <span className="w-8 font-mono text-gray-500 mr-2">
              Ctrl+S
            </span>
            <span>Save</span>
          </div>
          <div className="flex items-center">
            <span className="w-8 font-mono text-gray-500 mr-2">
              Ctrl+Z
            </span>
            <span>Undo (not yet)</span>
          </div>
          <div className="flex items-center">
            <span className="w-8 font-mono text-gray-500 mr-2">
              ↑
            </span>
            <span>Previous</span>
          </div>
          <div className="flex items-center">
            <span className="w-8 font-mono text-gray-500 mr-2">
              ↓
            </span>
            <span>Next</span>
          </div>
        </div>
      </div>
    </div>
  );
}
