#!/usr/bin/env python3
"""NEP Shorts builder: morphew-status-short-v2 (NEP kit colors, 2 fonts).

v2 vs v1 (cold check REDO, Nov 1 2026):
- Hook: full-width Ember block "TODAY / 12:30 P.M. PACIFIC" (charcoal text),
  "Barry Morphew case" as the clear second line, built in 3 steps
  (0.0 / 0.45 / 0.85 s). Frame 0.0 s is fully drawn (no fade-in).
- Kit colors: warm charcoal ground, ink + stone for court process,
  amber only on the victim card, Ember only for today/time/link/progress.
- Two fonts only: Barlow Condensed + Source Serif 4.
- Victim card, charge rows and other cards reveal line by line with the voice.
- Same audio as v1 (narration-final.wav + check-final.json word times).

Usage: python3 build-short-v2.py <workdir>
"""
import json
import os
import re
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

VERSION = "morphew-status-short-v2"
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
OUT = os.path.join(WORK, "build")
os.makedirs(OUT, exist_ok=True)
AUDIO = os.path.join(WORK, "narration-final.wav")
WORDS = json.load(open(os.path.join(WORK, "check-final.json")))["words"]

W, H = 1080, 1920
SAFE_L, SAFE_R = 72, 900
SAFE_TOP, SAFE_BOT = 250, 1500
TEXT_W = SAFE_R - SAFE_L

# NEP kit (GRAPHIC Adviser 2.0, Part B)
GROUND = (20, 17, 15)        # #14110F warm charcoal
CARD = (34, 29, 26)
CARD_LINE = (60, 53, 48)
INK = (244, 239, 232)        # #F4EFE8
STONE = (184, 177, 168)      # #B8B1A8
AMBER = (217, 164, 65)       # #D9A441 victims only
AMBER_BG = (43, 33, 20)
EMBER = (224, 86, 59)        # #E0563B today/time/links; never on a person
CHAR = GROUND                # charcoal text on Ember (4.98:1)

KD = os.path.join(HERE, "fonts") + "/"
F_XB = KD + "BarlowCondensed-ExtraBold.ttf"
F_B = KD + "BarlowCondensed-Bold.ttf"
F_SB = KD + "BarlowCondensed-SemiBold.ttf"
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


def serif(size):
    return font(F_SERIF, size, "Bold")


def text_w(d, s, f):
    b = d.textbbox((0, 0), s, font=f)
    return b[2] - b[0]


def fit(d, s, path, max_size, max_w=TEXT_W):
    size = max_size
    while size > 20 and text_w(d, s, font(path, size)) > max_w:
        size -= 2
    return font(path, size)


TEXT_BOXES = []
VICTIM_BOTTOM = [0]


def draw_text(d, xy, s, f, fill, dx=0):
    d.text(xy, s, font=f, fill=fill)
    b = d.textbbox(xy, s, font=f)
    TEXT_BOXES.append((s, (b[0] - dx, b[1], b[2] - dx, b[3])))
    return b


def courthouse(d, x, y, w, fill, bg):
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
        im = Image.new("RGB", (W, H), GROUND)
        d = ImageDraw.Draw(im)
        for yy in range(0, H, 6):
            t = yy / H
            c = tuple(int(GROUND[i] * (1 - t) + (12, 10, 9)[i] * t) for i in range(3))
            d.rectangle([0, yy, W, yy + 6], fill=c)
        courthouse(d, 190, 1600, 700, (40, 35, 31), (16, 13, 11))
        d.rectangle([0, 1528, W, 1531], fill=(52, 45, 40))
        _BASE = im
    im = _BASE.copy()
    d = ImageDraw.Draw(im)
    draw_text(d, (SAFE_L, 262), "COURT CALENDAR  ·  TUE NOV 3, 2026", font(F_B, 46), STONE)
    draw_text(d, (SAFE_L, 1446), "Narrated with an AI voice", font(F_SB, 42), STONE)
    return im


def label(d, y, s, dx, color=INK, bar=STONE):
    d.rectangle([SAFE_L + dx, y + 8, SAFE_L + dx + 12, y + 60], fill=bar)
    draw_text(d, (SAFE_L + dx + 30, y - 2), s, font(F_XB, 66), color, dx)
    return y + 100


def row(d, y, lines, src, dx, show=True, size=66, bar=STONE):
    """A process row: stone bar, ink text, stone source. Returns bottom y."""
    f = font(F_B, size)
    lh = int(size * 1.12)
    h = 30 + len(lines) * lh + (54 if src else 16)
    if show:
        d.rounded_rectangle([SAFE_L + dx, y, SAFE_R + dx, y + h], radius=20, fill=CARD, outline=CARD_LINE, width=2)
        d.rectangle([SAFE_L + dx + 24, y + 26, SAFE_L + dx + 34, y + h - 26], fill=bar)
        yy = y + 22
        for ln in lines:
            draw_text(d, (SAFE_L + dx + 58, yy), ln, f, INK, dx)
            yy += lh
        if src:
            draw_text(d, (SAFE_L + dx + 58, yy + 4), src, font(F_SB, 40), STONE, dx)
    return y + h


def card_layer(key, step, dx):
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    if key == "hook":
        # full-width Ember block (shape spans the frame; text stays in the safe box)
        top, bot = 330, 720
        d.rectangle([0, top, W, bot], fill=EMBER)
        draw_text(d, (SAFE_L - 6, top + 6), "TODAY", font(F_XB, 236), CHAR, dx)
        if step >= 1:
            draw_text(d, (SAFE_L - 2, top + 250), "12:30 P.M. PACIFIC", fit(d, "12:30 P.M. PACIFIC", F_XB, 128), CHAR, dx)
        if step >= 2:
            f = font(F_XB, 128)
            b = draw_text(d, (SAFE_L - 4, bot + 36), "Barry Morphew case", fit(d, "Barry Morphew case", F_XB, 128), INK, dx)
            b = draw_text(d, (SAFE_L - 2, b[3] + 22), "is back in court", fit(d, "is back in court", F_XB, 92), INK, dx)
            draw_text(d, (SAFE_L, b[3] + 30), "Status conference, by video · Alamosa, Colo.", fit(d, "Status conference, by video · Alamosa, Colo.", F_SB, 46), STONE, dx)
    elif key == "victim":
        y = label(d, 360, "FIRST, THE VICTIM", dx, AMBER, AMBER)
        top = y
        x = SAFE_L + dx + 66
        # layout first (fixed card size for every reveal step)
        f_name = serif(100)
        f_line = fit(d, "Went missing on Mother's Day,", F_B, 60, TEXT_W - 110)
        f_amb = fit(d, "Her remains were found in 2023", F_B, 56, TEXT_W - 110)
        f_src = font(F_SB, 40)
        y1 = top + 34
        y2 = d.textbbox((x, y1), "Suzanne", font=f_name)[3] + 10
        y3 = d.textbbox((x, y2), "Morphew, 49", font=f_name)[3] + 36
        y4 = d.textbbox((x, y3), "Went missing on Mother's Day,", font=f_line)[3] + 12
        y5 = d.textbbox((x, y4), "May 10, 2020", font=f_line)[3] + 30
        y6 = d.textbbox((x, y5), "Her remains were found in 2023", font=f_amb)[3] + 16
        bot = d.textbbox((x, y6), "Per CPR and Denver7", font=f_src)[3] + 32
        d.rounded_rectangle([SAFE_L + dx, top, SAFE_R + dx, bot], radius=26, fill=AMBER_BG, outline=AMBER, width=4)
        d.rectangle([SAFE_L + dx + 26, top + 34, SAFE_L + dx + 38, bot - 34], fill=AMBER)
        cx = SAFE_R + dx - 64
        d.ellipse([cx - 14, top + 40, cx + 14, top + 90], fill=AMBER)
        d.ellipse([cx - 6, top + 58, cx + 6, top + 86], fill=(250, 226, 180))
        d.rounded_rectangle([cx - 22, top + 98, cx + 22, top + 210], radius=8, fill=INK)
        draw_text(d, (x, y1), "Suzanne", f_name, INK, dx)
        draw_text(d, (x, y2), "Morphew, 49", f_name, INK, dx)
        if step >= 1:
            draw_text(d, (x, y3), "Went missing on Mother's Day,", f_line, INK, dx)
        if step >= 2:
            draw_text(d, (x, y4), "May 10, 2020", f_line, INK, dx)
        if step >= 3:
            draw_text(d, (x, y5), "Her remains were found in 2023", f_amb, AMBER, dx)
            draw_text(d, (x, y6), "Per CPR and Denver7", f_src, STONE, dx)
        VICTIM_BOTTOM[0] = bot
    elif key == "charge":
        y = label(d, 360, "THE CHARGE", dx)
        b = draw_text(d, (SAFE_L + dx, y - 8), "Barry Morphew, her husband:", fit(d, "Barry Morphew, her husband:", F_B, 64), INK, dx)
        y = b[3] + 28
        y = row(d, y, ["Charged with", "first-degree murder"], "An accusation, not a finding", dx, step >= 1)
        y = row(d, y + 18, ["Pleaded not guilty"], "Jan. 12, 2026 · Per KOAA", dx, step >= 2)
        row(d, y + 18, ["Presumed innocent"], None, dx, step >= 3)
    elif key == "history":
        y = label(d, 360, "HOW WE GOT HERE", dx)
        y = row(d, y, ["First case dismissed", "April 2022, before trial"], "Per the Denver Gazette", dx)
        row(d, y + 22, ["New case: grand jury", "indictment, June 2025"], "Per Colorado Judicial Branch", dx, step >= 1)
    elif key == "today":
        y = label(d, 360, "WHAT TODAY IS", dx)
        y = row(d, y, ["Status conference, by video"], "Per Colorado Judicial Branch", dx, size=58)
        y += 30
        if step >= 1:
            draw_text(d, (SAFE_L - 4 + dx, y), "A CHECK-IN,", font(F_XB, 140), INK, dx)
        y += 150
        if step >= 2:
            draw_text(d, (SAFE_L - 4 + dx, y), "NOT A TRIAL", font(F_XB, 140), INK, dx)
        y += 172
        row(d, y, ["No verdict can come from it"], None, dx, step >= 3, size=58)
    elif key == "next":
        y = label(d, 360, "WHAT COMES NEXT", dx)
        y = row(d, y, ["Jury trial reported", "for summer 2027"], "Per Denver7, July 6, 2026", dx)
        row(d, y + 22, ["Court dates", "can change"], "We check the court page", dx, step >= 1)
    elif key == "end":
        courthouse(d, SAFE_L + dx, 390, 170, STONE, (0, 0, 0, 0))
        y = 640
        b = draw_text(d, (SAFE_L + dx, y), "Court dates and sources:", fit(d, "Court dates and sources:", F_XB, 92), INK, dx)
        b = draw_text(d, (SAFE_L + dx - 4, b[3] + 26), "cassiancreed.com", fit(d, "cassiancreed.com", F_XB, 160), EMBER, dx)
        b = draw_text(d, (SAFE_L + dx, b[3] + 26), "/post/barry-morphew-case-explained", fit(d, "/post/barry-morphew-case-explained", F_SB, 60), INK, dx)
        draw_text(d, (SAFE_L + dx, b[3] + 44), VERSION + " · Nov 3, 2026", font(F_SB, 38), STONE, dx)
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
    d = ImageDraw.Draw(im, "RGBA")
    max_w = TEXT_W - 56
    ls, f = None, None
    for size in range(116, 98, -2):
        if text_w(d, s, font(F_XB, size)) <= max_w:
            ls, f = [s], font(F_XB, size)
            break
    if ls is None:
        for size in range(108, 88, -2):
            ls = split_two(d, s, font(F_XB, size), max_w, False)
            if ls:
                f = font(F_XB, size)
                break
    if ls is None:
        f = font(F_XB, 92)
        ls = split_two(d, s, f, max_w, True) or [s]
    lh = int(f.size * 1.08)
    box_h = len(ls) * lh + 40
    bottom = 1416
    top = bottom - box_h
    d.rounded_rectangle([SAFE_L - 8, top, SAFE_R, bottom], radius=24, fill=(8, 6, 5, 232), outline=(184, 177, 168, 110), width=2)
    cx = (SAFE_L - 8 + SAFE_R) // 2
    y = top + 14
    for ln in ls:
        w = text_w(d, ln, f)
        draw_text(d, (cx - w // 2, y), ln, f, INK)
        y += lh


NB = " "
# (anchor, caption, card, reveal step)
CHUNKS = [
    ("today", "Today at 12:30" + NB + "Pacific,", "hook", 0),
    ("the", "the Barry" + NB + "Morphew case", "hook", 2),
    ("is", "is back in court.", "hook", 2),
    ("first", "First, the victim:", "victim", 0),
    ("suz*", "Suzanne" + NB + "Morphew.", "victim", 0),
    ("she", "She was 49 when she went missing", "victim", 1),
    ("on", "on Mother's" + NB + "Day,", "victim", 1),
    ("may", "May 10, 2020.", "victim", 2),
    ("her", "Her remains were found in 2023.", "victim", 3),
    ("her", "Her husband, Barry" + NB + "Morphew,", "charge", 0),
    ("is", "is charged with first-degree murder", "charge", 1),
    ("in", "in her death.", "charge", 1),
    ("he", "He pleaded not guilty.", "charge", 2),
    ("by", "By law, he is presumed innocent.", "charge", 3),
    ("an", "An earlier case against him", "history", 0),
    ("was", "was dismissed in 2022.", "history", 1),
    ("today", "Today is a status conference,", "today", 0),
    ("held", "held by video.", "today", 0),
    ("it", "It is a check-in on the schedule.", "today", 1),
    ("it", "It is not a trial.", "today", 2),
    ("no", "No verdict can come from it.", "today", 3),
    ("news", "News reports say his trial", "next", 0),
    ("is", "is planned for summer 2027.", "next", 1),
    ("court", "Court dates and sources:", "end", 0),
    ("cass*", "cassiancreed.com", "end", 0),
]
HOOK_STEPS = [(0.45, 1), (0.85, 2)]  # hook builds in 3 steps by 0.85 s


def norm(w):
    return re.sub(r"[^a-z0-9']", "", w.lower())


def match_starts():
    idx, out = -1, []
    for anchor, _, _, _ in CHUNKS:
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


def render(card, step, cap, dx=0, alpha=1.0, record=False):
    TEXT_BOXES.clear()
    im = base().convert("RGBA")
    lay = card_layer(card, step, dx)
    if alpha < 1:
        lay.putalpha(lay.getchannel("A").point(lambda v, al=alpha: int(v * al)))
    im.alpha_composite(lay)
    im = im.convert("RGB")
    caption(im, cap)
    return im, list(TEXT_BOXES)


SLIDE = 9   # 0.3 s slide-in for a new card
FADE = 5    # 0.17 s fade-in for a revealed line


def main():
    dur = ffdur(AUDIO)
    wi = match_starts()
    ev = []  # (start, card, step, caption)
    for k, (a, cap, card, step) in enumerate(CHUNKS):
        s = 0.0 if k == 0 else max(0.0, WORDS[wi[k]][1] - 0.08)
        ev.append((s, card, step, cap))
    for t, st in HOOK_STEPS:
        ev.append((t, "hook", st, CHUNKS[0][1]))
    ev.sort(key=lambda e: e[0])
    frames, safe, states = [], [], []
    prev = None
    n = 0

    def save(im, du):
        nonlocal n
        p = os.path.join(OUT, f"f_{n:03d}.png")
        im.save(p)
        frames.append((p, du))
        n += 1

    for k, (s, card, step, cap) in enumerate(ev):
        e = ev[k + 1][0] if k + 1 < len(ev) else dur
        states.append({"n": k, "start": round(s, 3), "end": round(e, 3), "card": card, "step": step, "caption": cap})
        used = 0.0
        if prev is not None and card != prev[0]:
            for i in range(SLIDE):
                p = (i + 1) / SLIDE
                ease = 1 - (1 - p) ** 3
                im, _ = render(card, step, cap, int(110 * (1 - ease)), ease)
                save(im, 1 / 30)
                used += 1 / 30
        elif prev is not None and step != prev[1]:
            a, _ = render(card, prev[1], cap)
            b, _ = render(card, step, cap)
            for i in range(FADE):
                save(Image.blend(a, b, (i + 1) / FADE), 1 / 30)
                used += 1 / 30
        im, boxes = render(card, step, cap)
        for t, bb in boxes:
            ok = bb[0] >= 60 and bb[2] <= 960 and bb[1] >= 220 and bb[3] <= 1560
            nw = len([w for w in t.replace(NB, " ").split() if w != "·"])
            safe.append({"state": k, "text": t, "bbox": bb, "safe": ok, "words": nw})
        save(im, max(e - s - used, 1 / 30))
        prev = (card, step)
    with open(os.path.join(OUT, "concat.txt"), "w") as fh:
        for p, du in frames:
            fh.write(f"file '{p}'\nduration {du:.4f}\n")
        fh.write(f"file '{frames[-1][0]}'\n")
    caps = {c[1] for c in CHUNKS}
    cap_lines = [r for r in safe if r["text"] in caps]
    json.dump({"version": VERSION, "states": states,
               "all_safe": all(r["safe"] for r in safe),
               "safe_box": "x 60-960, y 220-1560",
               "unsafe": [r for r in safe if not r["safe"]],
               "caption_max_words": max(r["words"] for r in cap_lines),
               "caption_lines_over_7_words": sorted({r["text"] for r in cap_lines if r["words"] > 7}),
               "frames": len(frames), "fonts": ["Barlow Condensed", "Source Serif 4"],
               "cover_time_s": 1.0, "victim_card_bottom": VICTIM_BOTTOM[0]},
              open(os.path.join(OUT, "layout-check.json"), "w"), indent=1)
    if os.environ.get("PNG_ONLY"):
        print("png only", len(frames)); return
    out = os.path.join(OUT, VERSION + ".mp4")
    fc = (f"[0:v]fps=30,format=yuv420p,setsar=1[bg];"
          f"color=c=0xE0563B:s=1080x10:r=30[bar];"
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
