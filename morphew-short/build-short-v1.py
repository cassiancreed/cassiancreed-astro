#!/usr/bin/env python3
"""NEP Shorts builder: morphew-status-short-v1 (graphics v2, from vallow-appeal-short-v1).

Graphics v2 changes vs Vallow: bigger captions placed lower (inside the safe
zone), cards slide in (simple motion), one warm accent on the victim card,
no empty bottom third. Renders PNG states with PIL; ffmpeg joins them on
heard-word times, adds a progress bar and the mastered narration.
1080x1920, 30 fps, H.264 veryfast CRF 18, AAC 192k.

Usage: python3 build-short-v1.py <workdir>
  <workdir> must hold narration-final.wav and check-final.json (Whisper words).
"""
import json
import os
import re
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

VERSION = "morphew-status-short-v1"
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
OUT = os.path.join(WORK, "build")
os.makedirs(OUT, exist_ok=True)
AUDIO = os.path.join(WORK, "narration-final.wav")
WORDS = json.load(open(os.path.join(WORK, "check-final.json")))["words"]

W, H = 1080, 1920
SAFE_L, SAFE_R = 72, 900          # no text right of x=918 (15%)
SAFE_TOP, SAFE_BOT = 250, 1500    # no text below y=1536 (20%)
TEXT_W = SAFE_R - SAFE_L

BG = (22, 27, 36)
BG2 = (33, 40, 52)
SLATE = (46, 55, 70)
GOLD = (245, 184, 61)
WARM = (241, 139, 100)            # the one warm accent: victim card only
WARMBG = (56, 38, 38)
WHITE = (255, 255, 255)
GRAY = (190, 199, 213)
BOXBG = (0, 0, 0, 225)

FD = "/usr/share/fonts/opentype/inter/"
F_XB = FD + "InterDisplay-ExtraBold.otf"
F_BOLD = FD + "InterDisplay-Bold.otf"
F_SEMI = FD + "InterDisplay-SemiBold.otf"
F_MED = FD + "Inter-Medium.otf"
KD = os.path.join(HERE, "fonts") + "/"
F_HEAD = KD + "BarlowCondensed-ExtraBold.ttf"
F_HEAD_B = KD + "BarlowCondensed-Bold.ttf"
F_SERIF = KD + "SourceSerif4.ttf"

_cache = {}


def font(path, size, var=None):
    key = (path, size, var)
    if key not in _cache:
        f = ImageFont.truetype(path, size)
        if var:
            try:
                f.set_variation_by_name(var)
            except Exception:
                pass
        _cache[key] = f
    return _cache[key]


def text_w(d, s, f):
    b = d.textbbox((0, 0), s, font=f)
    return b[2] - b[0]


def fit(d, s, path, max_size, max_w=TEXT_W):
    size = max_size
    while size > 20 and text_w(d, s, font(path, size)) > max_w:
        size -= 2
    return font(path, size)


def wrap(d, s, f, max_w):
    words, out, cur = s.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if text_w(d, t, f) <= max_w:
            cur = t
        else:
            if cur:
                out.append(cur)
            cur = w
    if cur:
        out.append(cur)
    return out


TEXT_BOXES = []  # every text bbox drawn (final positions), for the safe-zone check


def draw_text(d, xy, s, f, fill, dx=0):
    d.text(xy, s, font=f, fill=fill)
    b = d.textbbox(xy, s, font=f)
    TEXT_BOXES.append((s, (b[0] - dx, b[1], b[2] - dx, b[3])))
    return b


def courthouse(d, x, y, w, fill, bg):
    """Generic courthouse from plain shapes (no real building)."""
    h_ped = int(w * 0.22)
    d.polygon([(x, y + h_ped), (x + w // 2, y), (x + w, y + h_ped)], fill=fill)
    d.polygon([(x + w * 0.16, y + h_ped - 6), (x + w // 2, y + int(h_ped * 0.30)), (x + w * 0.84, y + h_ped - 6)], fill=bg)
    ey = y + h_ped + 6
    d.rectangle([x + 6, ey, x + w - 6, ey + int(w * 0.06)], fill=fill)
    cy = ey + int(w * 0.06) + 8
    ch = int(w * 0.42)
    n, cw = 6, max(4, int(w * 0.075))
    gap = (w - 24 - n * cw) / (n - 1)
    for i in range(n):
        cx = int(x + 12 + i * (cw + gap))
        d.rectangle([cx, cy, cx + cw, cy + ch], fill=fill)
    by = cy + ch + 6
    for k in range(3):
        d.rectangle([x - k * 10, by + k * int(w * 0.045), x + w + k * 10, by + (k + 1) * int(w * 0.045) - 4], fill=fill)


_BASE = None


def base():
    global _BASE
    if _BASE is None:
        im = Image.new("RGB", (W, H), BG)
        d = ImageDraw.Draw(im)
        for yy in range(0, H, 6):
            t = yy / H
            c = tuple(int(BG[i] * (1 - t) + (14, 17, 24)[i] * t) for i in range(3))
            d.rectangle([0, yy, W, yy + 6], fill=c)
        # bottom band under the platform UI: art only, no text
        courthouse(d, 190, 1600, 700, (40, 48, 62), (18, 22, 30))
        d.rectangle([0, 1528, W, 1532], fill=(60, 50, 34))
        _BASE = im
    im = _BASE.copy()
    d = ImageDraw.Draw(im)
    draw_text(d, (SAFE_L, 262), "COURT CALENDAR  ·  TUE NOV 3, 2026", font(F_HEAD_B, 46), GOLD)
    draw_text(d, (SAFE_L, 1452), "Narrated with an AI voice", font(F_SEMI, 34), GRAY)
    return im


def label(d, y, s, dx, color=GOLD):
    d.rectangle([SAFE_L + dx, y + 6, SAFE_L + dx + 12, y + 58], fill=color)
    draw_text(d, (SAFE_L + dx + 30, y - 4), s, font(F_HEAD, 62), color, dx)
    return y + 96


def item(d, y, s, src, dx, size=60, accent=GOLD):
    f = font(F_XB, size)
    ls = s.split("|") if "|" in s else wrap(d, s, f, TEXT_W - 90)
    lh = int(size * 1.22)
    h = 34 + len(ls) * lh + (58 if src else 18)
    d.rounded_rectangle([SAFE_L + dx, y, SAFE_R + dx, y + h], radius=24, fill=BG2, outline=SLATE, width=3)
    d.rectangle([SAFE_L + dx + 26, y + 30, SAFE_L + dx + 36, y + h - 30], fill=accent)
    yy = y + 24
    for ln in ls:
        b = draw_text(d, (SAFE_L + dx + 60, yy), ln, f, WHITE, dx)
        yy = b[3] + 14
    if src:
        draw_text(d, (SAFE_L + dx + 60, yy + 6), src, font(F_MED, 34), GRAY, dx)
    return y + h


def card_layer(key, dx):
    """Draw one card onto a transparent layer, shifted right by dx."""
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    y = 360
    if key == "hook":
        courthouse(d, 700 + dx, 370, 200, GOLD, (0, 0, 0, 0))
        b = draw_text(d, (SAFE_L - 4 + dx, y - 30), "TODAY", font(F_HEAD, 230), GOLD, dx)
        b = draw_text(d, (SAFE_L + dx, b[3] + 20), "12:30 P.M. PACIFIC", fit(d, "12:30 P.M. PACIFIC", F_HEAD, 140), WHITE, dx)
        b = draw_text(d, (SAFE_L + dx, b[3] + 36), "Barry Morphew's case", font(F_XB, 70), WHITE, dx)
        b = draw_text(d, (SAFE_L + dx, b[3] + 14), "is back in court.", font(F_XB, 70), WHITE, dx)
        b = draw_text(d, (SAFE_L + dx, b[3] + 34), "1:30 p.m. MT · Alamosa County, Colo.", fit(d, "1:30 p.m. MT · Alamosa County, Colo.", F_SEMI, 46), GRAY, dx)
        draw_text(d, (SAFE_L + dx, b[3] + 22), "Status conference, by video", font(F_BOLD, 52), GOLD, dx)
    elif key == "victim":
        y = label(d, y, "FIRST, THE VICTIM", dx, WARM)
        # soft warm glow behind the card (the one warm accent)
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(glow).rounded_rectangle([SAFE_L + dx - 10, y - 10, SAFE_R + dx + 10, y + 680], radius=40, fill=WARM + (90,))
        lay.alpha_composite(glow.filter(ImageFilter.GaussianBlur(28)))
        d = ImageDraw.Draw(lay)
        d.rounded_rectangle([SAFE_L + dx, y, SAFE_R + dx, y + 668], radius=30, fill=WARMBG, outline=WARM, width=5)
        # simple candle (plain shapes)
        cx = SAFE_R + dx - 110
        d.ellipse([cx - 16, y + 46, cx + 16, y + 100], fill=WARM)
        d.ellipse([cx - 7, y + 66, cx + 7, y + 96], fill=(255, 226, 170))
        d.rounded_rectangle([cx - 26, y + 108, cx + 26, y + 232], radius=8, fill=(244, 232, 214))
        b = draw_text(d, (SAFE_L + dx + 44, y + 40), "Suzanne", font(F_SERIF, 108, "Bold"), WHITE, dx)
        b = draw_text(d, (SAFE_L + dx + 44, b[3] + 10), "Morphew, 49", font(F_SERIF, 108, "Bold"), WHITE, dx)
        d.rectangle([SAFE_L + dx + 44, b[3] + 30, SAFE_L + dx + 200, b[3] + 36], fill=WARM)
        b = draw_text(d, (SAFE_L + dx + 44, b[3] + 62), "Went missing on Mother's Day,", font(F_BOLD, 50), WHITE, dx)
        b = draw_text(d, (SAFE_L + dx + 44, b[3] + 12), "May 10, 2020", font(F_BOLD, 50), WHITE, dx)
        b = draw_text(d, (SAFE_L + dx + 44, b[3] + 26), "Her remains were found in 2023", fit(d, "Her remains were found in 2023", F_SEMI, 44, TEXT_W - 90), WARM, dx)
        draw_text(d, (SAFE_L + dx + 44, b[3] + 22), "Per Colorado Public Radio", font(F_MED, 34), GRAY, dx)
    elif key == "charge":
        y = label(d, y, "THE CHARGE", dx)
        b = draw_text(d, (SAFE_L + dx, y - 10), "Barry Morphew, her husband:", fit(d, "Barry Morphew, her husband:", F_XB, 58), WHITE, dx)
        y = b[3] + 26
        y = item(d, y, "Charged with|first-degree murder", "An accusation, not a finding", dx)
        y = item(d, y + 18, "Pleaded not guilty", "Jan. 12, 2026 · Per KOAA", dx)
        item(d, y + 18, "Presumed innocent", None, dx)
    elif key == "history":
        y = label(d, y, "HOW WE GOT HERE", dx)
        y = item(d, y, "First case dismissed|April 2022, before trial", "Per the Denver Gazette", dx)
        item(d, y + 22, "New case: grand jury|indictment, June 2025", "Per Colorado Judicial Branch", dx)
    elif key == "today":
        y = label(d, y, "WHAT TODAY IS", dx)
        b = draw_text(d, (SAFE_L - 4 + dx, y - 18), "A CHECK-IN,", font(F_HEAD, 132), WHITE, dx)
        b = draw_text(d, (SAFE_L - 4 + dx, b[3] + 8), "NOT A TRIAL", font(F_HEAD, 132), GOLD, dx)
        y = b[3] + 40
        y = item(d, y, "Status conference, by video", "Per Colorado Judicial Branch", dx, 50)
        item(d, y + 18, "No verdict can come from it", None, dx, 50)
    elif key == "next":
        y = label(d, y, "WHAT COMES NEXT", dx)
        y = item(d, y, "Jury trial reported|for summer 2027", "Per Denver7, July 6, 2026", dx)
        item(d, y + 22, "Court dates|can change", "We check the court page", dx)
    elif key == "end":
        courthouse(d, SAFE_L + dx, 380, 180, GOLD, (0, 0, 0, 0))
        y = 640
        b = draw_text(d, (SAFE_L + dx, y), "Court dates and sources:", fit(d, "Court dates and sources:", F_XB, 72), WHITE, dx)
        f = fit(d, "cassiancreed.com", F_HEAD, 150)
        b = draw_text(d, (SAFE_L + dx, b[3] + 26), "cassiancreed.com", f, GOLD, dx)
        f2 = fit(d, "/post/barry-morphew-case-explained", F_SEMI, 48)
        b = draw_text(d, (SAFE_L + dx, b[3] + 24), "/post/barry-morphew-case-explained", f2, WHITE, dx)
        draw_text(d, (SAFE_L + dx, b[3] + 44), VERSION + " · Nov 3, 2026", font(F_MED, 30), GRAY, dx)
    return lay


def split_two(d, s, f, max_w, allow_orphan):
    w = s.split(" ")
    best = None
    for k in range(1, len(w)):
        a, b = " ".join(w[:k]), " ".join(w[k:])
        orphan = (k == 1 or k == len(w) - 1) and len(w) > 2
        if orphan and not allow_orphan:
            continue
        m = max(text_w(d, a, f), text_w(d, b, f))
        if m <= max_w and (best is None or m < best[0]):
            best = (m, [a, b])
    return best[1] if best else None


def caption(im, s):
    """Big caption, placed low (bottom edge at about y=1420), inside the safe zone."""
    d = ImageDraw.Draw(im, "RGBA")
    max_w = TEXT_W - 56
    ls, f = None, None
    for size in range(100, 84, -2):
        if text_w(d, s, font(F_XB, size)) <= max_w:
            ls, f = [s], font(F_XB, size)
            break
    if ls is None:
        for size in range(96, 78, -2):
            ls = split_two(d, s, font(F_XB, size), max_w, False)
            if ls:
                f = font(F_XB, size)
                break
    if ls is None:
        f = font(F_XB, 80)
        ls = split_two(d, s, f, max_w, True) or [s]
    lh = int(f.size * 1.18)
    box_h = len(ls) * lh + 44
    bottom = 1424
    top = bottom - box_h
    d.rounded_rectangle([SAFE_L - 8, top, SAFE_R, bottom], radius=26, fill=BOXBG, outline=(245, 184, 61, 140), width=3)
    cx = (SAFE_L - 8 + SAFE_R) // 2
    y = top + 20
    for ln in ls:
        w = text_w(d, ln, f)
        draw_text(d, (cx - w // 2, y), ln, f, WHITE)
        y += lh


NB = " "
# (anchor prefix of the first heard word, caption text in script spelling, card)
CHUNKS = [
    ("today", "Today at 12:30" + NB + "Pacific,", "hook"),
    ("the", "the Barry" + NB + "Morphew case", "hook"),
    ("is", "is back in court.", "hook"),
    ("first", "First, the victim:", "victim"),
    ("suz*", "Suzanne" + NB + "Morphew.", "victim"),
    ("she", "She was 49 when she went missing", "victim"),
    ("on", "on Mother's" + NB + "Day,", "victim"),
    ("may", "May 10, 2020.", "victim"),
    ("her", "Her remains were found in 2023.", "victim"),
    ("her", "Her husband, Barry" + NB + "Morphew,", "charge"),
    ("is", "is charged with first-degree murder", "charge"),
    ("in", "in her death.", "charge"),
    ("he", "He pleaded not guilty.", "charge"),
    ("by", "By law, he is presumed innocent.", "charge"),
    ("an", "An earlier case against him", "history"),
    ("was", "was dismissed in 2022.", "history"),
    ("today", "Today is a status conference,", "today"),
    ("held", "held by video.", "today"),
    ("it", "It is a check-in on the schedule.", "today"),
    ("it", "It is not a trial.", "today"),
    ("no", "No verdict can come from it.", "today"),
    ("news", "News reports say his trial", "next"),
    ("is", "is planned for summer 2027.", "next"),
    ("court", "Court dates and sources:", "end"),
    ("cass*", "cassiancreed.com", "end"),
]


def norm(w):
    return re.sub(r"[^a-z0-9']", "", w.lower())


def match_starts():
    idx, out = -1, []
    for anchor, _, _ in CHUNKS:
        j = idx + 1
        while j < len(WORDS) and not (norm(WORDS[j][0]).startswith(anchor[:-1]) if anchor.endswith("*") else norm(WORDS[j][0]) == anchor):
            j += 1
        if j >= len(WORDS):
            raise SystemExit("anchor not found: " + anchor)
        out.append(j)
        idx = j
    return out


def ffdur(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "default=nw=1:nk=1", path]))


SLIDE_FRAMES = 9  # 0.3 s slide-in when a new card appears


def main():
    dur = ffdur(AUDIO)
    wi = match_starts()
    starts = [0.0] + [max(0.0, WORDS[j][1] - 0.08) for j in wi[1:]]
    frames = []  # (png, seconds)
    safe_report, states = [], []
    prev_card = None
    n = 0
    for k, (anchor, text, ck) in enumerate(CHUNKS):
        s = starts[k]
        e = starts[k + 1] if k + 1 < len(CHUNKS) else dur
        states.append({"n": k, "word": wi[k], "start": round(s, 3), "end": round(e, 3), "card": ck, "caption": text})
        steps = []
        if ck != prev_card:
            for i in range(SLIDE_FRAMES):
                p = (i + 1) / SLIDE_FRAMES
                ease = 1 - (1 - p) ** 3
                steps.append((int(110 * (1 - ease)), ease, 1 / 30))
        rest = (e - s) - sum(x[2] for x in steps)
        steps.append((0, 1.0, max(rest, 1 / 30)))
        for dx, alpha, du in steps:
            TEXT_BOXES.clear()
            im = base().convert("RGBA")
            lay = card_layer(ck, dx)
            if alpha < 1:
                a = lay.getchannel("A").point(lambda v, al=alpha: int(v * al))
                lay.putalpha(a)
            im.alpha_composite(lay)
            im = im.convert("RGB")
            caption(im, text)
            pth = os.path.join(OUT, f"f_{n:03d}.png")
            im.save(pth)
            if dx == 0:
                for t, b in TEXT_BOXES:
                    ok = b[0] >= 0 and b[2] <= 918 and b[1] >= SAFE_TOP and b[3] <= 1536
                    nw = len([w for w in t.replace(NB, " ").split() if w != "·"])
                    safe_report.append({"state": k, "text": t, "bbox": b, "safe": ok, "words": nw})
            frames.append((pth, du))
            n += 1
        prev_card = ck
    with open(os.path.join(OUT, "concat.txt"), "w") as fh:
        for p, du in frames:
            fh.write(f"file '{p}'\nduration {du:.4f}\n")
        fh.write(f"file '{frames[-1][0]}'\n")
    cap_lines = [r for r in safe_report if r["text"] in {c[1] for c in CHUNKS}]
    json.dump({"states": states,
               "all_safe": all(r["safe"] for r in safe_report),
               "unsafe": [r for r in safe_report if not r["safe"]],
               "caption_max_words": max(r["words"] for r in cap_lines),
               "caption_lines_over_7_words": sorted({r["text"] for r in cap_lines if r["words"] > 7}),
               "frames": len(frames)},
              open(os.path.join(OUT, "layout-check.json"), "w"), indent=1)
    if os.environ.get("PNG_ONLY"):
        print("png only", len(frames)); return
    out = os.path.join(OUT, VERSION + ".mp4")
    fc = (f"[0:v]fps=30,format=yuv420p,setsar=1[bg];"
          f"color=c=0xF5B83D:s=1080x10:r=30[bar];"
          f"[bg][bar]overlay=x='-w+w*t/{dur:.3f}':y=240:eval=frame:shortest=1[v]")
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
           "-f", "concat", "-safe", "0", "-i", os.path.join(OUT, "concat.txt"),
           "-i", AUDIO, "-filter_complex", fc, "-map", "[v]", "-map", "1:a",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-profile:v", "high",
           "-pix_fmt", "yuv420p", "-r", "30", "-g", "60",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
           "-t", f"{dur:.3f}", "-movflags", "+faststart",
           "-map_metadata", "-1", "-metadata", f"title={VERSION}", out]
    subprocess.check_call(cmd)
    print(out, os.path.getsize(out), "audio", dur)


if __name__ == "__main__":
    main()
