/**
 * SRT 字幕生成和解析测试
 */

import {
  resultToSRT,
  formatSRTTime,
  timestampToSeconds,
  parseSRT,
  findCurrentSRTEntry,
  calculateSRTProgress
} from '../lib/srt';

describe('SRT Generation', () => {
  const mockResult = {
    video_narrative: [
      {
        frame_index: 0,
        timestamp: '00:00',
        sentence: 'A plump white rabbit rests on a grassy lawn.'
      },
      {
        frame_index: 1,
        timestamp: '00:03',
        sentence: 'The rabbit stands up.'
      },
      {
        frame_index: 2,
        timestamp: '00:06',
        sentence: 'A butterfly lands on its head.'
      }
    ],
    mode: 'sliding_window',
    total_frames: 3,
    context_type: 'narrative_continuity'
  };

  const frameDuration = 3.0; // 每帧 3 秒

  test('formats SRT timestamp correctly', () => {
    expect(formatSRTTime(0)).toBe('00:00:00,000');
    expect(formatSRTTime(3.5)).toBe('00:00:03,500');
    expect(formatSRTTime(65.123)).toBe('01:45:07,368');
  });

  test('converts result to SRT format', () => {
    const srt = resultToSRT(mockResult, frameDuration);
    
    expect(srt).toContain('1\n');
    expect(srt).toContain('00:00:00,000 --> 00:00:03,000\n');
    expect(srt).toContain('A plump white rabbit rests on a grassy lawn.');
    expect(srt).toContain('The rabbit stands up.');
    expect(srt).toContain('A butterfly lands on its head.');
  });

  test('includes blank lines between entries', () => {
    const srt = resultToSRT(mockResult, frameDuration);
    
    const lines = srt.split('\n');
    const blankLines = lines.filter(line => line.trim() === '');
    
    expect(blankLines.length).toBeGreaterThan(0);
  });
});

describe('SRT Parsing', () => {
  const srtContent = `1
00:00:00,000 --> 00:00:03,000
A plump white rabbit rests on a grassy lawn.

2
00:00:03,000 --> 00:00:06,000
The rabbit stands up.

3
00:00:06,000 --> 00:00:09,000
A butterfly lands on its head.
`;

  test('parses SRT entries correctly', () => {
    const parsed = parseSRT(srtContent);
    
    expect(parsed.entries).toHaveLength(3);
    expect(parsed.entries[0]).toEqual({
      id: 1,
      startTime: 0,
      endTime: 3,
      text: 'A plump white rabbit rests on a grassy lawn.'
    });
    
    expect(parsed.entries[1]).toEqual({
      id: 2,
      startTime: 3,
      endTime: 6,
      text: 'The rabbit stands up.'
    });
  });

  test('finds correct entry for current time', () => {
    const parsed = parseSRT(srtContent);
    
    const entry1 = findCurrentSRTEntry(1.5, parsed.entries);
    const entry2 = findCurrentSRTEntry(4.5, parsed.entries);
    const entry3 = findCurrentSRTEntry(6.0, parsed.entries);
    
    expect(entry1).toEqual(parsed.entries[0]);
    expect(entry2).toEqual(parsed.entries[1]);
    expect(entry3).toBeNull(); // 超出第 3 条目
  });
});

describe('SRT Progress Calculation', () => {
  test('calculates progress correctly', () => {
    const entries = [
      { id: 1, startTime: 0, endTime: 3, text: 'Entry 1' },
      { id: 2, startTime: 3, endTime: 6, text: 'Entry 2' },
      { id: 3, startTime: 6, endTime: 9, text: 'Entry 3' },
    ];

    const progress1 = calculateSRTProgress(0, entries[0]);
    const progress2 = calculateSRTProgress(1.5, entries[0]);
    const progress3 = calculateSRTProgress(3, entries[0]);
    const progress4 = calculateSRTProgress(6, entries[2]);

    expect(progress1).toBe(0); // 在第一条目开始时
    expect(progress2).toBe(50); // 在第 1.5s 时（3s 的一半）
    expect(progress3).toBe(100); // 在第 3s 时（第 3 条目结束时）
    expect(progress4).toBe(100); // 在第 2 条目已过去时
  });

  test('handles edge cases', () => {
    const entries = [
      { id: 1, startTime: 0, endTime: 3, text: 'Entry 1' },
    ];

    // 时间在第一条目之前
    const progressBefore = calculateSRTProgress(-1, entries[0]);
    expect(progressBefore).toBe(0);

    // 时间超出所有条目
    const progressAfter = calculateSRTProgress(10, entries[0]);
    expect(progressAfter).toBe(100);
  });
});

describe('SRT Time Conversions', () => {
  test('converts HH:MM:SS to seconds', () => {
    expect(timestampToSeconds('00:00')).toBe(0);
    expect(timestampToSeconds('00:30')).toBe(30);
    expect(timestampToSeconds('01:00')).toBe(60);
    expect(timestampToSeconds('01:30')).toBe(90);
    expect(timestampToSeconds('02:00')).toBe(7200);
  });

  test('handles milliseconds', () => {
    expect(timestampToSeconds('00:00:05')).toBe(5);
    expect(timestampToSeconds('00:00:500')).toBe(0.5);
  });
});

export {};
