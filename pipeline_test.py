"""
端到端流程测试：视频 → 抽帧 → AI 分析 → 生成文稿
"""

import os
import sys
import json
from video_extractor import VideoFrameExtractor
from test import analyze_video_frames_flash, save_result, print_summary


def run_pipeline(video_path, output_dir="test_output", extract_method="fixed", max_frames=5):
    """
    运行完整的视频分析流程

    Args:
        video_path: 视频文件路径
        output_dir: 输出目录
        extract_method: 抽帧方法 ("fixed" | "interval" | "key")
        max_frames: 最大抽取帧数
    """
    print("🚀 启动视频分析流程")
    print("=" * 60)

    # 步骤 1: 抽帧
    print("\n📸 步骤 1: 视频抽帧")
    print("-" * 60)

    if not os.path.exists(video_path):
        print(f"❌ 视频文件不存在: {video_path}")
        return None

    extractor = VideoFrameExtractor(video_path, output_dir=os.path.join(output_dir, "frames"))

    try:
        if extract_method == "fixed":
            frame_paths = extractor.extract_fixed_frames(num_frames=max_frames)
        elif extract_method == "interval":
            frame_paths = extractor.extract_frames_by_interval(interval_seconds=1.0, max_frames=max_frames)
        elif extract_method == "key":
            frame_paths = extractor.extract_key_frames(threshold=30.0, max_frames=max_frames)
        else:
            raise ValueError(f"未知的抽帧方法: {extract_method}")
    except Exception as e:
        print(f"❌ 抽帧失败: {e}")
        extractor.release()
        return None
    finally:
        extractor.release()

    if not frame_paths:
        print("❌ 没有提取到任何帧")
        return None

    print(f"\n✓ 成功提取 {len(frame_paths)} 帧")

    # 步骤 2: AI 分析
    print("\n🤖 步骤 2: AI 视觉分析")
    print("-" * 60)
    print(f"分析 {len(frame_paths)} 帧...")

    result = analyze_video_frames_flash(frame_paths)

    if not result:
        print("❌ AI 分析失败")
        return None

    # 步骤 3: 生成报告
    print("\n📊 步骤 3: 生成分析报告")
    print("-" * 60)

    print_summary(result)

    # 保存结果
    output_path = os.path.join(output_dir, "analysis_result.json")
    save_result(result, output_path)

    print("=" * 60)
    print("✅ 流程完成！")
    print(f"输出目录: {output_dir}")
    print("=" * 60)

    return result


def test_with_sample_images():
    """
    使用测试图片进行模拟测试（替代真实视频）
    """
    print("🧪 使用测试图片进行模拟测试")
    print("=" * 60)

    # 使用 testPic.png 多次模拟视频帧
    test_image = "testPic.png"
    if not os.path.exists(test_image):
        print(f"❌ 测试图片不存在: {test_image}")
        return None

    # 创建临时帧目录
    output_dir = "test_output/simulated_video"
    os.makedirs(output_dir, exist_ok=True)

    # 复制测试图片作为多个"帧"
    frame_paths = []
    for i in range(3):
        frame_path = os.path.join(output_dir, f"frame_{i:02d}.jpg")
        import shutil
        shutil.copy(test_image, frame_path)
        frame_paths.append(frame_path)
        print(f"✓ 模拟帧 {i}: {frame_path}")

    print(f"\n✓ 创建了 {len(frame_paths)} 个模拟帧")

    # AI 分析
    print("\n🤖 AI 视觉分析")
    print("-" * 60)

    result = analyze_video_frames_flash(frame_paths)

    if not result:
        print("❌ AI 分析失败")
        return None

    # 生成报告
    print_summary(result)
    save_result(result, "test_output/simulated_video/result.json")

    return result


def main():
    """
    主函数
    """
    print("\n" + "=" * 60)
    print("VibeEnglish 端到端流程测试")
    print("=" * 60 + "\n")

    # 检查命令行参数
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
        run_pipeline(video_path, max_frames=5)
    else:
        # 没有视频文件，使用模拟测试
        print("⚠️  未提供视频文件，使用模拟测试")
        print("   用法: python pipeline_test.py <video_path>")
        print()
        test_with_sample_images()


if __name__ == "__main__":
    main()
