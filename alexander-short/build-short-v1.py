#!/usr/bin/env python3
"""NEP Shorts builder: alexander-sentencing-short-v1.

Renders one PNG per screen state (card + caption chunk) with PIL, then
ffmpeg joins them on exact word times, adds a progress bar and the
mastered narration. 1080x1920, 30 fps, H.264 + AAC.

Usage: python3 build_short_v1.py <workdir>
  <workdir> must hold narration-final.wav and check-final.json.
"""
import json
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

VERSION = "alexander-sentencing-short-v1"
WORK = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
OUT = os.path.join(WORK, "build")
os.makedirs(OUT, exist_ok=True)
AUDIO = os.path.join(WORK, "narration-final.wav")
TIMES = json.load(open(os.path.join(WORK, "check-final.json")))
WORDS = TIMES["words"]

W, H = 1080, 1920
# Safe zone: no text in bottom 20% (y > 1536) or right 15% (x > 918).
SAFE_L, SAFE_R = 72, 900
SAFE_TOP, SAFE_BOT = 250, 1500
TEXT_W = SAFE_R - SAFE_L

BG = (11, 18, 32)
BG2 = (18, 28, 46)
GOLD = (245, 184, 61)
WHITE = (255, 255, 255)
GRAY = (188, 198, 212)
BOXBG = (0, 0, 0, 215)

FD = "/usr/share/fonts/opentype/inter/"
F_BLACK = FD + "InterDisplay-Black.otf"
F_XB = FD + "InterDisplay-ExtraBold.otf"
F_BOLD = FD + "InterDisplay-Bold.otf"
F_SEMI = FD + "InterDisplay-SemiBold.otf"
F_MED = FD + "Inter-Medium.otf"

_cache = {}


def font(path, size):
    key = (path, size)
    if key not in _cache:
        _cache[key] = ImageFont.truetype(path, size)
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
    words, lines, cur = s.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if text_w(d, t, f) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


TEXT_BOXES = []  # every text bbox drawn, for the safe-zone check


def draw_text(d, xy, s, f, fill):
    d.text(xy, s, font=f, fill=fill)
    b = d.textbbox(xy, s, font=f)
    TEXT_BOXES.append((s, b))
    return b


def base():
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    # simple shapes only: a soft band and a large circle, no images
    d.rectangle([0, 1560, W, H], fill=BG2)
    d.ellipse([620, 1180, 1500, 2060], fill=(15, 24, 40))
    # top label (date anchors "today")
    f = font(F_BOLD, 36)
    draw_text(d, (SAFE_L, 270), "COURT CALENDAR  ·  TUE OCT 27, 2026", f, GOLD)
    # persistent AI-voice disclosure, inside the safe zone, from second 0
    draw_text(d, (SAFE_L, 1446), "AI voice clone of Cassian Creed", font(F_SEMI, 34), GRAY)
    return im, d


def label(d, y, s):
    d.rectangle([SAFE_L, y + 4, SAFE_L + 10, y + 46], fill=GOLD)
    draw_text(d, (SAFE_L + 26, y), s, font(F_BOLD, 42), GOLD)
    return y + 78


def lines(d, y, s, path, size, fill, gap=10, max_w=TEXT_W):
    f = font(path, size)
    for ln in wrap(d, s, f, max_w):
        b = draw_text(d, (SAFE_L, y), ln, f, fill)
        y = b[3] + gap
    return y


def card(d, key):
    y = 350
    if key == "hook":
        f = fit(d, "SENTENCING", F_BLACK, 170)
        b = draw_text(d, (SAFE_L - 4, y), "SENTENCING", f, WHITE)
        b = draw_text(d, (SAFE_L - 4, b[3] + 14), "TODAY", f, GOLD)
        y = b[3] + 44
        b = draw_text(d, (SAFE_L, y), "Oren, Tal and Alon Alexander", fit(d, "Oren, Tal and Alon Alexander", F_XB, 62), WHITE)
        y = b[3] + 10
        y = lines(d, y + 8, "10 a.m. ET · Manhattan federal court", F_SEMI, 46, GRAY)
        y = lines(d, y + 22, "Prosecutors ask: life.", F_BOLD, 48, GOLD)
        y = lines(d, y, "Defense asks: 15 years.", F_BOLD, 48, GOLD)
    elif key == "judge":
        y = label(d, y, "THE JUDGE")
        y = lines(d, y, "Valerie Caproni", F_BLACK, 104, WHITE)
        y = lines(d, y + 14, "U.S. District Judge, S.D.N.Y.", F_SEMI, 48, GRAY)
        y = lines(d, y + 4, "Courtroom 26A · 500 Pearl St.", F_SEMI, 48, GRAY)
    elif key == "verdict":
        y = label(d, y, "THE VERDICT")
        y = lines(d, y, "March 9, 2026", F_BLACK, 104, WHITE)
        y = lines(d, y + 14, "A federal jury found the three brothers guilty", F_XB, 56, WHITE)
        y = lines(d, y + 10, "Sex-trafficking case", F_SEMI, 46, GRAY)
        y = lines(d, y + 2, "Counts differ for each brother", F_SEMI, 46, GRAY)
    elif key in ("asks1", "asks2"):
        y = label(d, y, "WHAT EACH SIDE ASKS")
        y = side_box(d, y, "PROSECUTORS ASK", "LIFE", "in prison", "Per AP and The Real Deal")
        if key == "asks2":
            side_box(d, y + 30, "DEFENSE ASKS", "15 YEARS", "the minimum", "Per CNN and The Real Deal")
    elif key in ("watch1", "watch2"):
        y = label(d, y, "WHAT TO WATCH")
        y = item(d, y, "About 11 women are expected to speak", "Per The Real Deal")
        if key == "watch2":
            item(d, y + 30, "The hearing could run into a second day", "Per CNN")
    elif key == "end":
        y = 380
        f = fit(d, "cassiancreed.com", F_BLACK, 112)
        b = draw_text(d, (SAFE_L, y), "Court Calendar ·", f, WHITE)
        b = draw_text(d, (SAFE_L, b[3] + 18), "cassiancreed.com", f, GOLD)
        y = b[3] + 50
        y = lines(d, y, "Dates and status for each case", F_SEMI, 46, GRAY)
        lines(d, y + 26, VERSION + " · Oct 27, 2026", F_MED, 30, GRAY)


def side_box(d, y, who, big, small, src):
    top = y
    d.rounded_rectangle([SAFE_L, top, SAFE_R, top + 256], radius=22, fill=BG2, outline=(40, 54, 80), width=3)
    draw_text(d, (SAFE_L + 32, top + 22), who, font(F_BOLD, 40), GOLD)
    b = draw_text(d, (SAFE_L + 32, top + 70), big, font(F_BLACK, 104), WHITE)
    fs = font(F_SEMI, 44)
    sb = d.textbbox((0, 0), small, font=fs)
    draw_text(d, (b[2] + 24, b[3] - (sb[3] - sb[1]) - sb[1]), small, fs, GRAY)
    draw_text(d, (SAFE_L + 32, top + 196), src, font(F_MED, 38), GRAY)
    return top + 256


def item(d, y, s, src):
    f = font(F_XB, 64)
    ls = wrap(d, s, f, TEXT_W - 64)
    h = 40 + len(ls) * 80 + 60
    d.rounded_rectangle([SAFE_L, y, SAFE_R, y + h], radius=22, fill=BG2, outline=(40, 54, 80), width=3)
    yy = y + 26
    for ln in ls:
        b = draw_text(d, (SAFE_L + 32, yy), ln, f, WHITE)
        yy = b[3] + 14
    draw_text(d, (SAFE_L + 32, yy + 8), src, font(F_MED, 34), GRAY)
    return y + h


def split_two(d, s, f, max_w, allow_orphan):
    """Best two-line split on plain spaces (non-breaking spaces hold)."""
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
    for size in range(84, 70, -2):  # one line if it fits at a big size
        if text_w(d, s, font(F_XB, size)) <= max_w:
            ls, f = [s], font(F_XB, size)
            break
    if ls is None:
        for size in range(82, 68, -2):  # two even lines, no one-word orphan
            ls = split_two(d, s, font(F_XB, size), max_w, False)
            if ls:
                f = font(F_XB, size)
                break
    if ls is None:
        f = font(F_XB, 80)
        ls = split_two(d, s, f, max_w, True)
    lh = int(f.size * 1.2)
    box_h = len(ls) * lh + 44
    top = 1150
    d.rounded_rectangle([SAFE_L - 8, top, SAFE_R, top + box_h], radius=24, fill=BOXBG)
    cx = (SAFE_L - 8 + SAFE_R) // 2
    y = top + 22
    for ln in ls:
        w = text_w(d, ln, f)
        draw_text(d, (cx - w // 2, y), ln, f, WHITE)
        y += lh


# (first word index, caption text) — script spelling, heard-word timing
CHUNKS = [
    (0, "Today at 10\u00a0a.m. Eastern,"),
    (6, "a federal judge is set"),
    (11, "to sentence brothers"),
    (14, "Oren, Tal and Alon Alexander."),
    (19, "Judge Valerie Caproni"),
    (22, "will decide in Manhattan"),
    (26, "federal court."),
    (28, "On March 9,"),
    (31, "a federal jury found"),
    (35, "the three brothers guilty"),
    (39, "in a sex-trafficking case."),
    (44, "Prosecutors ask for"),
    (47, "life in prison,"),
    (50, "the Associated Press"),
    (53, "and The\u00a0Real\u00a0Deal report."),
    (58, "The defense asks for"),
    (62, "15 years,"),
    (64, "the minimum,"),
    (66, "CNN and The\u00a0Real\u00a0Deal report."),
    (72, "What to watch:"),
    (75, "about 11 women"),
    (78, "are expected to speak,"),
    (82, "The\u00a0Real\u00a0Deal reports."),
    (86, "And CNN reports"),
    (89, "the hearing could run"),
    (93, "into a second day."),
    (97, "I'm Cassian Creed."),
    (100, "Court Calendar at cassiancreed.com"),
]
# card changes at these word indexes
CARDS = [(0, "hook"), (19, "judge"), (28, "verdict"), (44, "asks1"), (58, "asks2"),
         (72, "watch1"), (86, "watch2"), (97, "end")]


def ffdur(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "default=nw=1:nk=1", path])
    return float(out)


def main():
    dur = ffdur(AUDIO)
    starts = [0.0 if i == 0 else WORDS[i][1] for i, _ in CHUNKS]
    # captions change a hair before the word lands (reads in sync)
    starts = [max(0.0, s - 0.08) if k else 0.0 for k, s in enumerate(starts)]
    card_at = {}
    ci = 0
    states = []
    for k, (wi, text) in enumerate(CHUNKS):
        while ci + 1 < len(CARDS) and CARDS[ci + 1][0] <= wi:
            ci += 1
        end = starts[k + 1] if k + 1 < len(CHUNKS) else dur
        states.append((starts[k], end, CARDS[ci][1], text))
    lst = []
    safe_report = []
    for n, (s, e, ck, text) in enumerate(states):
        TEXT_BOXES.clear()
        im, d = base()
        card(d, ck)
        caption(im, text)
        p = os.path.join(OUT, f"state_{n:02d}.png")
        im.save(p)
        for t, b in TEXT_BOXES:
            ok = b[0] >= 0 and b[2] <= 918 and b[1] >= SAFE_TOP and b[3] <= 1536
            nw = len([w for w in t.split() if w != "·"])
            safe_report.append({"state": n, "text": t, "bbox": b, "safe": ok, "words": nw})
        lst.append((p, e - s))
    with open(os.path.join(OUT, "concat.txt"), "w") as fh:
        for p, du in lst:
            fh.write(f"file '{p}'\nduration {du:.3f}\n")
        fh.write(f"file '{lst[-1][0]}'\n")
    json.dump({"states": [{"n": n, "start": round(s, 3), "end": round(e, 3), "card": c, "caption": t}
                          for n, (s, e, c, t) in enumerate(states)],
               "safe": safe_report,
               "all_safe": all(r["safe"] for r in safe_report),
               "max_words_per_line": max(r["words"] for r in safe_report),
               "lines_over_7_words": sorted({r["text"] for r in safe_report if r["words"] > 7})},
              open(os.path.join(OUT, "layout-check.json"), "w"), indent=1)
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
