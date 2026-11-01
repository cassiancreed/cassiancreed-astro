#!/usr/bin/env python3
"""NEP Shorts builder: vallow-appeal-short-v2 (GRAPHIC 2.0 motion template).

Every frame is drawn with PIL and piped to ffmpeg:
- slow push-in on a plain-shape courthouse drawing, moving from frame 1;
- kinetic text: each card element slides up and fades in on its word;
- big lower-band captions (76-84 px) inside the NEP safe box (x 60-960, y 220-1560);
- amber (#D9A441) only on the victims card; ember (#E0563B) for date/status/link;
- thin ember progress bar; "Narrated with an AI voice" on every frame.
Usage: python3 build-short-v2.py <workdir>   (needs narration-final.wav, words.json)
"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

VERSION = "vallow-appeal-short-v2"
WORK = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
OUT = os.path.join(WORK, "build"); os.makedirs(OUT, exist_ok=True)
AUDIO = os.path.join(WORK, "narration-final.wav")
WORDS = json.load(open(os.path.join(WORK, "words.json")))["words"]
W, H, FPS = 1080, 1920, 30
SAFE_L, SAFE_R, SAFE_T, SAFE_B = 80, 940, 220, 1560
TEXT_W = SAFE_R - SAFE_L

GROUND = (20, 17, 15); INK = (244, 239, 232); STONE = (184, 177, 168)
AMBER = (217, 164, 65); EMBER = (224, 86, 59)
PANEL = (35, 30, 27); PANEL_EDGE = (58, 51, 45); WARM_PANEL = (46, 36, 22)

FD = "/usr/share/fonts/opentype/inter/"
F_BLACK = FD + "InterDisplay-Black.otf"; F_XB = FD + "InterDisplay-ExtraBold.otf"
F_BOLD = FD + "InterDisplay-Bold.otf"; F_SEMI = FD + "InterDisplay-SemiBold.otf"
F_SERIF = "/usr/share/fonts/truetype/crosextra/Caladea-Bold.ttf"
_fc = {}
def font(p, s):
    if (p, s) not in _fc: _fc[(p, s)] = ImageFont.truetype(p, s)
    return _fc[(p, s)]
def tw(d, s, f):
    b = d.textbbox((0, 0), s, font=f); return b[2] - b[0]
def fit(d, s, p, mx, mw=TEXT_W):
    z = mx
    while z > 20 and tw(d, s, font(p, z)) > mw: z -= 2
    return font(p, z)

TEXT_LOG = []  # (text, bbox, px size) at final resting place

class Layer:
    """Transparent full-frame canvas; cropped to a sprite when done."""
    def __init__(self):
        self.im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); self.d = ImageDraw.Draw(self.im)
    def text(self, xy, s, f, fill):
        self.d.text(xy, s, font=f, fill=fill); b = self.d.textbbox(xy, s, font=f)
        TEXT_LOG.append((s, b, f.size)); return b
    def sprite(self):
        bb = self.im.getbbox(); return (self.im.crop(bb), bb[0], bb[1])

def courthouse(d, x, y, w, fill, bg):
    hp = int(w * 0.22)
    d.polygon([(x, y + hp), (x + w // 2, y), (x + w, y + hp)], fill=fill)
    d.polygon([(x + w * 0.16, y + hp - 6), (x + w // 2, y + int(hp * 0.30)), (x + w * 0.84, y + hp - 6)], fill=bg)
    ey = y + hp + 6; d.rectangle([x + 6, ey, x + w - 6, ey + int(w * 0.06)], fill=fill)
    cy = ey + int(w * 0.06) + 8; ch = int(w * 0.42); n = 6; cw = max(4, int(w * 0.075))
    gap = (w - 24 - n * cw) / (n - 1)
    for i in range(n):
        cx = int(x + 12 + i * (cw + gap)); d.rectangle([cx, cy, cx + cw, cy + ch], fill=fill)
    by = cy + ch + 6
    for k in range(3):
        d.rectangle([x - k * 14, by + k * int(w * 0.045), x + w + k * 14, by + (k + 1) * int(w * 0.045) - 4], fill=fill)

def make_bg():
    im = Image.new("RGB", (W, H), GROUND); d = ImageDraw.Draw(im)
    for yy in range(0, H, 4):
        t = yy / H; m = 1 - abs(t - 0.55) * 1.6
        c = tuple(int(GROUND[i] + max(0, m) * (14, 11, 8)[i]) for i in range(3))
        d.rectangle([0, yy, W, yy + 4], fill=c)
    courthouse(d, 70, 1010, 940, (44, 38, 33), (26, 22, 19))
    return im

def base_overlay():
    L = Layer()
    f = font(F_XB, 48); s = "COURT DAY  ·  MON NOV 2, 2026"
    b = L.d.textbbox((0, 0), s, font=f)
    L.d.rounded_rectangle([SAFE_L, 238, SAFE_L + (b[2] - b[0]) + 44, 238 + 76], radius=14, fill=EMBER)
    L.text((SAFE_L + 22, 238 + 38 - (b[1] + b[3]) // 2), s, f, GROUND)
    L.text((SAFE_L, 1500), "Narrated with an AI voice", font(F_SEMI, 40), STONE)
    return L.im

def wt(i): return WORDS[i][1]

# ---- card elements: (reveal time, sprite builder) ----
def el_text(y, s, p, size, fill, mw=TEXT_W, x=SAFE_L):
    L = Layer(); f = fit(L.d, s, p, size, mw); b = L.text((x, y), s, f, fill); return L, b

def panel(L, y0, y1, warm=False, bar=None):
    L.d.rounded_rectangle([SAFE_L, y0, SAFE_R, y1], radius=24, fill=WARM_PANEL if warm else PANEL,
                          outline=PANEL_EDGE, width=3)
    if bar: L.d.rectangle([SAFE_L + 26, y0 + 30, SAFE_L + 40, y1 - 30], fill=bar)

def label(y, s, col=STONE):
    L = Layer(); L.d.rectangle([SAFE_L, y + 6, SAFE_L + 12, y + 50], fill=col)
    L.text((SAFE_L + 28, y), s, font(F_BOLD, 48), col); return L

def build_cards():
    C = []  # (start, end, [(t_in, sprite)])
    def add(t0, items): C.append([0.0 if not C else min(t for t, _ in items), None, items])
    # HOOK (moving at 0.0 s: TODAY slide starts at -0.2 s)
    it = []
    L, b = el_text(330, "TODAY", F_BLACK, 176, EMBER); it.append((-0.2, L))
    L, b2 = el_text(b[3] + 24, "10:15 A.M. PACIFIC", F_BLACK, 104, INK); it.append((0.25, L))
    L = Layer(); f = fit(L.d, "Lori Vallow Daybell's", F_SERIF, 100)
    bb = L.text((SAFE_L, b2[3] + 40), "Lori Vallow Daybell's", f, INK)
    bb = L.text((SAFE_L, bb[3] + 12), "appeal", f, INK); it.append((0.7, L))
    L, b3 = el_text(bb[3] + 34, "Idaho Supreme Court  ·  Boise", F_SEMI, 50, STONE); it.append((wt(6), L))
    L, b4 = el_text(b3[3] + 14, "11:15 a.m. MT", F_SEMI, 50, STONE); it.append((wt(6) + 0.15, L))
    L, b5 = el_text(b4[3] + 30, "A review, not a new trial", F_XB, 60, EMBER); it.append((wt(11), L))
    add(0.0, it)
    # VICTIMS (amber only here)
    it = [(wt(15), label(330, "FIRST, THE VICTIMS", AMBER))]
    y = 420
    for wi, name in ((18, "Her son, 7"), (21, "Her daughter, 16"), (24, "Tammy Daybell, 49")):
        L = Layer(); panel(L, y, y + 180, warm=True, bar=AMBER)
        L.text((SAFE_L + 76, y + 38), name, font(F_SERIF, 92), INK); it.append((wt(wi) - 0.1, L)); y += 206
    add(wt(15) - 0.1, it)
    # VERDICT
    it = [(wt(30) - 0.1, label(330, "THE 2023 VERDICT"))]
    L, b = el_text(420, "A jury convicted her of:", F_XB, 62, INK); it.append((wt(30) - 0.1, L))
    y = b[3] + 26
    L = Layer(); panel(L, y, y + 200, bar=STONE)
    L.text((SAFE_L + 72, y + 28), "First-degree murder", fit(L.d, "First-degree murder", F_BLACK, 74, TEXT_W - 110), INK)
    it.append((wt(35) - 0.1, L))
    L = Layer(); L.text((SAFE_L + 72, y + 124), "Deaths of her son and daughter", fit(L.d, "Deaths of her son and daughter", F_SEMI, 46, TEXT_W - 110), STONE)
    it.append((wt(40), L))
    y2 = y + 226
    L = Layer(); panel(L, y2, y2 + 200, bar=STONE)
    L.text((SAFE_L + 72, y2 + 28), "Conspiring to murder", fit(L.d, "Conspiring to murder", F_BLACK, 74, TEXT_W - 110), INK)
    L.text((SAFE_L + 72, y2 + 124), "Tammy Daybell, 49", font(F_SEMI, 46), STONE); it.append((wt(51), L))
    L = Layer(); bb = L.text((SAFE_L, y2 + 236), "Sentence: life without parole", fit(L.d, "Sentence: life without parole", F_XB, 62), INK)
    L.text((SAFE_L, bb[3] + 12), "Per KSL.com, 2023", font(F_SEMI, 40), STONE); it.append((wt(58), L))
    add(wt(30) - 0.1, it)
    # TODAY IS
    it = [(wt(62), label(330, "WHAT TODAY IS"))]
    L, b = el_text(420, "A REVIEW,", F_BLACK, 132, INK, mw=TEXT_W); it.append((wt(62), L))
    L, b2 = el_text(b[3] + 18, "NOT A NEW TRIAL", F_BLACK, 132, EMBER); it.append((wt(66), L))
    y = b2[3] + 50
    L = Layer(); panel(L, y, y + 250, bar=STONE)
    bb = L.text((SAFE_L + 72, y + 28), "No witnesses testify", font(F_XB, 60), INK)
    bb = L.text((SAFE_L + 72, bb[3] + 16), "Each side gets 30 minutes", fit(L.d, "Each side gets 30 minutes", F_XB, 60, TEXT_W - 110), INK)
    L.text((SAFE_L + 72, bb[3] + 18), "Per EastIdahoNews", font(F_SEMI, 40), STONE); it.append((wt(70) - 0.1, L))
    add(wt(62) - 0.1, it)
    # EACH SIDE (one card, two beats per box)
    it = [(wt(73), label(330, "WHAT EACH SIDE SAYS"))]
    L, b = el_text(406, "Per their court briefs, via EastIdahoNews", F_SEMI, 40, STONE); it.append((wt(73), L))
    y = b[3] + 22; h1 = 92 + 4 * 66 + 22
    L = Layer(); panel(L, y, y + h1); L.text((SAFE_L + 36, y + 26), "HER ATTORNEYS SAY", font(F_BOLD, 46), STONE)
    it.append((wt(73) + 0.1, L))
    yy = y + 92
    L = Layer()
    for s in ("The judge wrongly removed", "the attorney she hired."):
        L.text((SAFE_L + 36, yy), s, fit(L.d, "The judge wrongly removed", F_XB, 56, TEXT_W - 72), INK); yy += 66
    it.append((wt(77), L))
    L = Layer()
    for s in ("She was denied", "a speedy trial."):
        L.text((SAFE_L + 36, yy), s, fit(L.d, "The judge wrongly removed", F_XB, 56, TEXT_W - 72), INK); yy += 66
    it.append((wt(84), L))
    y2 = y + h1 + 24; h2 = 92 + 3 * 66 + 22
    L = Layer(); panel(L, y2, y2 + h2); L.text((SAFE_L + 36, y2 + 26), "THE STATE SAYS", font(F_BOLD, 46), STONE)
    L.text((SAFE_L + 36, y2 + 92), "Her convictions should stand.", fit(L.d, "Her convictions should stand.", F_XB, 56, TEXT_W - 72), INK)
    it.append((wt(92), L))
    L = Layer(); yy = y2 + 92 + 66
    for s in ("No error big enough", "to undo the verdict."):
        L.text((SAFE_L + 36, yy), s, fit(L.d, "Her convictions should stand.", F_XB, 56, TEXT_W - 72), INK); yy += 66
    it.append((wt(97), L))
    add(wt(73) - 0.1, it)
    # NEXT
    it = [(wt(103), label(330, "WHAT COMES NEXT"))]
    y = 420
    for wi, l1, l2, src in ((103, "The justices rule later,", "in writing", "No decision date announced"),
                            (109, "Until then,", "her convictions stand", "While the appeal is pending")):
        L = Layer(); panel(L, y, y + 290, bar=STONE)
        bb = L.text((SAFE_L + 72, y + 30), l1, fit(L.d, "The justices rule later,", F_XB, 66, TEXT_W - 110), INK)
        bb = L.text((SAFE_L + 72, bb[3] + 16), l2, fit(L.d, "The justices rule later,", F_XB, 66, TEXT_W - 110), INK)
        L.text((SAFE_L + 72, bb[3] + 24), src, font(F_SEMI, 42), STONE)
        it.append((wt(wi) + 0.05, L)); y += 320
    add(wt(103) - 0.1, it)
    # END CARD
    it = []
    L = Layer(); courthouse(L.d, SAFE_L, 340, 200, STONE, GROUND); it.append((wt(114), L))
    L, b = el_text(620, "Court dates and sources:", F_BLACK, 80, INK); it.append((wt(114), L))
    L = Layer(); f = fit(L.d, "cassiancreed.com", F_BLACK, 116)
    bb = L.text((SAFE_L, b[3] + 30), "cassiancreed.com", f, EMBER)
    bb = L.text((SAFE_L, bb[3] + 18), "/court-calendar", f, EMBER); it.append((wt(114) + 0.6, L))
    L, _ = el_text(bb[3] + 50, VERSION + "  ·  Nov 2, 2026", F_SEMI, 40, STONE); it.append((wt(114) + 0.9, L))
    add(wt(114) - 0.1, it)
    for k in range(len(C)):
        C[k][1] = C[k + 1][0] if k + 1 < len(C) else 1e9
        C[k][2] = [(t, L.sprite()) for t, L in C[k][2]]
    return C

NB = " "
CHUNKS = [(0, "Today at 10:15, Pacific" + NB + "time,"), (6, "the Idaho Supreme Court hears"),
    (11, "Lori" + NB + "Vallow" + NB + "Daybell's appeal."), (15, "First, the victims:"), (18, "her son, 7."),
    (21, "Her daughter, 16."), (24, "And Tammy" + NB + "Daybell, 49."), (28, "In 2023, a jury convicted her"),
    (34, "of first-degree murder"), (38, "in the deaths of"), (42, "her son and daughter."),
    (46, "It also convicted her"), (50, "of conspiring to murder"), (54, "Tammy" + NB + "Daybell."),
    (56, "She is serving life"), (60, "without parole."), (62, "Today is a review,"), (66, "not a new trial."),
    (70, "No witnesses testify."), (73, "Her attorneys say the judge"), (78, "wrongly removed the attorney"),
    (82, "she hired,"), (84, "and that she was denied"), (89, "a speedy trial."), (92, "The State asks the court"),
    (97, "to keep her convictions in place."), (103, "The justices rule later,"), (107, "in writing."),
    (109, "Until then,"), (111, "her convictions stand."), (114, "Court dates and sources:"),
    (118, "cassiancreed.com, court" + NB + "calendar")]

def split_two(d, s, f, mw):
    w = s.split(" "); best = None
    for k in range(1, len(w)):
        a, b = " ".join(w[:k]), " ".join(w[k:])
        if (k == 1 or k == len(w) - 1) and len(w) > 2: continue
        m = max(tw(d, a, f), tw(d, b, f))
        if m <= mw and (best is None or m < best[0]): best = (m, [a, b])
    return best[1] if best else None

def caption_sprite(s):
    L = Layer(); d = ImageDraw.Draw(L.im, "RGBA"); mw = TEXT_W - 60; ls = f = None
    for z in range(88, 76, -2):
        if tw(d, s, font(F_XB, z)) <= mw: ls, f = [s], font(F_XB, z); break
    if ls is None:
        for z in range(84, 70, -2):
            ls = split_two(d, s, font(F_XB, z), mw)
            if ls: f = font(F_XB, z); break
    if f is None:
        z = 84
        while z > 50 and tw(d, s, font(F_XB, z)) > mw: z -= 2
        ls, f = [s], font(F_XB, z)
        print("caption fallback", repr(s), z)
    lh = int(f.size * 1.18); bh = len(ls) * lh + 48; top = 1218 + (2 * int(84 * 1.18) + 48 - bh) // 2
    d.rounded_rectangle([SAFE_L - 12, top, SAFE_R + 12, top + bh], radius=26, fill=(12, 10, 9, 232))
    y = top + 22
    for ln in ls:
        w_ = tw(d, ln, f); L.text(((SAFE_L + SAFE_R) // 2 - w_ // 2, y), ln, f, INK); y += lh
    return L.sprite()

def ease(u): u = min(1, max(0, u)); return 1 - (1 - u) ** 3

def put(frame, spr, t, t_in, dur=0.38, dy=40):
    im, x, y = spr; u = (t - t_in) / dur
    if u <= 0: return
    e = ease(u); yy = y + int(round(dy * (1 - e)))
    if e >= 0.999: frame.alpha_composite(im, (x, yy)); return
    a = im.getchannel("A").point(lambda v: int(v * e)); im2 = im.copy(); im2.putalpha(a)
    frame.alpha_composite(im2, (x, yy))

def ffdur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", p]))

def main():
    dur = ffdur(AUDIO); n = int(round(dur * FPS))
    bg = make_bg(); over = base_overlay(); cards = build_cards()
    caps = []
    for k, (wi, s) in enumerate(CHUNKS):
        t0 = 0.0 if k == 0 else WORDS[wi][1] - 0.08
        caps.append([t0, None, caption_sprite(s)])
    for k in range(len(caps)): caps[k][1] = caps[k + 1][0] if k + 1 < len(caps) else 1e9
    safe = [{"text": s, "bbox": b, "px": z, "safe": b[0] >= 60 and b[2] <= 960 and b[1] >= 220 and b[3] <= 1560} for s, b, z in TEXT_LOG]
    json.dump({"all_safe": all(r["safe"] for r in safe), "min_px": min(r["px"] for r in safe),
               "caption_px": sorted({r["px"] for r in safe if r["bbox"][1] >= 1218 and r["bbox"][3] <= 1480}),
               "card_starts": [round(c[0], 2) for c in cards],
               "beats": sorted({round(max(0, t), 2) for c in cards for t, _ in c[2]}),
               "caption_starts": [round(c[0], 2) for c in caps], "texts": safe},
              open(os.path.join(OUT, "layout-check-v2.json"), "w"), indent=1)
    if os.environ.get("CHECK_ONLY"): print("layout only"); return
    out = os.path.join(OUT, VERSION + ".mp4")
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", AUDIO, "-map", "0:v", "-map", "1:a",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p",
           "-r", str(FPS), "-g", "60", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
           "-t", f"{dur:.3f}", "-movflags", "+faststart", "-map_metadata", "-1",
           "-metadata", f"title={VERSION}", "-metadata", "comment=Narrated with an AI voice. NEP, cassiancreed.com", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    cx, cy = 540, 1300
    for i in range(n):
        t = i / FPS
        s = 1.0 + 0.12 * (t / dur)
        a = 1 / s
        fr = bg.transform((W, H), Image.AFFINE, (a, 0, cx - cx * a, 0, a, cy - cy * a), resample=Image.BILINEAR).convert("RGBA")
        fr.alpha_composite(over)
        ImageDraw.Draw(fr).rectangle([0, 224, int(W * min(1, t / dur)), 230], fill=EMBER)
        for t0, t1, items in cards:
            if t0 <= t < t1:
                for t_in, spr in items: put(fr, spr, t, t_in)
        for t0, t1, spr in caps:
            if t0 <= t < t1: put(fr, spr, t, t0, dur=0.18, dy=16)
        p.stdin.write(fr.convert("RGB").tobytes())
        if i % 300 == 0: print("frame", i, "/", n, flush=True)
    p.stdin.close(); p.wait()
    print(out, os.path.getsize(out), "dur", dur)

if __name__ == "__main__":
    main()
