"""
改进版：使用滑动窗口提示词提升叙事连贯性
"""

import base64
import json
import os
import spacy
from wordfreq import zipf_frequency
from zai import ZhipuAiClient

# 初始化
client = ZhipuAiClient(api_key="9c6603c2f1ee4a94b900f219f165d976.CYox1I8usvuEqM82")

# 加载 spacy 模型
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading spacy model...")
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")


def encode_image(image_path):
    """将图片编码为 base64"""
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Error encoding image: {e}")
        return None


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


def linguistic_post_process(llm_result, previous_context=""):
    """
    后处理逻辑：词汇分级、核心词选择
    """
    if not llm_result or "video_narrative" not in llm_result:
        print("Warning: Invalid or empty LLM result")
        return llm_result

    # 提取物体坐标映射
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

        # 添加上下文信息
        if previous_context:
            entry["context_continuity"] = {
                "previous_sentence": previous_context
            }

        refined_narrative.append(entry)

    return {"video_narrative": refined_narrative}


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
        print(f"JSON decode error: {e}")
        print(f"Raw response: {response_text[:500]}...")
        return None


def analyze_video_frames_with_sliding_window(image_paths, max_retries=2):
    """
    使用滑动窗口提示词分析视频帧，提升叙事连贯性

    Args:
        image_paths: 图片路径列表
        max_retries: 最大重试次数

    Returns:
        包含连贯叙事的 JSON 结果
    """
    all_narratives = []
    previous_sentence = ""

    print(f"\n🔄 使用滑动窗口模式分析 {len(image_paths)} 帧")
    print("=" * 60)

    for i, image_path in enumerate(image_paths):
        print(f"\n📷 分析第 {i+1}/{len(image_paths)} 帧")

        # 构建带有上下文的 Prompt
        context_part = ""
        if previous_sentence:
            context_part = f"""
### Context Continuity
The previous frame was described as: "{previous_sentence}"

### Instruction
Your description should:
1. Continue naturally from the previous description
2. Maintain narrative coherence and flow
3. Describe what changed or what's new in this scene
4. Use consistent terminology (e.g., don't switch between "rabbit" and "bunny")
"""

        prompt_text = f"""
### Role
Expert English Teacher & Visual Analyst specializing in narrative continuity.

### Task
Write a natural, descriptive narrative sentence for this image.

{context_part}
### Guidelines
- Use descriptive, academic English (15-25 words)
- Include advanced vocabulary (B2+ level words)
- Maintain narrative flow with previous frames
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
  ]{"," if previous_sentence else ""}
  "detected_objects": [
    {{
      "label": "noun from the sentence",
      "boxes": [[ymin, xmin, ymax, xmax]]
    }}
  ]
}}
"""

        content_list = [{"type": "text", "text": prompt_text}]
        base64_data = encode_image(image_path)
        if base64_data:
            content_list.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{base64_data}"}
            })

        # 调用 API，带重试
        for attempt in range(max_retries):
            try:
                response = client.chat.completions.create(
                    model="glm-4.6v-flash",
                    messages=[{"role": "user", "content": content_list}],
                    thinking={"type": "enabled"}
                )

                full_response = response.choices[0].message.content
                raw_json = parse_llm_response(full_response)

                if raw_json:
                    # 后处理
                    processed = linguistic_post_process(raw_json, previous_sentence)
                    all_narratives.extend(processed["video_narrative"])

                    # 更新上下文
                    if processed["video_narrative"]:
                        previous_sentence = processed["video_narrative"][0]["sentence"]
                        print(f"✓ 句子: {previous_sentence}")
                        print(f"  核心词: {processed['video_narrative'][0].get('core_word', '')}")

                    break
                else:
                    print(f"Attempt {attempt + 1}: Failed to parse JSON")
                    if attempt < max_retries - 1:
                        continue

            except Exception as e:
                print(f"Error on attempt {attempt + 1}: {e}")
                if attempt < max_retries - 1:
                    continue

    # 合并检测结果（简单处理：使用最后一帧的物体）
    if all_narratives:
        result = {
            "video_narrative": all_narratives,
            "mode": "sliding_window",
            "total_frames": len(image_paths),
            "context_type": "narrative_continuity"
        }
        return result
    else:
        return None


def save_result(result, output_path="output_sliding.json"):
    """保存结果到 JSON 文件"""
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"\n✓ Result saved to {output_path}")
        return True
    except Exception as e:
        print(f"Error saving result: {e}")
        return False


def print_sliding_summary(result):
    """打印滑动窗口分析摘要"""
    if not result or "video_narrative" not in result:
        print("\n❌ No valid result")
        return

    narratives = result["video_narrative"]
    print(f"\n{'='*60}")
    print(f"SLIDING WINDOW ANALYSIS COMPLETE")
    print(f"{'='*60}")
    print(f"Mode: {result.get('mode', 'unknown')}")
    print(f"Frames: {len(narratives)}")
    print(f"{'='*60}\n")

    total_vocab = 0
    for i, entry in enumerate(narratives):
        frame_idx = entry.get("frame_index", i)
        timestamp = entry.get("timestamp", "N/A")
        sentence = entry.get("sentence", "")
        core_word = entry.get("core_word", "")
        vocab_count = entry.get("vocabulary_count", 0)
        total_vocab += vocab_count

        # 显示上下文
        if "context_continuity" in entry:
            prev = entry["context_continuity"].get("previous_sentence", "")
            print(f"🔗 Previous: {prev}")

        print(f"\nFrame {frame_idx} [{timestamp}]")
        print(f"Sentence: {sentence}")
        if core_word:
            print(f"Core Word: {core_word}")
        print(f"Advanced Vocabulary: {vocab_count} word(s)")

    print(f"\n{'='*60}")
    print(f"Total Advanced Vocabulary: {total_vocab} word(s)")
    print(f"{'='*60}\n")


def compare_modes(image_paths):
    """对比普通模式和滑动窗口模式"""
    print("\n" + "="*60)
    print("📊 对比测试：普通模式 vs 滑动窗口模式")
    print("="*60)

    # 导入普通模式的测试
    from test import analyze_video_frames_flash as analyze_normal

    print("\n[模式 1] 普通模式（无上下文）")
    print("-" * 60)
    normal_result = analyze_normal(image_paths)
    if normal_result:
        from test import print_summary
        print_summary(normal_result)

    print("\n[模式 2] 滑动窗口模式（带上下文）")
    print("-" * 60)
    sliding_result = analyze_video_frames_with_sliding_window(image_paths)
    if sliding_result:
        print_sliding_summary(sliding_result)
        save_result(sliding_result, "output_sliding.json")

    # 保存对比结果
    if normal_result and sliding_result:
        comparison = {
            "normal_mode": normal_result,
            "sliding_window_mode": sliding_result,
            "comparison": {
                "total_vocab_normal": sum(n.get("vocabulary_count", 0) for n in normal_result["video_narrative"]),
                "total_vocab_sliding": sum(n.get("vocabulary_count", 0) for n in sliding_result["video_narrative"]),
            }
        }
        with open("comparison.json", "w", encoding="utf-8") as f:
            json.dump(comparison, f, indent=2, ensure_ascii=False)
        print("✓ Comparison saved to comparison.json")


def main():
    """主函数"""
    import sys

    if len(sys.argv) > 1:
        image_paths = sys.argv[1:]
    else:
        # 默认使用提取的帧
        image_paths = [
            "test_output/frames/frame_00.jpg",
            "test_output/frames/frame_01.jpg",
            "test_output/frames/frame_02.jpg",
            "test_output/frames/frame_03.jpg"
        ]

    print(f"Analyzing {len(image_paths)} frame(s) with sliding window...")
    print(f"Frames: {', '.join(image_paths)}")

    # 对比测试
    compare_modes(image_paths)


if __name__ == "__main__":
    main()
