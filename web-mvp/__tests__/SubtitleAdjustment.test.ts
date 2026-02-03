/**
 * SubtitleAdjustment 模块单元测试
 * 测试字幕调整算法
 */

import { adjustAllSubtitles } from '../lib/subtitle-adjustment';
import { AnalysisResult } from '../types';

describe('adjustAllSubtitles', () => {
    const mockResult: AnalysisResult = {
        video_narrative: [
            {
                frame_index: 0,
                timestamp: '00:00',
                sentence: 'A white rabbit sits on the grass.',
                advanced_vocabulary: [],
                core_word: 'rabbit',
                vocabulary_count: 0
            },
            {
                frame_index: 1,
                timestamp: '00:02',
                sentence: 'The rabbit hops forward slowly.',
                advanced_vocabulary: [],
                core_word: 'hops',
                vocabulary_count: 0
            },
            {
                frame_index: 2,
                timestamp: '00:04',
                sentence: 'A butterfly lands on its head.',
                advanced_vocabulary: [],
                core_word: 'butterfly',
                vocabulary_count: 0
            }
        ],
        mode: 'sliding_window',
        total_frames: 3,
        context_type: 'narrative_continuity'
    };

    test('returns adjusted result with default options', () => {
        const { adjustedResult, adjustments, analysis } = adjustAllSubtitles(mockResult);

        expect(adjustedResult).toBeDefined();
        expect(adjustedResult.video_narrative).toBeDefined();
        expect(adjustedResult.video_narrative.length).toBe(3);
    });

    test('returns analysis object', () => {
        const { analysis } = adjustAllSubtitles(mockResult);

        expect(analysis).toBeDefined();
        expect(['excellent', 'good', 'fair', 'poor']).toContain(analysis.flow);
        expect(Array.isArray(analysis.issues)).toBe(true);
        expect(Array.isArray(analysis.suggestions)).toBe(true);
    });

    test('returns adjustments array', () => {
        const { adjustments } = adjustAllSubtitles(mockResult);

        expect(Array.isArray(adjustments)).toBe(true);
        expect(adjustments.length).toBeGreaterThan(0);
    });

    test('handles empty result gracefully', () => {
        const emptyResult = {
            video_narrative: [],
            mode: 'normal' as const,
            total_frames: 0
        };

        const { adjustedResult, analysis } = adjustAllSubtitles(emptyResult);

        expect(adjustedResult).toBeDefined();
    });

    test('handles null result gracefully', () => {
        const { adjustedResult, analysis } = adjustAllSubtitles(null as any);

        expect(analysis.flow).toBe('poor');
        expect(analysis.issues.length).toBeGreaterThan(0);
    });

    test('can disable all adjustments', () => {
        const options = {
            fixTimeSequence: false,
            enhanceNarrativeFlow: false,
            optimizeIntroOutro: false,
            removeDuplicates: false,
            enforceLengthLimits: false
        };

        const { adjustedResult } = adjustAllSubtitles(mockResult, options);

        expect(adjustedResult.video_narrative.length).toBe(3);
    });

    test('preserves original frame data', () => {
        const { adjustedResult } = adjustAllSubtitles(mockResult);

        // 应该保留帧索引
        adjustedResult.video_narrative.forEach((entry, index) => {
            expect(entry.frame_index).toBeDefined();
        });
    });

    test('enforces length limits when enabled', () => {
        const longResult: AnalysisResult = {
            video_narrative: [
                {
                    frame_index: 0,
                    timestamp: '00:00',
                    sentence: 'This is a very long sentence that exceeds the maximum allowed character limit for subtitles in this application and should be truncated.',
                    advanced_vocabulary: [],
                    core_word: 'sentence',
                    vocabulary_count: 0
                }
            ],
            mode: 'normal' as const,
            total_frames: 1
        };

        const { adjustedResult } = adjustAllSubtitles(longResult, {
            fixTimeSequence: false,
            enhanceNarrativeFlow: false,
            optimizeIntroOutro: false,
            removeDuplicates: false,
            enforceLengthLimits: true
        });

        // 长度应该被限制
        expect(adjustedResult.video_narrative[0].sentence.length).toBeLessThanOrEqual(85);
    });
});

export { };
