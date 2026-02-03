#!/usr/bin/env python3
"""
简化的视频字幕生成脚本 - VibeEnglish
生成模拟字幕内容供测试
"""

import json
import sys

def generate_timestamp_minutes(seconds):
    """将秒数转换为 HH:MM:SS 格式"""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    return f"{hours:02d}:{minutes:02d}"

def generate_mock_subtitles(frame_count=5, style="casual"):
    """生成模拟字幕内容"""
    
    # 模拟的三种风格
    subtitle_styles = {
        "casual": [
            "A plump white rabbit rests on a grassy lawn.",
            "The rabbit stands up and looks around.",
            "A butterfly lands gently on its head.",
            "The rabbit hops away quickly.",
            "It disappears into the meadow."
        ],
        "beginner": [
            "The cat is black and white.",
            "The rabbit is white and small.",
            "A butterfly is on the rabbit.",
            "The rabbit jumps over the moon.",
            "The rabbit runs away fast."
        ],
        "literary": [
            "The rabbit's movements were as fluid as water, its fur catching morning light.",
            "Butterflies fluttered like dancing flowers, their wings painted with sunset colors.",
            "The meadow stretched endlessly, a tapestry of greens and gold under the vast sky.",
            "Time stood still, captured in the quiet elegance of this peaceful moment.",
            "The rabbit vanished into the verdant embrace of nature's afternoon."
        ]
    }
    
    # 模拟词汇数据
    mock_vocabulary = {
        "casual": [
            {"word": "rabbit", "lemma": "rabbit", "level": "B1/B2", "frequency": "Zipf: 5.5", "pos": "NOUN"},
            {"word": "grass", "lemma": "grass", "level": "B1/B2", "frequency": "Zipf: 4.5", "pos": "NOUN"},
            {"word": "butterfly", "lemma": "butterfly", "level": "B1/B2", "frequency": "Zipf: 6.0", "pos": "NOUN"}
        ],
        "beginner": [
            {"word": "rabbit", "lemma": "rabbit", "level": "A1/A2", "frequency": "Zipf: 7.0", "pos": "NOUN"},
            {"word": "cat", "lemma": "cat", "level": "A1/A2", "frequency": "Zipf: 6.5", "pos": "NOUN"},
            {"word": "stone", "lemma": "stone", "level": "A1/A2", "frequency": "Zipf: 5.0", "pos": "NOUN"}
        ],
        "literary": [
            {"word": "movements", "lemma": "movement", "level": "C1/C2", "frequency": "Zipf: 4.0", "pos": "NOUN"},
            {"word": "tapestry", "lemma": "tapestry", "level": "C1/C2", "frequency": "Zipf: 3.5", "pos": "NOUN"},
            {"word": "elegance", "lemma": "elegance", "level": "C1/C2", "frequency": "Zipf: 3.0", "pos": "NOUN"}
        ]
    }
    
    # 生成字幕数据
    subtitles = []
    
    for i in range(frame_count):
        seconds = i * 2
        timestamp = generate_timestamp_minutes(seconds)
        
        subtitles.append({
            "frame_index": i,
            "timestamp": timestamp,
            "sentence": subtitle_styles[style][i],
            "advanced_vocabulary": mock_vocabulary[style][:3],
            "core_word": "rabbit" if i == 0 else "",
            "vocabulary_count": 3
        })
    
    # 构建结果
    result = {
        "video_narrative": subtitles,
        "mode": "normal",
        "total_frames": frame_count,
        "style": style
    }
    
    return result

def main():
    print("=" * 60)
    print("🎬 VibeEnglish Subtitle Generator (Mock)")
    print("=" * 60)
    print(f"📹 Video: test_video.mp4")
    print(f"📊 Frames: 5")
    print(f"🎨 Style: Casual Spoken")
    print("=" * 60)
    print()
    
    # 生成字幕数据
    result = generate_mock_subtitles()
    
    # 显示生成的字幕
    print("📝 Generated Subtitles:")
    print("=" * 60)
    
    for i, subtitle in enumerate(result["video_narrative"]):
        print(f"\nFrame {i + 1}:")
        print(f"  Timestamp: {subtitle['timestamp']}")
        print(f"  Sentence: {subtitle['sentence']}")
        print(f"  Core Word: {subtitle['core_word'] or 'None'}")
        print(f"  Vocabulary Count: {subtitle['vocabulary_count']}")
        
        if subtitle['advanced_vocabulary']:
            print(f"  Advanced Vocabulary:")
            for vocab in subtitle['advanced_vocabulary']:
                print(f"    - {vocab['word']} ({vocab['level']}, {vocab['frequency']}, {vocab['pos']})")
    
    print("\n" + "=" * 60)
    print("📊 Statistics:")
    print("=" * 60)
    print(f"Total Frames: {result['total_frames']}")
    print(f"Total Advanced Vocabulary: {sum(s['vocabulary_count'] for s in result['video_narrative'])}")
    print(f"Average Vocab per Frame: {sum(s['vocabulary_count'] for s in result['video_narrative']) / result['total_frames']:.1f}")
    
    # 保存到文件
    output_file = "test_subtitles.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Results saved to: {output_file}")
    
    # 生成 SRT 格式
    srt_file = "test_subtitles.srt"
    
    with open(srt_file, 'w', encoding='utf-8') as f:
        for i, subtitle in enumerate(result["video_narrative"]):
            start_time = subtitle['timestamp']
            
            # 计算结束时间（假设每帧 2 秒）
            seconds = i * 2
            minutes = seconds // 60
            secs = seconds % 60 + 2
            
            end_minutes = secs // 60
            end_secs = secs % 60
            end_time = f"{end_minutes:02d}:{end_secs:02d}"
            
            f.write(f"{i + 1}\n")
            f.write(f"{start_time} --> {end_time}\n")
            f.write(f"{subtitle['sentence']}\n\n")
    
    print(f"💾 SRT file saved to: {srt_file}")
    print("=" * 60)
    
    print("\n🎉 Subtitle Generation Complete!")
    print("=" * 60)
    print("✅ JSON file: test_subtitles.json")
    print("✅ SRT file: test_subtitles.srt")
    print("✅ Total frames: 5")
    print("✅ Total vocabulary: 15")
    print("=" * 60)

if __name__ == "__main__":
    main()
