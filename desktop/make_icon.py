# -*- coding: utf-8 -*-
"""生成 10Router 桌面版图标:icon.png(512,electron-builder mac 用)+ icon.ico(win 多尺寸)。

品牌与 cli/src/cli/tray/icon.png 一致:橙色圆角方块 + 白色粗体 "10"。
用法:python make_icon.py  (需要 Pillow)
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

HERE = Path(__file__).parent
MASTER = 1024
ORANGE_TOP = (240, 138, 46)    # #F08A2E
ORANGE_BOTTOM = (226, 98, 14)  # #E2620E
RADIUS = int(MASTER * 0.24)    # 与托盘小图标一致的圆角比例


def _font(size: int) -> ImageFont.FreeTypeFont:
    for name in ("segoeuib.ttf", "arialbd.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)
        except OSError:
            continue
    return ImageFont.load_default()


def build_master() -> Image.Image:
    img = Image.new("RGBA", (MASTER, MASTER), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # 垂直渐变:逐行画圆角矩形裁出的横线
    overlay = Image.new("RGBA", (MASTER, MASTER), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    for y in range(MASTER):
        t = y / (MASTER - 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(ORANGE_TOP, ORANGE_BOTTOM)) + (255,)
        odraw.line([(0, y), (MASTER, y)], fill=color)
    mask = Image.new("L", (MASTER, MASTER), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, MASTER - 1, MASTER - 1], radius=RADIUS, fill=255)
    img.paste(overlay, (0, 0), mask)

    text = "10"
    font = _font(int(MASTER * 0.52))
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    tw, th = right - left, bottom - top
    x = (MASTER - tw) / 2 - left
    y = (MASTER - th) / 2 - top
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))
    return img


def main() -> None:
    master = build_master()
    png512 = master.resize((512, 512), Image.LANCZOS)
    png512.save(HERE / "icon.png")
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    master.resize((256, 256), Image.LANCZOS).save(HERE / "icon.ico", sizes=ico_sizes)
    print(f"written: {HERE / 'icon.png'} + icon.ico {ico_sizes}")


if __name__ == "__main__":
    main()
