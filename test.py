import base64
import json
import os
import spacy
from wordfreq import zipf_frequency
from zai import ZhipuAiClient

# 1. 初始化
client = ZhipuAiClient(api_key="9c6603c2f1ee4a94b900f219f165d976.CYox1I8usvuEqM82")
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def get_word_level(zipf_val):
    if zipf_val < 3.0: return "C1/C2"
    if zipf_val < 4.0: return "B2"
    if zipf_val < 4.5: return "B1/B2"
    return "A1/A2"

def linguistic_post_process(llm_result):
    """
    后处理逻辑：更名频率字段，匹配名词坐标
    """
    if not llm_result or "video_narrative" not in llm_result:
        return llm_result

    # 提取模型识别到的所有物体坐标，建立映射表
    # GLM 格式通常为: {"label": "cup", "boxes": [[ymin, xmin, ymax, xmax]]}
    grounding_map = {
        obj["label"].lower(): obj["boxes"] 
        for obj in llm_result.get("detected_objects", [])
    }

    refined_narrative = []
    for entry in llm_result["video_narrative"]:
        sentence = entry["sentence"]
        doc = nlp(sentence)
        
        candidates = []
        for token in doc:
            if not token.is_stop and not token.is_punct and len(token.text) > 2:
                word_lemma = token.lemma_.lower()
                zipf_val = zipf_frequency(word_lemma, 'en')
                
                # 难度过滤
                if 1.0 < zipf_val < 4.5:
                    word_info = {
                        "word": token.text,
                        "level": get_word_level(zipf_val),
                        "frequency": f"Zipf frequency: {round(zipf_val, 2)}",
                        "pos": token.pos_  # 保存词性
                    }

                    # 如果是名词，尝试匹配坐标
                    if token.pos_ in ["NOUN", "PROPN"]:
                        # 匹配策略：尝试匹配原形或单词本身
                        coords = grounding_map.get(word_lemma) or grounding_map.get(token.text.lower())
                        word_info["coordinates"] = coords if coords else []
                    
                    candidates.append(word_info)
        
        candidates.sort(key=lambda x: zipf_frequency(x['word'], 'en'))
        entry["advanced_vocabulary"] = candidates
        entry["core_word"] = candidates[0]["word"] if candidates else ""
        refined_narrative.append(entry)
        
    return {"video_narrative": refined_narrative}

def analyze_video_frames_flash(image_paths):
    content_list = []
    
    # 修改 Prompt：要求模型输出物体坐标
    prompt_text = """
    ### Role
    Expert English Teacher & Visual Analyst.

    ### Task
    1. Write a descriptive narrative sentence for the image.
    2. Identify ALL physical objects (nouns) mentioned in your sentence and provide their bounding box coordinates in [[ymin, xmin, ymax, xmax]] format (scale 0-1000).

    ### Output Format (Strict JSON ONLY)
    {
      "video_narrative": [
        {
          "frame_index": 0,
          "timestamp": "00:00",
          "sentence": "A description of the image."
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

    for path in image_paths:
        base_4_data = encode_image(path)
        content_list.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{base_4_data}"}
        })

    response = client.chat.completions.create(
        model="glm-4.6v-flash",
        messages=[{"role": "user", "content": content_list}],
        thinking={"type": "enabled"}
    )

    full_response = response.choices[0].message.content

    try:
        json_str = full_response.split("```json")[1].split("```")[0].strip() if "```json" in full_response else full_response.strip()
        raw_json = json.loads(json_str)
        return linguistic_post_process(raw_json)
    except Exception as e:
        print(f"Error: {e}\nRaw: {full_response}")
        return None

if __name__ == "__main__":
    test_frames = ["testPic.png"]
    if os.path.exists(test_frames[0]):
        result = analyze_video_frames_flash(test_frames)
        if result:
            print(json.dumps(result, indent=2, ensure_ascii=False))
