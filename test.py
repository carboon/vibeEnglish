import base64
import json
import os
import spacy
from wordfreq import zipf_frequency
from zai import ZhipuAiClient
import sys

# 1. 初始化
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

def linguistic_post_process(llm_result):
    """
    后处理逻辑：词汇分级、核心词选择
    """
    if not llm_result or "video_narrative" not in llm_result:
        print("Warning: Invalid or empty LLM result")
        return llm_result

    # 提取模型识别到的所有物体坐标，建立映射表
    # GLM 格式通常为: {"label": "cup", "boxes": [[ymin, xmin, ymax, xmax]]}
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
            # 过滤停用词、标点符号和过短的词
            if not token.is_stop and not token.is_punct and len(token.text) > 2:
                word_lemma = token.lemma_.lower()
                zipf_val = zipf_frequency(word_lemma, 'en')

                # 难度过滤：只保留 A2 到 C2 级别的词（排除过简单和过罕见的词）
                if 2.5 < zipf_val < 5.5:
                    word_info = {
                        "word": token.text,
                        "lemma": word_lemma,
                        "level": get_word_level(zipf_val),
                        "frequency": f"Zipf: {round(zipf_val, 2)}",
                        "pos": token.pos_
                    }

                    # 如果是名词，尝试匹配坐标
                    if token.pos_ in ["NOUN", "PROPN"]:
                        coords = grounding_map.get(word_lemma) or grounding_map.get(token.text.lower())
                        word_info["coordinates"] = coords if coords else []

                    candidates.append(word_info)

        # 按频率排序，选择最难的词作为核心词
        candidates.sort(key=lambda x: zipf_frequency(x['lemma'], 'en'))
        entry["advanced_vocabulary"] = candidates
        entry["core_word"] = candidates[0]["word"] if candidates else ""
        entry["vocabulary_count"] = len(candidates)

        refined_narrative.append(entry)

    return {"video_narrative": refined_narrative}

def parse_llm_response(response_text):
    """解析 LLM 返回的内容，提取 JSON"""
    try:
        # 尝试去除 markdown 代码块标记
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

def analyze_video_frames_flash(image_paths, max_retries=2):
    """
    使用 GLM-4V-Flash 分析视频帧
    """
    content_list = []

    # Prompt：要求模型输出物体坐标和描述
    prompt_text = """
    ### Role
    Expert English Teacher & Visual Analyst.

    ### Task
    1. Write a natural, descriptive narrative sentence for the image (15-25 words).
    2. Identify ALL physical objects (nouns) mentioned in your sentence and provide their bounding box coordinates in [[ymin, xmin, ymax, xmax]] format (scale 0-1000).

    ### Guidelines
    - Use descriptive, academic English (not slang)
    - Include advanced vocabulary (B2+ level words)
    - Be accurate with object detection
    - Output ONLY valid JSON, no extra text

    ### Output Format (Strict JSON ONLY)
    {
      "video_narrative": [
        {
          "frame_index": 0,
          "timestamp": "00:00",
          "sentence": "A clear, descriptive sentence about the image."
        }
      ],
      "detected_objects": [
        {
          "label": "noun from the sentence",
          "boxes": [[ymin, xmin, ymax, xmax], [ymin, xmin, ymax, xmax]]
        }
      ]
    }
    """
    content_list.append({"type": "text", "text": prompt_text})

    # 添加图片
    for i, path in enumerate(image_paths):
        base64_data = encode_image(path)
        if base64_data:
            content_list.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{base64_data}"}
            })

    # 调用 API，带重试机制
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="glm-4.6v-flash",
                messages=[{"role": "user", "content": content_list}],
                thinking={"type": "enabled"}
            )

            full_response = response.choices[0].message.content

            # 解析响应
            raw_json = parse_llm_response(full_response)
            if raw_json:
                return linguistic_post_process(raw_json)
            else:
                print(f"Attempt {attempt + 1}: Failed to parse JSON")
                if attempt < max_retries - 1:
                    print("Retrying...")
                    continue
                else:
                    return None

        except Exception as e:
            print(f"Error on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                print("Retrying...")
                continue
            else:
                return None

    return None

def save_result(result, output_path="output.json"):
    """保存结果到 JSON 文件"""
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"\n✓ Result saved to {output_path}")
        return True
    except Exception as e:
        print(f"Error saving result: {e}")
        return False

def print_summary(result):
    """打印结果摘要"""
    if not result or "video_narrative" not in result:
        print("\n❌ No valid result")
        return

    narratives = result["video_narrative"]
    print(f"\n{'='*60}")
    print(f"ANALYSIS COMPLETE: {len(narratives)} frame(s) processed")
    print(f"{'='*60}")

    total_vocab = 0
    for entry in narratives:
        frame_idx = entry.get("frame_index", "N/A")
        timestamp = entry.get("timestamp", "N/A")
        sentence = entry.get("sentence", "")
        core_word = entry.get("core_word", "")
        vocab_count = entry.get("vocabulary_count", 0)
        total_vocab += vocab_count

        print(f"\nFrame {frame_idx} [{timestamp}]")
        print(f"Sentence: {sentence}")
        if core_word:
            print(f"Core Word: {core_word}")
        print(f"Advanced Vocabulary: {vocab_count} word(s)")

        # 显示前 3 个高级词汇
        vocab = entry.get("advanced_vocabulary", [])
        for v in vocab[:3]:
            print(f"  - {v['word']} ({v['level']}): Zipf {v['frequency'].split(': ')[1]}")

    print(f"\n{'='*60}")
    print(f"Total Advanced Vocabulary: {total_vocab} word(s)")
    print(f"{'='*60}\n")

def main():
    """主函数"""
    # 检查参数
    if len(sys.argv) > 1:
        image_paths = sys.argv[1:]
    else:
        # 默认使用测试图片
        image_paths = ["testPic.png"]
        if not os.path.exists(image_paths[0]):
            print(f"Error: Test image '{image_paths[0]}' not found!")
            print("Usage: python test.py <image_path1> [image_path2 ...]")
            sys.exit(1)

    print(f"Analyzing {len(image_paths)} frame(s)...")
    print(f"Image(s): {', '.join(image_paths)}")

    # 分析
    result = analyze_video_frames_flash(image_paths)

    if result:
        # 打印摘要
        print_summary(result)

        # 保存结果
        save_result(result)
        print("✓ Success!")
    else:
        print("\n❌ Failed to analyze frames")
        sys.exit(1)

if __name__ == "__main__":
    main()
