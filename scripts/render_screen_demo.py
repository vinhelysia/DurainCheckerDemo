"""Render an annotated walkthrough from real production screenshots.

Capture screenshots with the browser first. This is an edited walkthrough,
not a continuous screen recording; the caption states that explicitly.
"""

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont, ImageOps

from render_walkthrough_video import ffmpeg_executable


ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "public" / "submission"
OUTPUT = MEDIA / "DurianTrust_UI_Demo_72s.mp4"
W, H, FPS, SECONDS = 1920, 1080, 12, 9
SCENES = [
    ("01-home.png", "Mở hồ sơ lô công khai, không cần kết nối ví.", (31, 590, 201, 641)),
    ("02-lookup.png", "Devnet chậm: app ghi rõ nguồn dữ liệu demo.", (32, 451, 1236, 496)),
    ("03-trace.png", "Đọc timeline và đối chiếu Cadimi theo ngưỡng minh họa.", (762, 238, 1236, 632)),
    ("04-qr.png", "QR mở hồ sơ lô; nhãn nguồn dữ liệu luôn hiển thị.", (778, 130, 1220, 455)),
    ("05-ai-sample.png", "Chọn ảnh lá mẫu để gọi mô hình AI trên máy chủ.", (640, 482, 913, 710)),
    ("06-ai-result.png", "Kết quả thật từ API: gợi ý bệnh cháy lá trên ảnh mẫu.", (282, 396, 1205, 656)),
    ("07-manage.png", "Cổng quản lý hiển thị ví, vai trò và chế độ offline.", (32, 297, 1236, 464)),
    ("08-form.png", "Tự điền form mẫu để thử luồng đăng ký lô.", (67, 177, 1203, 225)),
]


def main():
    font_dir = Path("C:/Windows/Fonts")
    title_font = ImageFont.truetype(str(font_dir / "segoeuib.ttf"), 32)
    note_font = ImageFont.truetype(str(font_dir / "segoeui.ttf"), 22)
    command = [ffmpeg_executable(), "-y", "-hide_banner", "-loglevel", "error",
               "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
               "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
               "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
               "-movflags", "+faststart", str(OUTPUT)]
    previews = []
    with subprocess.Popen(command, stdin=subprocess.PIPE) as process:
        try:
            for index, (filename, caption, target) in enumerate(SCENES):
                screenshot = Image.open(MEDIA / filename).convert("RGB")
                fitted = ImageOps.contain(screenshot, (W, 980), Image.Resampling.LANCZOS)
                sx, sy = fitted.width / screenshot.width, fitted.height / screenshot.height
                left = (W - fitted.width) // 2
                base = Image.new("RGB", (W, H), "#163D2F")
                base.paste(fitted, (left, 0))
                draw = ImageDraw.Draw(base)
                draw.text((55, 992), f"{index + 1:02d}/08  {caption}", font=title_font, fill="white")
                draw.text((55, 1040), "Ảnh chụp app thật · Con trỏ minh họa · 26/09/2026 · Demo học thuật", font=note_font, fill="#B9DACB")
                rect = tuple(round(value * (sx if i % 2 == 0 else sy) + (left if i % 2 == 0 else 0)) for i, value in enumerate(target))
                for frame in range(FPS * SECONDS):
                    image = base.copy()
                    draw = ImageDraw.Draw(image)
                    progress = min(1, frame / (FPS * 2))
                    eased = progress * progress * (3 - 2 * progress)
                    target_x, target_y = rect[0] + 28, rect[1] + 28
                    x = round(1700 + (target_x - 1700) * eased)
                    y = round(910 + (target_y - 910) * eased)
                    if progress == 1:
                        draw.rounded_rectangle(rect, radius=12, outline="#D5A535", width=5)
                    draw.polygon([(x, y), (x + 5, y + 39), (x + 14, y + 29),
                                  (x + 24, y + 48), (x + 33, y + 43),
                                  (x + 22, y + 25), (x + 36, y + 22)],
                                 fill="#163D2F", outline="white", width=2)
                    if frame == FPS * 4:
                        previews.append(ImageOps.contain(image, (480, 270)))
                    process.stdin.write(image.tobytes())
        finally:
            process.stdin.close()
        if process.wait() != 0:
            raise SystemExit("FFmpeg failed")
    sheet = Image.new("RGB", (960, 1080), "white")
    for i, preview in enumerate(previews):
        sheet.paste(preview, ((i % 2) * 480, (i // 2) * 270))
    sheet.save(ROOT / "submission" / "video-contact-sheet.jpg", quality=92)
    print(OUTPUT)


if __name__ == "__main__":
    main()
