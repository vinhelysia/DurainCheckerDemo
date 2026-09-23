"""Render a captioned product introduction. This is not a screen recording."""

from pathlib import Path
import shutil
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "submission" / "DurianTrust_Intro_73s.mp4"
LOGO = ROOT / "public" / "durian.png"
WIDTH, HEIGHT = 1280, 720
INK = "#173D2F"
MUTED = "#52685D"
GREEN = "#0C7956"
GOLD = "#CF9B3C"
PAPER = "#F5F7F2"
WHITE = "#FFFFFF"


def font(size, bold=False):
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size)


def text(draw, xy, value, size=28, color=INK, bold=False):
    draw.text(xy, value, font=font(size, bold), fill=color)


def card(draw, box, fill=WHITE, outline="#D5E2D8", radius=24):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=2)


def base(number, title, subtitle):
    canvas = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, WIDTH, 11), fill=GREEN)
    logo = Image.open(LOGO).convert("RGB").resize((55, 55), Image.Resampling.LANCZOS)
    canvas.paste(logo, (68, 30))
    text(draw, (137, 37), "DurianTrust", 29, INK, True)
    text(draw, (844, 45), "VIDEO GIỚI THIỆU · HÌNH DỰNG", 17, MUTED, True)
    text(draw, (68, 113), title, 52, INK, True)
    text(draw, (70, 184), subtitle, 23, MUTED)
    draw.line((70, 665, 1210, 665), fill="#D0DED3", width=2)
    text(draw, (70, 679), "Prototype học thuật · Solana Devnet", 17, MUTED)
    text(draw, (1136, 679), f"{number:02d} / 06", 17, MUTED, True)
    return canvas, draw


def scene_one():
    canvas, draw = base(1, "Một lô sầu riêng. Một hồ sơ số.", "Liên kết thông tin lô, số đo và chuỗi bàn giao để dễ đối chiếu.")
    for x, number, heading, detail in [
        (70, "01", "Ghi nhận", "Lô và hành trình"),
        (457, "02", "Đối chiếu", "Số đo đã nhập"),
        (844, "03", "Bàn giao", "Hai bên cùng ký"),
    ]:
        card(draw, (x, 283, x + 365, 575))
        text(draw, (x + 30, 315), number, 52, GREEN, True)
        text(draw, (x + 30, 417), heading, 33, INK, True)
        text(draw, (x + 30, 479), detail, 23, MUTED)
    return canvas


def scene_two():
    canvas, draw = base(2, "Mở hồ sơ bằng QR", "Giám khảo thử ngay trên production, không cần kết nối ví.")
    card(draw, (70, 274, 690, 594))
    text(draw, (103, 302), "LÔ DEMO TRÊN DEVNET", 20, GREEN, True)
    text(draw, (103, 356), "DRN-2026-LD-0429", 39, INK, True)
    text(draw, (103, 434), "Nông trại Tân Phú · Lâm Đồng", 24, MUTED)
    text(draw, (103, 488), "Thu hoạch: 28/04/2026", 24, MUTED)
    card(draw, (729, 274, 1210, 594), fill="#E7F2EA")
    for y, label in [(317, "QR"), (409, "Hồ sơ lô"), (501, "Solana Explorer")]:
        text(draw, (769, y), label, 30, INK, True)
    draw.line((875, 357, 875, 401), fill=GREEN, width=5)
    draw.line((875, 449, 875, 493), fill=GREEN, width=5)
    return canvas


def scene_three():
    canvas, draw = base(3, "Nhật ký lô đọc từ Devnet", "Mỗi mốc được liên kết với hồ sơ lô; trạng thái chờ được hiển thị rõ.")
    draw.line((149, 367, 1130, 367), fill="#B4D2BE", width=8)
    for x, heading, detail, active in [
        (148, "Thu hoạch", "28/04", True),
        (475, "Kiểm nghiệm", "30/04", True),
        (802, "Đóng gói", "02/05", True),
        (1129, "Xuất khẩu", "Đang chờ", False),
    ]:
        color = GREEN if active else GOLD
        draw.ellipse((x - 25, 342, x + 25, 392), fill=color)
        text(draw, (x - 100, 431), heading, 27, INK, True)
        text(draw, (x - 100, 484), detail, 23, MUTED)
    card(draw, (291, 548, 987, 611), fill="#E7F2EA")
    text(draw, (351, 566), "Trực tiếp trên Solana Devnet", 25, GREEN, True)
    return canvas


def scene_four():
    canvas, draw = base(4, "Bàn giao cần hai chữ ký", "Người nhận phải chấp nhận trước khi holder trên chain thay đổi.")
    for x, step, heading, detail in [
        (70, "1", "Người giữ đề xuất", "Nominated recipient"),
        (457, "2", "Người nhận ký", "Accept custody"),
        (844, "3", "Chain cập nhật", "Custody record"),
    ]:
        card(draw, (x, 291, x + 365, 562))
        draw.ellipse((x + 27, 318, x + 91, 382), fill=GREEN)
        text(draw, (x + 47, 328), step, 31, WHITE, True)
        text(draw, (x + 27, 418), heading, 26, INK, True)
        text(draw, (x + 27, 474), detail, 21, MUTED)
    text(draw, (122, 594), "Custody số không xác lập quyền sở hữu pháp lý hoặc giao hàng vật lý.", 21, MUTED)
    return canvas


def scene_five():
    canvas, draw = base(5, "Quy tắc rõ ràng, AI minh họa", "Kết quả demo được trình bày cùng giới hạn của nguồn dữ liệu.")
    card(draw, (70, 277, 625, 591))
    text(draw, (103, 310), "ĐỐI CHIẾU CADIMI", 21, GREEN, True)
    text(draw, (103, 367), "0.0300 ppm", 45, INK, True)
    text(draw, (103, 432), "< 0.0500 ppm", 31, GOLD, True)
    text(draw, (103, 506), "Ngưỡng minh họa · số đo đã nhập", 21, MUTED)
    card(draw, (655, 277, 1210, 591))
    text(draw, (689, 310), "AI ẢNH LÁ", 21, GREEN, True)
    text(draw, (689, 374), "Chọn ảnh mẫu", 35, INK, True)
    text(draw, (689, 439), "Nhận gợi ý phân loại", 26, MUTED)
    text(draw, (689, 506), "Chưa xác thực hiệu năng ngoài thực tế", 20, MUTED)
    return canvas


def scene_six():
    canvas, draw = base(6, "Trải nghiệm bản demo", "Hồ sơ công khai, mã nguồn và pitch deck đã sẵn sàng.")
    card(draw, (70, 275, 1210, 589), fill="#E7F2EA")
    text(draw, (109, 305), "LIVE DEMO", 21, GREEN, True)
    text(draw, (109, 343), "durian-web3.vercel.app/#/unit/demo", 31, INK, True)
    text(draw, (109, 412), "PUBLIC REPO", 21, GREEN, True)
    text(draw, (109, 450), "github.com/vinhelysia/DurainCheckerDemo", 29, INK, True)
    text(draw, (109, 541), "QR xác thực liên kết hồ sơ, không xác thực trái thật hay chứng thư lab.", 20, MUTED)
    return canvas


def main():
    try:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("Install imageio-ffmpeg or put ffmpeg on PATH.")

    scenes = [scene_one, scene_two, scene_three, scene_four, scene_five, scene_six]
    with tempfile.TemporaryDirectory(prefix="duriantrust-video-") as temp_dir:
        frames = []
        for index, render in enumerate(scenes):
            frame = Path(temp_dir) / f"scene-{index}.png"
            render().save(frame)
            frames.append(frame)

        command = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error"]
        for frame in frames:
            command += ["-loop", "1", "-t", "13", "-i", str(frame)]
        filters = [f"[{i}:v]fps=24,format=yuv420p,setsar=1[v{i}]" for i in range(len(frames))]
        previous = "v0"
        for i in range(1, len(frames)):
            result = f"x{i}"
            filters.append(f"[{previous}][v{i}]xfade=transition=fade:duration=1:offset={i * 12}[{result}]")
            previous = result
        command += [
            "-filter_complex", ";".join(filters), "-map", f"[{previous}]",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUTPUT),
        ]
        subprocess.run(command, check=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
