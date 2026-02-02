"""
视频抽帧模块
使用 OpenCV 从视频中提取关键帧
"""

import cv2
import os
import numpy as np


class VideoFrameExtractor:
    def __init__(self, video_path, output_dir="extracted_frames"):
        """
        初始化视频抽帧器

        Args:
            video_path: 视频文件路径
            output_dir: 输出帧的目录
        """
        self.video_path = video_path
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

        # 打开视频
        self.cap = cv2.VideoCapture(video_path)
        if not self.cap.isOpened():
            raise ValueError(f"无法打开视频文件: {video_path}")

        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        self.frame_count = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.duration = self.frame_count / self.fps

    def extract_frames_by_interval(self, interval_seconds=1.0, max_frames=20):
        """
        按固定时间间隔提取帧

        Args:
            interval_seconds: 抽帧间隔（秒）
            max_frames: 最大抽取帧数

        Returns:
            提取的帧文件路径列表
        """
        frames = []
        interval_frames = int(self.fps * interval_seconds)
        frame_idx = 0

        print(f"📹 视频信息: {self.duration:.2f}秒, {self.frame_count}帧, {self.fps:.2f}fps")
        print(f"⏱️  抽帧间隔: {interval_seconds}秒 ({interval_frames}帧)")

        while frame_idx < self.frame_count and len(frames) < max_frames:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)

            ret, frame = self.cap.read()
            if not ret:
                break

            # 保存帧
            frame_path = os.path.join(
                self.output_dir,
                f"frame_{frame_idx:06d}.jpg"
            )
            cv2.imwrite(frame_path, frame)
            frames.append(frame_path)

            timestamp = frame_idx / self.fps
            print(f"✓ 帧 {frame_idx} ({timestamp:.2f}s): {frame_path}")

            frame_idx += interval_frames

        return frames

    def extract_key_frames(self, threshold=30.0, max_frames=20):
        """
        基于场景变化提取关键帧

        Args:
            threshold: 场景变化阈值（越大越不敏感）
            max_frames: 最大抽取帧数

        Returns:
            提取的帧文件路径列表
        """
        frames = []
        prev_frame = None

        print(f"📹 视频信息: {self.duration:.2f}秒, {self.frame_count}帧, {self.fps:.2f}fps")
        print(f"🎯 场景变化阈值: {threshold}")

        frame_idx = 0
        while frame_idx < self.frame_count and len(frames) < max_frames:
            ret, frame = self.cap.read()
            if not ret:
                break

            # 计算与前一帧的差异
            if prev_frame is not None:
                diff = cv2.absdiff(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY),
                                   cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY))
                diff_score = np.mean(diff)

                # 如果差异超过阈值，保存为关键帧
                if diff_score > threshold:
                    frame_path = os.path.join(
                        self.output_dir,
                        f"keyframe_{frame_idx:06d}.jpg"
                    )
                    cv2.imwrite(frame_path, frame)
                    frames.append(frame_path)

                    timestamp = frame_idx / self.fps
                    print(f"✓ 关键帧 {frame_idx} ({timestamp:.2f}s): 变化度 {diff_score:.2f}")

            prev_frame = frame
            frame_idx += max(1, int(self.fps * 0.5))  # 每 0.5 秒检查一次

        return frames

    def extract_fixed_frames(self, num_frames=10):
        """
        均匀抽取固定数量的帧

        Args:
            num_frames: 抽取帧数

        Returns:
            提取的帧文件路径列表
        """
        frames = []
        if self.frame_count < num_frames:
            step = 1
        else:
            step = self.frame_count // num_frames

        print(f"📹 视频信息: {self.duration:.2f}秒, {self.frame_count}帧, {self.fps:.2f}fps")
        print(f"🎲 均匀抽取 {num_frames} 帧 (每 {step} 帧抽取一次)")

        for i in range(num_frames):
            frame_idx = i * step
            if frame_idx >= self.frame_count:
                break

            self.cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)

            ret, frame = self.cap.read()
            if not ret:
                break

            # 保存帧
            frame_path = os.path.join(
                self.output_dir,
                f"frame_{i:02d}.jpg"
            )
            cv2.imwrite(frame_path, frame)
            frames.append(frame_path)

            timestamp = frame_idx / self.fps
            print(f"✓ 帧 {i} ({timestamp:.2f}s): {frame_path}")

        return frames

    def release(self):
        """释放资源"""
        if self.cap.isOpened():
            self.cap.release()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()


def main():
    """测试函数"""
    # 示例：使用测试图片模拟视频帧
    print("🎬 视频抽帧模块")
    print("=" * 60)
    print("使用方法:")
    print("  extractor = VideoFrameExtractor('video.mp4')")
    print("  frames = extractor.extract_fixed_frames(5)")
    print("  extractor.release()")
    print("=" * 60)

    # 检查 OpenCV
    print(f"\n✓ OpenCV 版本: {cv2.__version__}")


if __name__ == "__main__":
    main()
