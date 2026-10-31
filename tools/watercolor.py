#!/usr/bin/env python3
"""
Generador de recursos de acuarela para el sitio V & JF.

Pinta copas de árboles, palmas y una selva (vista cenital) con el carácter
de una acuarela real: bordes irregulares, granulado del papel, varias
veladuras superpuestas y el reborde oscuro que deja el pigmento al secarse.

Uso:  python3 tools/watercolor.py         -> escribe en assets/img/wc/
"""
import os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img', 'wc')
os.makedirs(OUT, exist_ok=True)

# --- paleta (misma que css/tokens.css) ---------------------------------
def hx(s): return tuple(int(s[i:i+2], 16) / 255 for i in (1, 3, 5))
GREENS = {
    'pale':  hx('#D6E8D2'),
    'light': hx('#C4DFC0'),
    'leaf':  hx('#ABD1A6'),
    'mid':   hx('#9CC79A'),
    'deep':  hx('#7FB07C'),
    'palm':  hx('#6E9F6B'),
    'dark':  hx('#5C8C5C'),
}
SAND  = hx('#F0E4BE')
WATER = hx('#B9D9DF')
WATER_DEEP = hx('#97C1CB')

# --- utilidades --------------------------------------------------------
def noise(w, h, scale, rng):
    """Ruido suave (valor en 0..1) con tamaño de grano `scale` px."""
    sw, sh = max(2, int(w / scale) + 2), max(2, int(h / scale) + 2)
    small = (rng.random((sh, sw)) * 255).astype('uint8')
    img = Image.fromarray(small).resize((w, h), Image.BICUBIC)
    return np.asarray(img).astype(np.float32) / 255.0

def blur(a, r):
    if r <= 0: return a
    img = Image.fromarray((np.clip(a, 0, 1) * 255).astype('uint8'))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255.0

def displace(mask, amount, scale, rng):
    """Desplaza los bordes de una máscara con ruido: la mancha deja de ser geométrica."""
    h, w = mask.shape
    dx = (noise(w, h, scale, rng) - .5) * 2 * amount
    dy = (noise(w, h, scale, rng) - .5) * 2 * amount
    ys, xs = np.mgrid[0:h, 0:w]
    sx = np.clip((xs + dx).round().astype(int), 0, w - 1)
    sy = np.clip((ys + dy).round().astype(int), 0, h - 1)
    return mask[sy, sx]

class Paper:
    """Lienzo RGBA flotante (fondo transparente) con composición 'over'."""
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.rgb = np.zeros((h, w, 3), np.float32)
        self.a = np.zeros((h, w), np.float32)
    def over(self, rgb, a):
        a = np.clip(a, 0, 1)
        out_a = a + self.a * (1 - a)
        num = rgb * a[..., None] + self.rgb * (self.a * (1 - a))[..., None]
        self.rgb = np.where(out_a[..., None] > 1e-6, num / np.maximum(out_a, 1e-6)[..., None], self.rgb)
        self.a = out_a
    def save(self, path):
        img = np.concatenate([self.rgb, self.a[..., None]], axis=2)
        Image.fromarray((np.clip(img, 0, 1) * 255).astype('uint8')).save(path)
        print('  ', os.path.relpath(path), f'{self.w}x{self.h}')

def wash(paper, mask, color, rng, opacity=.55, wobble=7, wobble_scale=22, rim=.5, grain=.4, soften=.45):
    """Una veladura: máscara -> bordes irregulares -> granulado y floraciones -> reborde oscuro."""
    h, w = mask.shape
    m = displace(mask, wobble, wobble_scale, rng)      # ondulación grande del contorno
    m = displace(m, 1.6, 4, rng)                       # temblor fino del borde
    m = blur(m, soften)
    inner = blur(m, 2.4)
    edge = np.clip(m - inner, 0, 1)                    # reborde delgado donde el pigmento se acumula
    edge = edge / max(edge.max(), 1e-6)
    bloom = noise(w, h, max(10, int(min(w, h) / 6)), rng)   # zonas más densas y más claras
    g = noise(w, h, 3, rng)
    tex = (1 - grain) + grain * (0.7 * bloom + 0.3 * g)
    alpha = m * opacity * tex + edge * opacity * rim
    col = np.array(color, np.float32)
    dark = col * 0.78
    k = np.clip(edge * .8 + (1 - bloom) * .25, 0, 1)[..., None]
    rgb = col[None, None, :] * (1 - k) + dark[None, None, :] * k
    paper.over(rgb, alpha)

# --- formas ------------------------------------------------------------
def blob_mask(w, h, cx, cy, r, rng, lobes=6, spread=.55):
    img = Image.new('L', (w, h), 0); d = ImageDraw.Draw(img)
    d.ellipse((cx - r * .7, cy - r * .7, cx + r * .7, cy + r * .7), fill=255)
    for _ in range(lobes):
        ang = rng.random() * math.tau
        dist = r * spread * rng.random()
        rr = r * (0.35 + 0.45 * rng.random())
        x, y = cx + math.cos(ang) * dist, cy + math.sin(ang) * dist
        d.ellipse((x - rr, y - rr * (0.8 + .4 * rng.random()), x + rr, y + rr * (0.8 + .4 * rng.random())), fill=255)
    return np.asarray(img).astype(np.float32) / 255

def palm_mask(w, h, cx, cy, r, rng, fronds=14):
    img = Image.new('L', (w, h), 0); d = ImageDraw.Draw(img)
    d.ellipse((cx - r * .14, cy - r * .14, cx + r * .14, cy + r * .14), fill=255)
    base = rng.random() * math.tau
    for i in range(fronds):
        ang = base + i * math.tau / fronds + (rng.random() - .5) * .25
        ln = r * (0.7 + 0.35 * rng.random())
        wd = r * (0.07 + 0.05 * rng.random())
        pts = []
        # hoja: un huso con muescas
        for t in np.linspace(0, 1, 9):
            ww = wd * math.sin(math.pi * t) * (0.7 + 0.5 * rng.random())
            px, py = cx + math.cos(ang) * ln * t, cy + math.sin(ang) * ln * t
            pts.append((px + math.cos(ang + math.pi / 2) * ww, py + math.sin(ang + math.pi / 2) * ww))
        for t in np.linspace(1, 0, 9):
            ww = wd * math.sin(math.pi * t) * (0.7 + 0.5 * rng.random())
            px, py = cx + math.cos(ang) * ln * t, cy + math.sin(ang) * ln * t
            pts.append((px - math.cos(ang + math.pi / 2) * ww, py - math.sin(ang + math.pi / 2) * ww))
        d.polygon(pts, fill=255)
    return np.asarray(img).astype(np.float32) / 255

# --- piezas ------------------------------------------------------------
def paint_canopy(paper, cx, cy, r, rng, with_palm=False):
    """Copa: tres veladuras de verde cada vez más pequeñas, a veces una palma encima."""
    wash(paper, blob_mask(paper.w, paper.h, cx, cy, r, rng, lobes=7, spread=.6), GREENS['light'], rng, opacity=.58, wobble=r * .12, wobble_scale=r * .5)
    wash(paper, blob_mask(paper.w, paper.h, cx + (rng.random() - .5) * r * .4, cy + (rng.random() - .5) * r * .4, r * .68, rng, lobes=5), GREENS['leaf'], rng, opacity=.5, wobble=r * .1, wobble_scale=r * .4)
    if rng.random() < .7:
        wash(paper, blob_mask(paper.w, paper.h, cx + (rng.random() - .5) * r * .6, cy + (rng.random() - .5) * r * .6, r * .36, rng, lobes=4), GREENS['mid'], rng, opacity=.45, wobble=r * .08, wobble_scale=r * .3)
    if with_palm:
        paint_palm(paper, cx + (rng.random() - .5) * r * .5, cy + (rng.random() - .5) * r * .5, r * .42, rng)

def paint_palm(paper, cx, cy, r, rng):
    wash(paper, palm_mask(paper.w, paper.h, cx, cy, r, rng, fronds=rng.integers(12, 17)), GREENS['palm'], rng, opacity=.7, wobble=max(1.5, r * .05), wobble_scale=max(6, r * .25), rim=.35, soften=.5)
    wash(paper, palm_mask(paper.w, paper.h, cx, cy, r * .6, rng, fronds=rng.integers(9, 12)), GREENS['dark'], rng, opacity=.5, wobble=max(1, r * .04), wobble_scale=max(6, r * .25), rim=.3, soften=.4)

def sprite_canopy(name, size, seed, with_palm=False, extra=0):
    rng = np.random.default_rng(seed)
    p = Paper(size, size)
    paint_canopy(p, size * .5, size * .5, size * .32, rng, with_palm)
    for _ in range(extra):   # copas satélite para clusters
        ang = rng.random() * math.tau; dist = size * .22
        paint_canopy(p, size * .5 + math.cos(ang) * dist, size * .5 + math.sin(ang) * dist, size * (.18 + .08 * rng.random()), rng, rng.random() < .4)
    p.save(os.path.join(OUT, f'{name}.png'))

def sprite_palm(name, size, seed):
    rng = np.random.default_rng(seed)
    p = Paper(size, size)
    paint_palm(p, size * .5, size * .5, size * .42, rng)
    p.save(os.path.join(OUT, f'{name}.png'))

def jungle(name, w, h, seed, n_canopies=26, n_palms=9, hole=None):
    """Selva cenital: muchas copas que se solapan, palmas encima, huecos de papel."""
    rng = np.random.default_rng(seed)
    p = Paper(w, h)
    pts = []
    tries = 0
    while len(pts) < n_canopies and tries < 4000:
        tries += 1
        x, y = rng.random() * w, rng.random() * h
        r = min(w, h) * (0.09 + 0.09 * rng.random())
        if hole and (x - hole[0]) ** 2 / hole[2] ** 2 + (y - hole[1]) ** 2 / hole[3] ** 2 < 1: continue
        if all((x - a) ** 2 + (y - b) ** 2 > (r * .55 + c * .55) ** 2 for a, b, c in pts):
            pts.append((x, y, r))
    for x, y, r in pts:
        paint_canopy(p, x, y, r, rng, with_palm=False)
    for _ in range(n_palms):
        x, y, r = pts[rng.integers(len(pts))]
        paint_palm(p, x + (rng.random() - .5) * r, y + (rng.random() - .5) * r, r * .4, rng)
    # desvanecer bordes del lienzo para que nunca se vea el rectángulo
    yy, xx = np.mgrid[0:h, 0:w]
    fx = np.minimum(xx, w - 1 - xx) / (w * .18); fy = np.minimum(yy, h - 1 - yy) / (h * .18)
    fade = np.clip(np.minimum(fx, fy), 0, 1); fade = fade * fade * (3 - 2 * fade)
    p.a *= fade
    p.save(os.path.join(OUT, f'{name}.png'))

if __name__ == '__main__':
    print('Pintando acuarelas en', os.path.relpath(OUT))
    sprite_canopy('copa-01', 360, 11)
    sprite_canopy('copa-02', 360, 12, with_palm=True)
    sprite_canopy('copa-03', 420, 13, extra=2)
    sprite_canopy('copa-04', 420, 14, with_palm=True, extra=2)
    sprite_canopy('copa-05', 300, 15)
    sprite_canopy('copa-06', 480, 16, with_palm=True, extra=3)
    sprite_palm('palma-01', 160, 21)
    sprite_palm('palma-02', 160, 22)
    sprite_palm('palma-03', 140, 23)
    sprite_palm('palma-04', 180, 24)
    jungle('selva-01', 1400, 1000, 31)
    jungle('selva-02', 1100, 900, 32, n_canopies=20, n_palms=7)
