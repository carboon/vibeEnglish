/**
 * Prompts 模块单元测试
 * 测试 Prompt 生成和风格配置
 */

import {
    StyleType,
    STYLE_CONFIGS,
    generatePrompt
} from '../lib/prompts';

describe('StyleType Enum', () => {
    test('has three style types', () => {
        expect(Object.values(StyleType)).toHaveLength(3);
    });

    test('contains CASUAL style', () => {
        expect(StyleType.CASUAL).toBe('casual');
    });

    test('contains BEGINNER style', () => {
        expect(StyleType.BEGINNER).toBe('beginner');
    });

    test('contains LITERARY style', () => {
        expect(StyleType.LITERARY).toBe('literary');
    });
});

describe('STYLE_CONFIGS', () => {
    test('has config for each style type', () => {
        expect(STYLE_CONFIGS[StyleType.CASUAL]).toBeDefined();
        expect(STYLE_CONFIGS[StyleType.BEGINNER]).toBeDefined();
        expect(STYLE_CONFIGS[StyleType.LITERARY]).toBeDefined();
    });

    test('casual config has correct structure', () => {
        const config = STYLE_CONFIGS[StyleType.CASUAL];
        expect(config.id).toBe(StyleType.CASUAL);
        expect(config.name).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.targetAudience).toBeDefined();
        expect(Array.isArray(config.exampleWords)).toBe(true);
        expect(config.exampleWords.length).toBeGreaterThan(0);
    });

    test('beginner config has correct structure', () => {
        const config = STYLE_CONFIGS[StyleType.BEGINNER];
        expect(config.id).toBe(StyleType.BEGINNER);
        expect(config.name).toBeDefined();
        expect(config.targetAudience).toBeDefined();
    });

    test('literary config has correct structure', () => {
        const config = STYLE_CONFIGS[StyleType.LITERARY];
        expect(config.id).toBe(StyleType.LITERARY);
        expect(config.name).toBeDefined();
        expect(config.targetAudience).toBeDefined();
    });
});

describe('generatePrompt', () => {
    test('generates prompt for casual style', () => {
        const prompt = generatePrompt(StyleType.CASUAL, false);

        expect(prompt).toContain('Role');
        expect(prompt).toContain('Task');
        expect(prompt).toContain('Output Format');
        expect(prompt).toContain('video_narrative');
    });

    test('generates prompt for beginner style', () => {
        const prompt = generatePrompt(StyleType.BEGINNER, false);

        expect(prompt).toContain('Role');
        expect(prompt).toContain('Task');
    });

    test('generates prompt for literary style', () => {
        const prompt = generatePrompt(StyleType.LITERARY, false);

        expect(prompt).toContain('Role');
        expect(prompt).toContain('Task');
    });

    test('includes context when sliding window enabled', () => {
        const previousSentence = 'The rabbit hops across the field.';
        const prompt = generatePrompt(StyleType.CASUAL, true, previousSentence);

        expect(prompt).toContain('Context Continuity');
        expect(prompt).toContain(previousSentence);
        expect(prompt).toContain('Continue naturally');
    });

    test('does not include context when sliding window disabled', () => {
        const prompt = generatePrompt(StyleType.CASUAL, false);

        expect(prompt).not.toContain('Context Continuity');
        expect(prompt).not.toContain('previous frame');
    });

    test('includes JSON output format', () => {
        const prompt = generatePrompt(StyleType.CASUAL, false);

        expect(prompt).toContain('video_narrative');
        expect(prompt).toContain('frame_index');
        expect(prompt).toContain('timestamp');
        expect(prompt).toContain('sentence');
        expect(prompt).toContain('detected_objects');
    });
});

export { };
