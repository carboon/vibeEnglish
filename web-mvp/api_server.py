"""
统一 API 脚本
为 Next.js 后端提供 HTTP API 接口
"""

import base64
import json
import sys
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from io import BytesIO
from PIL import Image

# 导入现有的分析模块
import spacy
from wordfreq import zipf_frequency
from zai import ZhipuAiClient

# 初始化
app = Flask(__name__)
CORS(app)

client = ZhipuAiClient(api_key="9c6603c2f1ee4a94b900f219f165d976.CYox1I8usvuEqM82")

# 加载 spacy
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")


def get_word_level(zipf_val):
    """根据 Zipf 频率值返回 CEFR 等级"""
    if zipf_val < 3.0:
        return "C1/C2"
    elif zipf_val < 4.0:
        return "B2"
    elif zipf_val < 4.5:
        return "B1/B2"
    else:
        return "A1/A2"


def parse_llm_response(response_text):
    """解析 LLM 返回的内容，提取 JSON"""
    try:
        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            json_str = response_text.split("```")[1].split("```")[0].strip()
        else:
            json_str = response_text.strip()

        return json.loads(json_str)
    except json.JSONDecodeError as e:
        return None


def linguistic_post_process(llm_result):
    """语言学后处理"""
    if not llm_result or "video_narrative" not in llm_result:
        return llm_result

    grounding_map = {
        obj["label"].lower(): obj["boxes"]
        for obj in llm_result.get("detected_objects", [])
    }

    refined_narrative = []
    for entry in llm_result["video_narrative"]:
        sentence = entry.get("sentence", "")
        if not sentence:
            continue

        doc = nlp(sentence)

        candidates = []
        for token in doc:
            if not token.is_stop and not token.is_punct and len(token.text) > 2:
                word_lemma = token.lemma_.lower()
                zipf_val = zipf_frequency(word_lemma, 'en')

                if 2.5 < zipf_val < 5.5:
                    word_info = {
                        "word": token.text,
                        "lemma": word_lemma,
                        "level": get_word_level(zipf_val),
                        "frequency": f"Zipf: {round(zipf_val, 2)}",
                        "pos": token.pos_
                    }

                    if token.pos_ in ["NOUN", "PROPN"]:
                        coords = grounding_map.get(word_lemma) or grounding_map.get(token.text.lower())
                        word_info["coordinates"] = coords if coords else []

                    candidates.append(word_info)

        candidates.sort(key=lambda x: zipf_frequency(x['lemma'], 'en'))
        entry["advanced_vocabulary"] = candidates
        entry["core_word"] = candidates[0]["word"] if candidates else ""
        entry["vocabulary_count"] = len(candidates)

        refined_narrative.append(entry)

    return {"video_narrative": refined_narrative}


@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({"status": "ok", "service": "vibeenglish-api"})


@app.route('/analyze', methods=['POST'])
def analyze():
    """
    分析视频帧
    请求格式：
    {
        "frames": ["base64_image_1", "base64_image_2", ...],
        "use_sliding_window": false
    }
    """
    try:
        data = request.get_json()
        frames = data.get('frames', [])
        use_sliding_window = data.get('use_sliding_window', False)

        if not frames or not isinstance(frames, list):
            return jsonify({"error": "Invalid frames input"}), 400

        # 限制最大帧数
        frames = frames[:20]

        all_narratives = []
        previous_sentence = ""

        # 构建提示词
        for i, frame_b64 in enumerate(frames):
            # 解码 base64 图片
            image_data = base64.b64decode(frame_b64)
            image = Image.open(BytesIO(image_data))

            # 构建上下文部分
            context_part = ""
            if use_sliding_window and previous_sentence:
                context_part = f"""
### Context Continuity
The previous frame was described as: \"{previous_sentence}\"

### Instruction
Your description should:
1. Continue naturally from the previous description
2. Maintain narrative coherence and flow
3. Describe what changed or what's new in this scene
4. Use consistent terminology
"""

            # 构建 Prompt
            prompt_text = f"""
### Role
Expert English Teacher & Visual Analyst specializing in narrative continuity.

### Task
Write a natural, descriptive narrative sentence for this image.

{context_part}
### Guidelines
- Use descriptive, academic English (15-25 words)
- Include advanced vocabulary (B2+ level words)
{ "- Maintain narrative flow with previous frames" if use_sliding_window else ""}
- Be accurate with object detection
- Output ONLY valid JSON

### Output Format (Strict JSON ONLY)
{{
  "video_narrative": [
    {{
      "frame_index": {i},
      "timestamp": "{i*2:02d}:{(i*2)%60:02d}",
      "sentence": "Your descriptive sentence here."
    }}
  ]{"," if previous_sentence and use_sliding_window else ""}
  "detected_objects": [
    {{
      "label": "noun from the sentence",
      "boxes": [[ymin, xmin, ymax, xmax]]
    }}
  ]
}}
"""

            # 构建消息内容
            content_list = [{"type": "text", "text": prompt_text}]
            content_list.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{frame_b64}"}
            })

            # 调用智谱 AI
            response = client.chat.completions.create(
                model="glm-4.6v-flash",
                messages=[{"role": "user", "content": content_list}],
                thinking={"type": "enabled"}
            )

            full_response = response.choices[0].message.content
            raw_json = parse_llm_response(full_response)

            if not raw_json:
                return jsonify({"error": "Failed to parse AI response"}), 500

            # 后处理
            processed = linguistic_post_process(raw_json)
            if processed["video_narrative"]:
                all_narratives.extend(processed["video_narrative"])
                previous_sentence = processed["video_narrative"][0]["sentence"]

        # 构建结果
        result = {
            "video_narrative": all_narratives,
            "mode": "sliding_window" if use_sliding_window else "normal",
            "total_frames": len(frames),
            "context_type": "narrative_continuity" if use_sliding_window else "none"
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("🚀 VibeEnglish API Server starting...")
    print("📡 Health check: http://localhost:5000/health")
    print("📊 Analyze endpoint: http://localhost:5000/analyze")
    print("=" * 60)

    app.run(host='0.0.0.0', port=5000, debug=True)
