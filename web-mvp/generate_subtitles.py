#!/usr/bin/env python3
"""
视频分析脚本 - VibeEnglish
用于生成带词汇高亮的英文文稿

使用方法：
1. GLM-4V-Flash API (多模态视觉分析)
2. spacy 分词和词性标注
3. wordfreq 词汇频率和难度计算
4. CEFR 分级标准
"""

import os
import json
import requests
from typing import List, Dict, Optional

# ============== 配置 ==============
API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
API_KEY = "d836e1d-4236-4ed0-9e25-d9d35d54973"  # 替换为实际 API Key
FRAME_DIR = "temp_frames"
OUTPUT_FILE = "video_narrative.json"

# ============== Prompt 模板 ==============
PROMPT_TEMPLATES = {
  "casual": """### Role
Expert English Teacher & Visual Analyst specialized in casual spoken English.

### Task
Write a natural, descriptive narrative sentence for this image.

### Guidelines
- Use descriptive English (15-25 words)
- Focus on communication and meaning
- Use simple, everyday vocabulary similar to daily conversation
- Include common contractions (can't, don't, I'm, you're)
- Be accurate with object detection
- Output ONLY valid JSON

### Example
- "It's a nice day. Let's take a walk."
- "What do you think about that?"
- "I see something moving over there."

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
}}""",

  "beginner": """### Role
Expert English Teacher & Visual Analyst specialized in beginner-friendly English.

### Task
Write a clear, simple narrative sentence for this image.

### Guidelines
- Use simple, clear English (8-12 words)
- Use high-frequency, familiar words from top 2000
- Use basic grammar (present simple tense, simple structures)
- Use short, clear sentences (8-12 words)
- Focus on fundamental vocabulary (have, is, are, was, were, can, will, would, should)
- Avoid complex sentence structures
- Avoid slang or overly colloquial expressions
- Be encouraging and supportive for beginners

### Example
- "The cat is black and white."
- "I have a red apple."
- "There are three birds on tree."
- "This book is for you."
- "The dog is big."

### Output Format (Strict JSON ONLY)
{{
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
}}""",

  "literary": """### Role
Expert English Teacher & Visual Analyst specialized in literary prose.

### Task
Write an elegant, descriptive narrative sentence for this image.

### Guidelines
- Use descriptive, literary English (15-25 words)
- Use varied sentence structures and connectives
- Include figurative language and imagery where appropriate
- Create a sense of atmosphere and mood
- Use sophisticated vocabulary and expressions
- Employ literary techniques (metaphor, simile, personification)
- Focus on narrative quality and stylistic elegance

### Example
- "The rabbit's movements were as fluid as water, its fur catching morning light."
- "Butterflies fluttered like dancing flowers, their wings painted with sunset colors."
- "The meadow stretched endlessly, a tapestry of greens and gold under vast sky."
- "Time stood still, captured in the quiet elegance of this peaceful moment."
- "The old house whispered stories of forgotten days, its windows like eyes watching the world pass by."
- "Autumn leaves danced through the crisp air, each one a farewell note to summer's embrace."
- "The mountain peak pierced through the clouds, a silent guardian watching over the tranquil valley below."

### Output Format (Strict JSON ONLY)
{{
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
}}"""
}

# ============== 视频帧获取 ==============
def get_video_frames(frame_dir: str = FRAME_DIR, max_frames: int = 10) -> List[str]:
    """获取视频帧列表
    
    Args:
        frame_dir: 帧目录
        max_frames: 最大帧数
    
    Returns:
        帧文件路径列表（base64编码）
    """
    frames = []
    
    # 检查目录是否存在
    if not os.path.exists(frame_dir):
        print(f"❌ Error: Frame directory not found: {frame_dir}")
        return frames
    
    # 获取所有 JPG 文件
    frame_files = sorted([f for f in os.listdir(frame_dir) if f.endswith('.jpg')])
    
    # 限制帧数
    frame_files = frame_files[:max_frames]
    
    print(f"📹 Found {len(frame_files)} frames in {frame_dir}")
    
    # 读取并编码为 base64
    for i, filename in enumerate(frame_files):
        filepath = os.path.join(frame_dir, filename)
        
        try:
            with open(filepath, 'rb') as f:
                image_data = f.read()
            
            # 转换为 base64
            import base64
            base64_data = base64.b64encode(image_data).decode('utf-8')
            frames.append(base64_data)
            
            print(f"✅ Frame {i+1}/{len(frame_files)}: {filename}")
            
        except Exception as e:
            print(f"❌ Error reading {filename}: {e}")
            continue
    
    return frames

# ============== GLM-4V API 调用 ==============
def call_glm_api(frame_base64: str, style: str = 'casual') -> Optional[dict]:
    """调用 GLM-4V-Flash API 进行视频分析
    
    Args:
        frame_base64: 视频帧的 base64 编码
        style: Prompt 风格 (casual, beginner, literary)
    
    Returns:
        API 响应字典，如果失败则返回 None
    """
    # 选择 Prompt 模板
    prompt = PROMPT_TEMPLATES.get(style, PROMPT_TEMPLATES['casual'])
    
    # 构建 API 请求
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "glm-4v-flash",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": f"data:image/jpeg;base64,{frame_base64}"
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ],
        "stream": False,
        "temperature": 0.7
    }
    
    try:
        print(f"📡 Calling GLM-4V API with {style} style...")
        response = requests.post(API_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        
        data = response.json()
        
        if 'choices' in data and len(data['choices']) > 0:
            content = data['choices'][0]['message']['content']
            
            # 解析 JSON 内容
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            
            if json_match:
                try:
                    result = json.loads(json_match.group())
                    print(f"✅ API response received for {style} style")
                    return result
                except json.JSONDecodeError as e:
                    print(f"❌ Failed to parse API response: {e}")
                    return None
        
        print(f"❌ API response format unexpected")
        return None
        
    except requests.exceptions.RequestException as e:
        print(f"❌ API call failed: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return None

# ============== 语言学处理 ==============
def process_linguistic_analysis(sentence: str) -> Dict:
    """语言学后处理（分词、难度分级、核心词选择）
    
    Args:
        sentence: 输入句子
    
    Returns:
        处理结果字典
    """
    import spacy
    from collections import Counter
    
    # 加载英文语言模型
    nlp = spacy.load('en_core_web_sm')
    
    # 分词
    doc = nlp(sentence)
    tokens = [token for token in doc if not token.is_stop and not token.is_punct]
    
    # 词性标注
    pos_tags = [token.pos_ for token in tokens]
    
    # 统计词频
    word_freq = Counter(tokens)
    
    # 计算每个词的 CEFR 等级（使用 wordfreq）
    advanced_vocabulary = []
    
    for token in set(tokens):
        word = token.text.lower()
        
        try:
            import wordfreq as wf
            zipf = wf.zipf_frequency(word)
            
            # CEFR 分级
            if zipf >= 7.0:
                level = 'C1/C2'
            elif zipf >= 5.0:
                level = 'B2'
            elif zipf >= 3.0:
                level = 'B1/B2'
            else:
                level = 'A1/A2'
            
            # 只保留高级词汇（B1 以上）
            if level != 'A1/A2':
                pos = token.pos_
                
                advanced_vocabulary.append({
                    'word': word,
                    'lemma': token.lemma_ if hasattr(token, 'lemma_') else word,
                    'level': level,
                    'frequency': f"Zipf: {zipf:.2f}",
                    'pos': pos
                })
                
        except Exception as e:
            print(f"Warning: Could not determine level for {word}: {e}")
            continue
    
    # 选择核心词（最高级词汇）
    if advanced_vocabulary:
        # 按等级排序（C1/C2 > B2 > B1/B2 > A1/A2）
        level_order = {'C1/C2': 3, 'B2': 2, 'B1/B2': 1, 'A1/A2': 0}
        
        advanced_vocabulary.sort(
            key=lambda x: level_order.get(x['level'], 0),
            reverse=True
        )
        
        core_word = advanced_vocabulary[0]['word'] if advanced_vocabulary else ''
    else:
        core_word = ''
    
    return {
        'advanced_vocabulary': advanced_vocabulary,
        'vocabulary_count': len(advanced_vocabulary),
        'core_word': core_word
    }

# ============== 主流程 ==============
def main():
    print("="*50)
    print("🎬 VibeEnglish Video Analysis Script")
    print("="*50)
    print(f"📝 Frame Directory: {FRAME_DIR}")
    print(f"📄 Output File: {OUTPUT_FILE}")
    print("="*50)
    
    # 步骤 1: 获取视频帧
    print("\n" + "="*50)
    print("📸 Step 1: Getting video frames...")
    print("="*50)
    
    frames = get_video_frames(FRAME_DIR, max_frames=5)
    
    if not frames:
        print("❌ No frames found. Please run frame extraction first.")
        return
    
    # 步骤 2: 分析每一帧
    print("\n" + "="*50)
    print("🤖 Step 2: Analyzing frames with GLM-4V...")
    print("="*50)
    
    all_narratives = []
    use_sliding_window = True
    style = 'casual'  # 可选: 'beginner', 'literary'
    
    for i, frame_base64 in enumerate(frames):
        print(f"\n📸 Processing frame {i+1}/{len(frames)}...")
        
        # 构建 Prompt（如果使用滑动窗口）
        if use_sliding_window and i > 0:
            previous_sentence = all_narratives[-1]['sentence']
            prompt = f"""### Context Continuity
The previous frame was described as: "{previous_sentence}"

### Instruction
Your description should:
1. Continue naturally from previous description
2. Maintain narrative coherence and flow
3. Describe what changed or what's new in this scene
4. Use consistent terminology (e.g., don't switch between "rabbit" and "bunny")

### Guidelines
- Use descriptive English (15-25 words)
- Focus on communication and meaning
- Include common contractions
- Be accurate with object detection
- Output ONLY valid JSON

### Output Format (Strict JSON ONLY)
{{
  "video_narrative": [
    {{
      "frame_index": {i},
      "timestamp": "{(i * 2).toString().padStart(2, '0')}:{(i * 2 % 60).toString().padStart(2, '0')}",
      "sentence": "Your descriptive sentence here."
    }}
  ],
  "detected_objects": [
    {{
      "label": "noun from your sentence",
      "boxes": [[ymin, xmin, ymax, xmax]]
    }}
  ]
}}"""
        else:
            prompt = PROMPT_TEMPLATES[style]
        
        # 调用 API
        api_result = call_glm_api(frame_base64, style)
        
        if api_result and 'video_narrative' in api_result:
            narrative = api_result['video_narrative'][0]
            
            # 语言学后处理
            linguistic_result = process_linguistic_analysis(narrative['sentence'])
            
            all_narratives.append({
                'frame_index': i,
                'timestamp': f"{(i * 2).toString().padStart(2, '0')}:{(i * 2 % 60).toString().padStart(2, '0')}",
                'sentence': narrative['sentence'],
                'advanced_vocabulary': linguistic_result['advanced_vocabulary'],
                'core_word': linguistic_result['core_word'],
                'vocabulary_count': linguistic_result['vocabulary_count'],
                'context_continuity': {
                    'previous_sentence': all_narratives[i-1]['sentence'] if i > 0 else ''
                }
            })
            
            print(f"✅ Frame {i+1} analyzed: {narrative['sentence'][:50]}...")
            print(f"   - Advanced vocab: {linguistic_result['vocabulary_count']} words")
            print(f"   - Core word: {linguistic_result['core_word']}")
        else:
            print(f"❌ Failed to analyze frame {i+1}")
            continue
    
    # 步骤 3: 保存结果
    print("\n" + "="*50)
    print("💾 Step 3: Saving results...")
    print("="*50)
    
    final_result = {
        'video_narrative': all_narratives,
        'mode': 'sliding_window' if use_sliding_window else 'normal',
        'total_frames': len(frames),
        'style': style,
        'context_type': 'narrative_continuity' if use_sliding_window else 'none'
    }
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_result, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Results saved to {OUTPUT_FILE}")
    print(f"📊 Total frames: {len(frames)}")
    print(f"📊 Total advanced vocabulary: {sum(n['vocabulary_count'] for n in all_narratives)}")
    print(f"📊 Average vocab per frame: {sum(n['vocabulary_count'] for n in all_narratives) / len(all_narratives):.1f}")
    
    print("\n" + "="*50)
    print("🎉 Analysis complete!")
    print("="*50)

if __name__ == "__main__":
    main()
