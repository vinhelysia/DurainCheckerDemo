"""Render a guided UI simulation. It is explicitly not a screen recording."""

from pathlib import Path
import math
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "DurianTrust_Guided_Walkthrough_72s.mp4"
W, H, FPS, SECONDS = 1280, 720, 8, 9
GREEN, INK, MUTED, GOLD = "#0C7956", "#173D2F", "#52685D", "#CF9B3C"
PAPER, WHITE, PALE = "#F5F8F6", "#FFFFFF", "#E8F4EF"


def font(size, bold=False):
    face = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / face), size)


def label(draw, xy, value, size=24, color=INK, bold=False):
    draw.text(xy, value, font=font(size, bold), fill=color)


def box(draw, xy, fill=WHITE, outline="#D8E4DE", radius=15, width=2):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def shell(step, caption):
    image = Image.new("RGB", (W, H), PAPER)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, W, 67), fill=WHITE)
    draw.line((0, 67, W, 67), fill="#D8E4DE", width=2)
    logo = Image.open(ROOT / "public" / "durian.png").convert("RGBA")
    logo = logo.resize((42, 42), Image.Resampling.LANCZOS)
    image.paste(logo, (55, 12), logo)
    label(draw, (109, 16), "DurianTrust", 25, INK, True)
    box(draw, (359, 11, 931, 55), fill="#F0F4F1", outline="#E5EAE6", radius=22)
    label(draw, (383, 22), "durian-web3.vercel.app/#/unit/demo", 17, MUTED)
    label(draw, (961, 21), "VI", 18, GREEN, True)
    draw.rectangle((0, 590, W, H), fill=INK)
    label(draw, (56, 609), f"{step + 1:02d} / 08", 19, "#B4DEC9", True)
    label(draw, (56, 644), caption, 28, WHITE, True)
    label(draw, (821, 609), "MÔ PHỎNG THAO TÁC · HÌNH DỰNG", 18, "#B4DEC9", True)
    label(draw, (821, 676), "Prototype học thuật · Solana Devnet", 16, "#B4DEC9")
    return image, draw


def heading(draw, title, subtitle=""):
    label(draw, (61, 103), title, 36, INK, True)
    if subtitle:
        label(draw, (63, 154), subtitle, 19, MUTED)


def scene_open():
    image, draw = shell(0, "Mở demo: không cần ví để xem hồ sơ lô.")
    heading(draw, "Thử tra một lô", "Tra cứu thông tin lô từ giao diện công khai")
    banner = Image.open(ROOT / "public" / "images" / "hero-durian.jpg").convert("RGB")
    banner = banner.resize((1120, 277), Image.Resampling.LANCZOS)
    image.paste(banner, (80, 198))
    box(draw, (80, 491, 448, 550), fill=GREEN, outline=GREEN)
    label(draw, (110, 504), "Xem lô demo", 26, WHITE, True)
    return image, (80, 491, 448, 550), (220, 526)


def scene_batch():
    image, draw = shell(1, "Chọn lô DRN-2026-LD-0429 để xem dữ liệu mẫu.")
    heading(draw, "Chọn lô hàng", "Các lô hiện có trên trang tra cứu")
    for x, name, code in [
        (65, "Chưa có kết quả", "DRN-2026-TG-9721"),
        (354, "Chưa có kết quả", "E2E-MTU8W1CX"),
        (643, "Chưa có kết quả", "DRN-2026-TG-8457"),
        (932, "Dưới ngưỡng demo", "DRN-2026-LD-0429"),
    ]:
        box(draw, (x, 228, x + 273, 332), fill=PALE if x == 932 else WHITE)
        label(draw, (x + 16, 246), name, 21, GREEN if x == 932 else INK, True)
        label(draw, (x + 16, 283), code, 17, MUTED)
    label(draw, (66, 393), "Mã lô hàng", 19, INK, True)
    box(draw, (66, 427, 1198, 492))
    label(draw, (89, 443), "DRN-2026-LD-0429", 23, INK, True)
    return image, (932, 228, 1205, 332), (1062, 280)


def scene_devnet():
    image, draw = shell(2, "Kiểm tra nhãn nguồn dữ liệu: trực tiếp trên Solana Devnet.")
    heading(draw, "Nguồn dữ liệu & tóm tắt lô", "Người xem biết bản ghi đến từ đâu")
    box(draw, (68, 208, 1210, 274), fill=PALE, outline="#B4D7C5")
    label(draw, (88, 226), "●  Trực tiếp trên Solana Devnet", 24, GREEN, True)
    label(draw, (865, 231), "Xem trên Solana Explorer >", 18, GREEN, True)
    for x, name, value in [
        (68, "Nông trại", "Tân Phú"), (358, "Tỉnh", "Lâm Đồng"),
        (648, "Thu hoạch", "28/04/2026"), (938, "Trạng thái", "Dưới ngưỡng"),
    ]:
        box(draw, (x, 312, x + 272, 464))
        label(draw, (x + 20, 340), name, 18, MUTED)
        label(draw, (x + 20, 389), value, 25, INK, True)
    return image, (68, 208, 1210, 274), (422, 241)


def scene_timeline():
    image, draw = shell(3, "Đọc timeline: ba mốc đã ghi, xuất khẩu đang chờ.")
    heading(draw, "Nhật ký truy xuất lô hàng", "ĐỌC TỪ SOLANA DEVNET")
    box(draw, (66, 208, 1212, 512))
    draw.line((166, 296, 1095, 296), fill="#CFDCD3", width=7)
    for x, title, detail, status, done in [
        (165, "Thu hoạch", "28/04/2026", "Đã ghi sổ", True),
        (475, "Kiểm nghiệm", "30/04/2026", "Đã ghi sổ", True),
        (785, "Đóng gói", "02/05/2026", "Đã ghi sổ", True),
        (1095, "Xuất khẩu", "05/05/2026", "Đang chờ", False),
    ]:
        draw.ellipse((x - 22, 274, x + 22, 318), fill=GREEN if done else GOLD)
        label(draw, (x - 80, 344), title, 21, INK, True)
        label(draw, (x - 80, 385), detail, 18, MUTED)
        label(draw, (x - 80, 425), status, 17, GREEN if done else GOLD, True)
    return image, (968, 264, 1192, 469), (1095, 296)


def scene_custody():
    image, draw = shell(4, "Bàn giao vẫn chờ: người nhận phải tự ký chấp nhận.")
    heading(draw, "Chuỗi bàn giao lô hàng", "Hai chữ ký cho một lần đổi holder")
    box(draw, (65, 211, 1213, 527))
    for x, title, detail, state in [
        (93, "Nhà đóng gói", "Bảo Lộc", "Đã ghi sổ"),
        (456, "Nhà xuất khẩu", "Cảng Cát Lái", "Đã ghi sổ"),
        (820, "Chờ bên nhận", "Chưa đổi holder", "Chờ ký"),
    ]:
        box(draw, (x, 259, x + 342, 444), fill=PALE if x == 820 else WHITE)
        label(draw, (x + 21, 281), title, 22, INK, True)
        label(draw, (x + 21, 333), detail, 20, MUTED)
        label(draw, (x + 21, 386), state, 18, GOLD if x == 820 else GREEN, True)
    label(draw, (91, 467), "Holder hiện tại: 3FCW…6kaf", 21, INK, True)
    return image, (820, 259, 1162, 444), (990, 403)


def scene_cadmium():
    image, draw = shell(5, "Đối chiếu số Cadimi đã nhập với ngưỡng minh họa.")
    heading(draw, "Đối chiếu Cadimi từ giá trị đã nhập", "Không thay kết quả kiểm nghiệm hoặc quyết định pháp lý")
    box(draw, (65, 208, 1213, 523))
    box(draw, (88, 235, 1188, 335), fill=PALE, outline="#C9DED3")
    label(draw, (113, 254), "Dưới ngưỡng đối chiếu", 27, GREEN, True)
    label(draw, (113, 299), "Cadimi dưới ngưỡng demo (< 0.05 ppm)", 19, MUTED)
    for x, name, value in [
        (89, "Cadimi", "0.0300 ppm"),
        (461, "Ngưỡng minh họa", "0.0500 ppm"),
        (833, "Vàng O", "Chưa có dữ liệu"),
    ]:
        box(draw, (x, 364, x + 353, 487))
        label(draw, (x + 18, 384), name, 18, MUTED)
        label(draw, (x + 18, 426), value, 24, INK, True)
    return image, (89, 364, 442, 487), (267, 438)


def scene_qr():
    image, draw = shell(6, "Mở QR hoặc Explorer để kiểm tra link hồ sơ và giao dịch.")
    heading(draw, "Nhãn QR & bằng chứng giao dịch", "Mã QR dẫn đến hồ sơ lô công khai")
    box(draw, (68, 204, 530, 527))
    label(draw, (98, 229), "QR hồ sơ lô", 24, INK, True)
    qr = Image.open(ROOT / "public" / "images" / "demo-batch-qr.png").convert("RGB")
    image.paste(qr.resize((210, 210), Image.Resampling.NEAREST), (192, 278))
    box(draw, (558, 204, 1212, 527))
    label(draw, (588, 234), "Mã lô", 18, MUTED)
    label(draw, (588, 270), "DRN-2026-LD-0429", 29, INK, True)
    box(draw, (588, 337, 1165, 396), fill=PALE)
    label(draw, (608, 350), "Xem hồ sơ lô >", 24, GREEN, True)
    box(draw, (588, 416, 1165, 475), fill=PALE)
    label(draw, (608, 429), "Xem giao dịch Solana >", 23, GREEN, True)
    return image, (588, 416, 1165, 475), (884, 445)


def scene_leaf():
    image, draw = shell(7, "Chọn ảnh lá mẫu; AI trả gợi ý, cần xác minh thực tế.")
    heading(draw, "Nhìn nhanh bệnh trên lá", "Mô hình ảnh chỉ phục vụ demo, không phát hiện Cadimi")
    box(draw, (68, 207, 548, 530))
    leaf = Image.open(ROOT / "public" / "samples" / "leaf_blight.jpg").convert("RGB")
    leaf.thumbnail((420, 228), Image.Resampling.LANCZOS)
    image.paste(leaf, (96, 235))
    label(draw, (97, 480), "Ảnh mẫu: bệnh cháy lá", 21, INK, True)
    box(draw, (578, 207, 1212, 530), fill=PALE)
    label(draw, (608, 241), "KẾT QUẢ GỢI Ý · AI", 19, GREEN, True)
    label(draw, (608, 291), "Bệnh cháy lá", 34, INK, True)
    label(draw, (608, 368), "Gợi ý chăm sóc chỉ để tham khảo.", 21, MUTED)
    label(draw, (608, 415), "Xác minh với kỹ thuật viên địa phương.", 20, MUTED)
    return image, (68, 207, 548, 530), (303, 387)


def overlay(base, target, cursor, frame):
    image = base.copy()
    draw = ImageDraw.Draw(image)
    progress = min(1.0, frame / (FPS * 3))
    eased = progress * progress * (3 - 2 * progress)
    start = (1119, 552)
    cx = round(start[0] + (cursor[0] - start[0]) * eased)
    cy = round(start[1] + (cursor[1] - start[1]) * eased)
    if progress > 0.42:
        glow = 4 + round(2 * math.sin(frame / 5))
        draw.rounded_rectangle(target, radius=15, outline=GOLD, width=glow)
        draw.line((min(target[2] + 32, 1220), max(target[1] - 35, 81), cx, cy), fill=GOLD, width=4)
    # Large cursor and click ring keep the action readable on a small player.
    draw.polygon([(cx, cy), (cx + 4, cy + 36), (cx + 12, cy + 28),
                  (cx + 21, cy + 45), (cx + 29, cy + 40), (cx + 19, cy + 23),
                  (cx + 31, cy + 20)], fill=INK, outline=WHITE)
    if frame > FPS * 5:
        radius = 11 + (frame % 12) * 2
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=GOLD, width=3)
    return image


def ffmpeg_executable():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        path = shutil.which("ffmpeg")
        if path:
            return path
        raise SystemExit("Install imageio-ffmpeg or put ffmpeg on PATH.")


def main():
    scenes = [scene_open, scene_batch, scene_devnet, scene_timeline,
              scene_custody, scene_cadmium, scene_qr, scene_leaf]
    command = [ffmpeg_executable(), "-y", "-hide_banner", "-loglevel", "error",
               "-f", "rawvideo", "-vcodec", "rawvideo", "-pix_fmt", "rgb24",
               "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
               "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUTPUT)]
    with subprocess.Popen(command, stdin=subprocess.PIPE) as process:
        try:
            for render in scenes:
                base, target, cursor = render()
                for frame in range(FPS * SECONDS):
                    process.stdin.write(overlay(base, target, cursor, frame).tobytes())
        finally:
            process.stdin.close()
        if process.wait() != 0:
            raise SystemExit("ffmpeg failed to render the video")
    print(OUTPUT)


if __name__ == "__main__":
    main()
