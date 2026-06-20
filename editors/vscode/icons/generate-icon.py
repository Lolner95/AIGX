#!/usr/bin/env python3
"""Generate the AIGX VS Code Marketplace icon (aigx-marketplace.png).

Brand: a rounded square with the AIGX gradient (green -> blue -> purple -> amber) and a single bold
white "A" — the same mark as icons/aigx.svg, rasterized for the Marketplace (which requires PNG).

Run:  python editors/vscode/icons/generate-icon.py   (requires Pillow)
"""
import os
from PIL import Image, ImageDraw

S = 256
STOPS = [(34, 197, 94), (59, 130, 246), (139, 92, 246), (245, 158, 11)]
WHITE = (255, 255, 255, 255)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def grad(t):
    t = max(0.0, min(1.0, t))
    seg = min(len(STOPS) - 2, int(t * (len(STOPS) - 1)))
    return lerp(STOPS[seg], STOPS[seg + 1], t * (len(STOPS) - 1) - seg)


# diagonal gradient
bg = Image.new("RGB", (S, S))
px = bg.load()
for y in range(S):
    for x in range(S):
        px[x, y] = grad((x + y) / (2 * (S - 1)))

# rounded-square clip
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([6, 6, S - 7, S - 7], radius=58, fill=255)
img.paste(bg, (0, 0), mask)

# bold white "A" — two legs + a crossbar (font-independent, crisp)
d = ImageDraw.Draw(img)
w = int(S * 0.085)
apex = (S * 0.5, S * 0.26)
bl = (S * 0.30, S * 0.76)
br = (S * 0.70, S * 0.76)
cross = [(S * 0.385, S * 0.585), (S * 0.615, S * 0.585)]
for seg in ([apex, bl], [apex, br], cross):
    d.line(seg, fill=WHITE, width=w, joint="curve")
for pt in (apex, bl, br, *cross):  # round the ends for a clean finish
    d.ellipse([pt[0] - w / 2, pt[1] - w / 2, pt[0] + w / 2, pt[1] + w / 2], fill=WHITE)

out = os.path.join(os.path.dirname(__file__), "aigx-marketplace.png")
img.save(out, "PNG")
print("wrote", out, img.size)
