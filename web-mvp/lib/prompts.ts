/**
 * Prompt 模板管理
 * 支持三种风格：日常口语、入门友好、散文文学
 */

export enum StyleType {
  CASUAL = 'casual',
  BEGINNER = 'beginner',
  LITERARY = 'literary'
}

export interface StyleConfig {
  id: StyleType;
  name: string;
  description: string;
  targetAudience: string;
  exampleWords: string[];
}

export const STYLE_CONFIGS: Record<StyleType, StyleConfig> = {
  [StyleType.CASUAL]: {
    id: StyleType.CASUAL,
    name: '日常口语',
    description: '适合日常交流，词汇简单常用，表达自然非正式',
    targetAudience: '日常交流者',
    exampleWords: ['get', 'go', 'see', 'look', 'think', 'talk', 'way', 'know', 'make', 'take']
  },
  [StyleType.BEGINNER]: {
    id: StyleType.BEGINNER,
    name: '低阶入门',
    description: '适合 A1/A2 级学习者，词汇高频基础，语法简单清晰',
    targetAudience: '初学者',
    exampleWords: ['have', 'is', 'are', 'was', 'were', 'can', 'will', 'would', 'should', 'could']
  },
  [StyleType.LITERARY]: {
    id: StyleType.LITERARY,
    name: '散文文学',
    description: '适合 B1/C1 级学习者，词汇丰富描写性，语句优雅连贯',
    targetAudience: '进阶学习者',
    exampleWords: ['however', 'moreover', 'nevertheless', 'consequently', 'furthermore', 'albeit', 'notwithstanding', 'whereas', 'meanwhile']
  }
};

/**
 * 生成 Prompt
 */
export function generatePrompt(
  style: StyleType,
  useSlidingWindow: boolean,
  previousSentence?: string
): string {
  const styleConfig = STYLE_CONFIGS[style];

  const contextPart = useSlidingWindow && previousSentence
    ? `### Context Continuity
The previous frame was described as: "${previousSentence}"

### Instruction
Your description should:
1. Continue naturally from the previous description
2. Maintain narrative coherence and flow
3. Describe what changed or what's new in this scene
4. Use consistent terminology (e.g., don't switch between "rabbit" and "bunny")
`
    : '';

  const styleGuidelines = getStyleGuidelines(style);
  const vocabularyGuidelines = getVocabularyGuidelines(style);

  return `### Role
Expert English Teacher & Visual Analyst specialized in ${styleConfig.name}.

### Task
Write a natural, descriptive narrative sentence for this image.

${contextPart}
${styleGuidelines}
${vocabularyGuidelines}

### Guidelines
- Use descriptive English (15-25 words)
- Be accurate with object detection
- Output ONLY valid JSON

### Output Format (Strict JSON ONLY)
{{
  "video_narrative": [
    {{
      "frame_index": 0,
      "timestamp": "00:00",
      "sentence": "Your descriptive sentence here."
    }}
  ],
  "detected_objects": [
    {{
      "label": "noun from your sentence",
      "boxes": [[ymin, xmin, ymax, xmax]]
    }}
  ]
}}`;
}

/**
 * 获取风格指导原则
 */
function getStyleGuidelines(style: StyleType): string {
  const styleConfig = STYLE_CONFIGS[style];
  const configs = {
    [StyleType.CASUAL]: {
      tone: 'friendly and conversational',
      length: '8-15 words',
      complexity: 'simple sentences, common contractions',
      examples: `
Examples:
- "It's a nice day. Let's take a walk."
- "What do you think about that?"
- "I see something moving over there."
- "Can you help me with this?"`
    },
    [StyleType.BEGINNER]: {
      tone: 'clear and supportive',
      length: '8-12 words',
      complexity: 'simple grammar (present tense, simple structures)',
      examples: `
Examples:
- "The cat is black and white."
- "I have a red apple."
- "There are three birds on the tree."
- "We can see the sun in the sky."
- "This book is for you."`
    },
    [StyleType.LITERARY]: {
      tone: 'elegant and sophisticated',
      length: '15-25 words',
      complexity: 'complex sentences, varied structures, figurative language',
      examples: `
Examples:
- "The rabbit's movements were as fluid as water, its fur catching the morning light."
- "Butterflies fluttered like dancing flowers, their wings painted with sunset colors."
- "The meadow stretched endlessly, a tapestry of greens and gold under the vast sky."
- "Time stood still, captured in the quiet elegance of this peaceful moment."`
    }
  };

  const config = configs[style];
  return `### Style Guidelines
- Target Audience: ${styleConfig.targetAudience}
- Tone: ${config.tone}
- Recommended Sentence Length: ${config.length}
- Complexity Level: ${config.complexity}
- Common Words: ${styleConfig.exampleWords.join(', ')}

${config.examples}`;
}


/**
 * 获取词汇指导原则
 */
function getVocabularyGuidelines(style: StyleType): string {
  const styleConfig = STYLE_CONFIGS[style];
  const configs = {
    [StyleType.CASUAL]: {
      level: 'A1/A2 (Basic - most common 2000 words)',
      selection: 'Use simple, everyday vocabulary',
      avoidance: 'Avoid overly complex or literary words',
      emphasis: 'Focus on communication and meaning'
    },
    [StyleType.BEGINNER]: {
      level: 'A1/A2 (Beginner - core vocabulary)',
      selection: 'Use high-frequency, familiar words',
      avoidance: 'Avoid slang or overly colloquial expressions',
      emphasis: 'Focus on clarity and comprehension'
    },
    [StyleType.LITERARY]: {
      level: 'B1/C1 (Advanced - rich descriptive vocabulary)',
      selection: 'Use varied, expressive vocabulary with literary quality',
      avoidance: 'Avoid overly simple or repetitive language',
      emphasis: 'Focus on narrative flow, imagery, and stylistic elegance'
    }
  };

  const config = configs[style];
  return `### Vocabulary Guidelines
- CEFR Level Target: ${config.level}
- Word Selection: ${config.selection}
- Words to Avoid: ${config.avoidance}
- Emphasis: ${config.emphasis}

Style-Specific Vocabulary List:
${styleConfig.exampleWords.map((word: string) => `- ${word}`).join('\n')}`;
}

