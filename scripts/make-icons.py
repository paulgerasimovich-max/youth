"""Рисует иконку приложения («крест на рассвете») во всех нужных размерах.
Запуск из корня проекта:  python3 scripts/make-icons.py   (нужен Pillow)

Рисунок задан на сетке 120x120, как в утверждённом наброске:
сливовый фон, оранжевое солнце встаёт снизу, жёлтый крест со скруглёнными концами.
"""
from PIL import Image, ImageDraw

PLUM, ORANGE, YELLOW = (0x3B, 0x25, 0x60), (0xFF, 0x5A, 0x36), (0xFF, 0xC9, 0x4A)
SS = 4  # рисуем вчетверо крупнее и уменьшаем — края получаются гладкими


def draw_mark(d, scale, ox, oy, cross, sun=None):
    """Крест (и солнце, если задан цвет) на сетке 120x120, растянутой в scale раз со сдвигом ox, oy."""
    p = lambda v: v * scale
    if sun:
        d.ellipse([ox + p(60 - 44), oy + p(112 - 44), ox + p(60 + 44), oy + p(112 + 44)], fill=sun)
    d.rounded_rectangle([ox + p(52), oy + p(20), ox + p(68), oy + p(92)], radius=p(8), fill=cross)
    d.rounded_rectangle([ox + p(34), oy + p(38), ox + p(86), oy + p(54)], radius=p(8), fill=cross)


def canvas(size, color):
    return Image.new('RGBA', (size * SS, size * SS), color)


def finish(img, size, path, opaque=False):
    out = img.resize((size, size), Image.LANCZOS)
    if opaque:
        out = out.convert('RGB')
    out.save(path)
    print('wrote', path, out.size)


def full_icon(size, rounded=False):
    """Квадратная иконка целиком. rounded — со скруглёнными углами на прозрачном фоне (для сайта и экрана загрузки)."""
    s = size * SS
    img = canvas(size, PLUM + (255,))
    d = ImageDraw.Draw(img)
    draw_mark(d, s / 120, 0, 0, YELLOW, ORANGE)
    if rounded:
        mask = Image.new('L', (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=s * 27 / 120, fill=255)
        clear = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        img = Image.composite(img, clear, mask)
    return img


# iPhone и общая иконка: квадрат без прозрачности, углы скругляет сам телефон
finish(full_icon(1024), 1024, 'assets/icon.png', opaque=True)

# Android («адаптивная» иконка): телефон сам обрезает её кругом или скруглённым квадратом и видна только
# середина — примерно две трети. Поэтому рисунок ужат в середину, а фон залит до краёв.
A = 1024
inner = A * 2 / 3
off = (A - inner) / 2
bg = canvas(A, PLUM + (255,))
draw_bg = ImageDraw.Draw(bg)
sc = inner * SS / 120
draw_bg.ellipse([off * SS + sc * (60 - 44), off * SS + sc * (112 - 44), off * SS + sc * (60 + 44), off * SS + sc * (112 + 44)], fill=ORANGE)
finish(bg, A, 'assets/android-icon-background.png', opaque=True)

fg = canvas(A, (0, 0, 0, 0))
draw_mark(ImageDraw.Draw(fg), sc, off * SS, off * SS, YELLOW)
finish(fg, A, 'assets/android-icon-foreground.png')

mono = canvas(A, (0, 0, 0, 0))
draw_mark(ImageDraw.Draw(mono), sc, off * SS, off * SS, (255, 255, 255))
finish(mono, A, 'assets/android-icon-monochrome.png')

# Экран загрузки, логотип внутри приложения и сайт: иконка со скруглёнными углами
finish(full_icon(1024, rounded=True), 1024, 'assets/splash-icon.png')
finish(full_icon(256, rounded=True), 256, 'assets/logo.png')
finish(full_icon(196, rounded=True), 196, 'assets/favicon.png')
finish(full_icon(196, rounded=True), 196, 'site/favicon.png')
finish(full_icon(512, rounded=True), 512, 'site/icon.png')
