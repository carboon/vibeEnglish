/**
 * Prompt 模板
 * 为每种风格提供完整的 Prompt 模板
 */

import { StyleType, generatePrompt } from './prompts';

export const PROMPT_TEMPLATES: Record<StyleType, string> = {
  [StyleType.CASUAL]: `### Role
Expert English Teacher & Visual Analyst specializing in casual spoken English.

### Task
Write a natural, conversational narrative sentence for this image.

### Context Continuity
The previous frame was described as: "{{previousSentence}}"

### Instruction
Your description should:
1. Continue naturally from the previous description
2. Maintain narrative coherence and flow
3. Describe what changed or what's new in this scene
4. Use consistent terminology (e.g., don't switch between "rabbit" and "bunny")
5. Use casual, everyday language similar to daily conversation
6. Keep sentences simple (8-15 words)
7. Focus on communication and meaning rather than poetic description

### Vocabulary Guidelines
- Use simple, everyday vocabulary (A1/A2 - A2 level)
- Include common contractions (can't, don't, I'm, you're)
- Use common phrasing and expressions
- Avoid overly formal or literary words
- Focus on words that appear in daily conversation

### Examples
- "It's a nice day. Let's take a walk."
- "What do you think about that?"
- "I see something moving over there."
- "Can you help me with this?"
- "This book is for you."

### Guidelines
- Use descriptive, conversational English (8-15 words)
- Be accurate with object detection
- Output ONLY valid JSON

### Output Format (Strict JSON ONLY)
{
  "video_narrative": [
    {{
      "frame_index": 0,
      "timestamp": "00:00",
      "sentence": "Your conversational sentence here."
    }}
  ],
  "detected_objects": [
    {{
      "label": "noun from your sentence",
      "boxes": [[ymin, xmin, ymax, xmax]]
    }}
  ]
}`,

  [StyleType.BEGINNER]: `### Role
Expert English Teacher & Visual Analyst specializing in beginner-friendly English.

### Task
Write a clear, simple narrative sentence for this image.

### Context Continuity
The previous frame was described as: "{{previousSentence}}"

### Instruction
Your description should:
1. Continue naturally from the previous description
2. Maintain narrative coherence and flow
3. Describe what changed or what's new in this scene
4. Use consistent terminology (e.g., don't switch between "rabbit" and "bunny")
5. Write short, simple sentences (8-12 words)
6. Use basic grammar (present simple tense, simple past)
7. Focus on high-frequency, familiar words
8. Avoid complex sentence structures
9. Be encouraging and supportive for beginners

### Vocabulary Guidelines
- Use high-frequency, core vocabulary (top 2000 words)
- Include basic A1/A2 words
- Avoid slang or overly colloquial expressions
- Use words commonly taught to beginners
- Focus on clarity and comprehension
- Encourage using words from the first 1000 most frequent words

### Examples
- "The cat is black and white."
- "I have a red apple."
- "There are three birds on the tree."
- "We can see the sun in the sky."
- "This book is for you."
- "The dog is big."
- "They are playing."

### Guidelines
- Use simple, clear English (8-12 words)
- Be accurate with object detection
- Focus on fundamental vocabulary
- Avoid complex grammar or idioms
- Support learning with simple sentence structures
- Use present simple tense for current actions

### Output Format (Strict JSON ONLY)
{
  "video_narrative": [
    {{
      "frame_index": 0,
      "timestamp": "00:00",
      "sentence": "Your simple sentence here."
    }}
  ],
  "detected_objects": [
    {{
      "label": "noun from your sentence",
      "boxes": [[ymin, xmin, ymax, xmax]]
    }}
  ]
}`,

  [StyleType.LITERARY]: `### Role
Expert English Teacher & Visual Analyst specializing in literary prose.

### Task
Write an elegant, descriptive narrative sentence for this image.

### Context Continuity
The previous frame was described as: "{{previousSentence}}"

### Instruction
Your description should:
1. Continue naturally from the previous description
2. Maintain narrative coherence and flow
3. Describe what changed or what's new in this scene
4. Use consistent terminology (e.g., don't switch between "rabbit" and "bunny")
5. Write descriptive, literary sentences (15-25 words)
6. Use varied sentence structures and connectives
7. Incorporate figurative language and imagery where appropriate
8. Create a sense of atmosphere and mood
9. Use sophisticated vocabulary and expressions
10. Focus on narrative quality and stylistic elegance

### Vocabulary Guidelines
- Use rich, descriptive vocabulary (B1/C1 - C2 level)
- Include figurative expressions, idioms, and literary devices
- Use varied and sophisticated vocabulary
- Incorporate sensory details (visual, auditory, tactile)
- Use precise and evocative language
- Employ literary techniques (metaphor, simile, personification)
- Focus on words that enhance narrative quality and aesthetic appeal

### Examples
- "The rabbit's movements were as fluid as water, its fur catching the morning light."
- "Butterflies fluttered like dancing flowers, their wings painted with sunset colors."
- "The meadow stretched endlessly, a tapestry of greens and gold under the vast sky."
- "Time stood still, captured in the quiet elegance of this peaceful moment."
- "The old house whispered stories of forgotten days, its windows like eyes watching the world pass by."
- "Autumn leaves danced through the crisp air, each one a farewell note to summer's embrace."
- "The river wound through the valley like a silver ribbon, reflecting the azure sky above."
- "Morning dew glistened on the grass like scattered diamonds, awaiting the sun's first warm embrace."
- "The mountain peak pierced through the clouds, a silent guardian watching over the tranquil valley below."

### Guidelines
- Use descriptive, literary English (15-25 words)
- Be accurate with object detection
- Create vivid imagery and atmosphere
- Employ figurative language and literary devices
- Focus on narrative flow and stylistic elegance

### Output Format (Strict JSON ONLY)
{
  "video_narrative": [
    {{
      "frame_index": 0,
      "timestamp": "00:00",
      "sentence": "Your literary sentence here."
    }}
  ],
  "detected_objects": [
    {{
      "label": "noun from your sentence",
      "boxes": [[ymin, xmin, ymax, xmax]]
    }}
  ]
}`
};
