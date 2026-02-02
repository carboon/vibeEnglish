/**
 * Prompt 模板单元测试
 */

import {
  StyleType,
  STYLE_CONFIGS,
  generatePrompt,
  getStyleGuidelines,
  getVocabularyGuidelines
} from '../lib/prompts';

describe('Style Configuration', () => {
  test('has correct number of styles', () => {
    expect(Object.keys(STYLE_CONFIGS)).toHaveLength(3);
  });

  test('casual style has correct config', () => {
    const config = STYLE_CONFIGS[StyleType.CASUAL];
    expect(config.id).toBe('casual');
    expect(config.name).toBe('日常口语');
    expect(config.targetAudience).toBe('日常交流者');
  });

  test('beginner style has correct config', () => {
    const config = STYLE_CONFIGS[StyleType.BEGINNER];
    expect(config.id).toBe('beginner');
    expect(config.name).toBe('低阶入门');
    expect(config.targetAudience).toBe('初学者');
  });

  test('literary style has correct config', () => {
    const config = STYLE_CONFIGS[StyleType.LITERARY];
    expect(config.id).toBe('literary');
    expect(config.name).toBe('散文文学');
    expect(config.targetAudience).toBe('进阶学习者');
  });
});

describe('Prompt Generation', () => {
  test('generates casual style prompt', () => {
    const prompt = generatePrompt(StyleType.CASUAL, false);
    
    expect(prompt).toContain('casual spoken English');
    expect(prompt).toContain('A1/A2 (Basic - most common 2000 words)');
    expect(prompt).toContain('Use simple, everyday vocabulary');
  });

  test('generates beginner style prompt', () => {
    const prompt = generatePrompt(StyleType.BEGINNER, false);
    
    expect(prompt).toContain('beginner-friendly English');
    expect(prompt).toContain('A1/A2 (Beginner - core vocabulary)');
    expect(prompt).toContain('Use high-frequency, familiar words');
  });

  test('generates literary style prompt', () => {
    const prompt = generatePrompt(StyleType.LITERARY, false);
    
    expect(prompt).toContain('literary prose');
    expect(prompt).toContain('B1/C1 (Advanced - rich descriptive vocabulary)');
    expect(prompt).toContain('Use varied, expressive vocabulary');
  });

  test('includes context continuity when sliding window enabled', () => {
    const prompt = generatePrompt(StyleType.CASUAL, true, 'Previous frame description here.');
    
    expect(prompt).toContain('### Context Continuity');
    expect(prompt).toContain('The previous frame was described as');
    expect(prompt).toContain('Continue naturally from previous description');
  });

  test('does not include context when sliding window disabled', () => {
    const prompt = generatePrompt(StyleType.CASUAL, false);
    
    expect(prompt).not.toContain('### Context Continuity');
    expect(prompt).not.toContain('The previous frame');
  });
});

describe('Style Guidelines Generation', () => {
  test('casual guidelines include friendly tone', () => {
    const guidelines = getStyleGuidelines(StyleType.CASUAL);
    
    expect(guidelines).toContain('Tone: friendly and conversational');
    expect(guidelines).toContain('Recommended Sentence Length: 8-15 words');
  });

  test('beginner guidelines include supportive tone', () => {
    const guidelines = getStyleGuidelines(StyleType.BEGINNER);
    
    expect(guidelines).toContain('Tone: clear and supportive');
    expect(guidelines).toContain('Recommended Sentence Length: 8-12 words');
    expect(guidelines).toContain('Use simple grammar (present simple tense, simple structures)');
  });

  test('literary guidelines include elegant tone', () => {
    const guidelines = getStyleGuidelines(StyleType.LITERARY);
    
    expect(guidelines).toContain('Tone: elegant and sophisticated');
    expect(guidelines).toContain('Recommended Sentence Length: 15-25 words');
    expect(guidelines).toContain('Use complex sentences, varied structures');
  });
});

describe('Vocabulary Guidelines Generation', () => {
  test('casual vocabulary targets A1/A2', () => {
    const guidelines = getVocabularyGuidelines(StyleType.CASUAL);
    
    expect(guidelines).toContain('CEFR Level Target: A1/A2 (Basic - most common 2000 words)');
    expect(guidelines).toContain('Use simple, everyday vocabulary');
  });

  test('beginner vocabulary targets A1/A2 core words', () => {
    const guidelines = getVocabularyGuidelines(StyleType.BEGINNER);
    
    expect(guidelines).toContain('CEFR Level Target: A1/A2 (Beginner - core vocabulary)');
    expect(guidelines).toContain('Use high-frequency, familiar words');
  });

  test('literary vocabulary targets B1/C1', () => {
    const guidelines = getVocabularyGuidelines(StyleType.LITERARY);
    
    expect(guidelines).toContain('CEFR Level Target: B1/C1 (Advanced - rich descriptive vocabulary)');
    expect(guidelines).toContain('Use varied, expressive vocabulary');
    expect(guidelines).toContain('Include figurative language, imagery, and stylistic elements');
  });

  test('includes example words list', () => {
    const guidelines = getVocabularyGuidelines(StyleType.CASUAL);
    
    expect(guidelines).toContain('Style-Specific Vocabulary List:');
    expect(guidelines).toContain('- get');
    expect(guidelines).toContain('- go');
  });
});

describe('Prompt Format Validation', () => {
  test('contains required sections', () => {
    const prompt = generatePrompt(StyleType.CASUAL, false);
    
    expect(prompt).toContain('### Role');
    expect(prompt).toContain('### Task');
    expect(prompt).toContain('### Guidelines');
    expect(prompt).toContain('### Output Format');
    expect(prompt).toContain('video_narrative');
    expect(prompt).toContain('detected_objects');
  });

  test('includes valid JSON structure', () => {
    const prompt = generatePrompt(StyleType.CASUAL, false);
    
    expect(prompt).toContain('"frame_index": 0');
    expect(prompt).toContain('"timestamp": "00:00"');
    expect(prompt).toContain('"sentence":');
    expect(prompt).toContain('"boxes": [[ymin, xmin, ymax, xmax]]');
  });

  test('includes ONLY valid JSON instruction', () => {
    const prompt = generatePrompt(StyleType.CASUAL, false);
    
    expect(prompt).toContain('Output ONLY valid JSON');
    expect(prompt).toContain('Strict JSON ONLY');
  });
});

export {};
