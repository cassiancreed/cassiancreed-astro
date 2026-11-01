#!/usr/bin/env python3
"""NEP Shorts builder: vallow-appeal-short-v1 (from alexander-sentencing-short-v1 builder).

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

VERSION = "vallow-appeal-short-v1"
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

BG = (24, 29, 38)
BG2 = (34, 41, 53)
SLATE = (40, 48, 62)
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


def courthouse(d, x, y, w, fill, bg):
    """Generic courthouse drawn from plain shapes (no real building)."""
    h_ped = int(w * 0.22)
    d.polygon([(x, y + h_ped), (x + w // 2, y), (x + w, y + h_ped)], fill=fill)
    d.polygon([(x + w * 0.16, y + h_ped - 6), (x + w // 2, y + int(h_ped * 0.30)), (x + w * 0.84, y + h_ped - 6)], fill=bg)
    ey = y + h_ped + 6
    d.rectangle([x + 6, ey, x + w - 6, ey + int(w * 0.06)], fill=fill)
    cy = ey + int(w * 0.06) + 8
    ch = int(w * 0.42)
    n = 6
    cw = max(4, int(w * 0.075))
    gap = (w - 24 - n * cw) / (n - 1)
    for i in range(n):
        cx = int(x + 12 + i * (cw + gap))
        d.rectangle([cx, cy, cx + cw, cy + ch], fill=fill)
    by = cy + ch + 6
    for k in range(3):
        d.rectangle([x - k * 10, by + k * int(w * 0.045), x + w + k * 10, by + (k + 1) * int(w * 0.045) - 4], fill=fill)
    return by + 3 * int(w * 0.045)


def base():
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    # soft vertical slate gradient
    for yy in range(0, H, 8):
        t = yy / H
        c = tuple(int(BG[i] * (1 - t) + (16, 20, 27)[i] * t) for i in range(3))
        d.rectangle([0, yy, W, yy + 8], fill=c)
    # faint generic courthouse in the lower band (art only, no text)
    courthouse(d, 140, 1585, 800, (36, 44, 57), (22, 26, 34))
    # top label (date anchors "today")
    f = font(F_BOLD, 36)
    draw_text(d, (SAFE_L, 270), "COURT CALENDAR  ·  MON NOV 2, 2026", f, GOLD)
    # persistent AI-voice disclosure, inside the safe zone, from second 0
    draw_text(d, (SAFE_L, 1446), "Narrated with an AI voice", font(F_SEMI, 34), GRAY)
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
        courthouse(d, 690, 360, 210, GOLD, BG)
        b = draw_text(d, (SAFE_L - 4, y), "TODAY", font(F_BLACK, 168), GOLD)
        f = fit(d, "10:15 A.M. PACIFIC", F_BLACK, 104)
        b = draw_text(d, (SAFE_L - 2, b[3] + 26), "10:15 A.M. PACIFIC", f, WHITE)
        t1, t2 = "The Idaho Supreme Court hears", "Lori Vallow Daybell's appeal."
        f2 = font(F_XB, min(fit(d, t1, F_XB, 62).size, fit(d, t2, F_XB, 62).size))
        b = draw_text(d, (SAFE_L, b[3] + 40), t1, f2, WHITE)
        b = draw_text(d, (SAFE_L, b[3] + 14), t2, f2, WHITE)
        y = b[3] + 10
        y = lines(d, y + 18, "11:15 a.m. MT · Boise, Idaho", F_SEMI, 46, GRAY)
        y = lines(d, y + 10, "A review, not a new trial", F_BOLD, 50, GOLD)
    elif key == "victims":
        y = label(d, y, "FIRST, THE VICTIMS")
        for name in ("Her son, 7", "Her daughter, 16", "Tammy Daybell, 49"):
            d.rounded_rectangle([SAFE_L, y, SAFE_R, y + 150], radius=22, fill=BG2, outline=SLATE, width=3)
            d.rectangle([SAFE_L + 30, y + 40, SAFE_L + 40, y + 110], fill=GOLD)
            draw_text(d, (SAFE_L + 70, y + 36), name, font(F_BLACK, 76), WHITE)
            y += 176
    elif key == "verdict":
        y = label(d, y, "THE 2023 VERDICT")
        y = lines(d, y, "A jury convicted her of:", F_XB, 58, WHITE)
        y = box2(d, y + 16, "First-degree murder", "Deaths of her son and daughter")
        y = box2(d, y + 20, "Conspiring to murder", "Tammy Daybell, 49")
        y = lines(d, y + 26, "Sentence: life without parole", F_BOLD, 52, GOLD)
        lines(d, y + 2, "Per KSL.com, 2023", F_MED, 34, GRAY)
    elif key == "today":
        y = label(d, y, "WHAT TODAY IS")
        b = draw_text(d, (SAFE_L - 4, y), "A REVIEW,", fit(d, "NOT A NEW TRIAL", F_BLACK, 120), WHITE)
        b = draw_text(d, (SAFE_L - 4, b[3] + 16), "NOT A NEW TRIAL", fit(d, "NOT A NEW TRIAL", F_BLACK, 120), GOLD)
        y = b[3] + 44
        y = item(d, y, "No witnesses testify", "Justices hear the lawyers", 56)
        item(d, y + 22, "Each side gets 30 minutes", "Per EastIdahoNews", 56)
    elif key in ("sides1", "sides2"):
        y = label(d, y, "WHAT EACH SIDE SAYS")
        b = draw_text(d, (SAFE_L, y - 18), "Per their court briefs, via EastIdahoNews", font(F_MED, 34), GRAY)
        y = b[3] + 18
        y = say_box(d, y, "HER LAWYERS SAY", ["The judge wrongly removed", "the lawyer she hired.", "She was denied", "a speedy trial."])
        if key == "sides2":
            say_box(d, y + 20, "THE STATE SAYS", ["Her convictions should stand.", "No error big enough", "to undo the verdict."])
    elif key == "next":
        y = label(d, y, "WHAT COMES NEXT")
        y = item(d, y, "The justices rule later,|in writing", "No decision date announced")
        y = item(d, y + 22, "Until then,|her convictions stand", "While the appeal is pending")
    elif key == "end":
        courthouse(d, SAFE_L, 360, 180, GOLD, BG)
        y = 640
        b = draw_text(d, (SAFE_L, y), "Court dates and sources:", fit(d, "Court dates and sources:", F_BLACK, 76), WHITE)
        y = b[3] + 10
        f = fit(d, "cassiancreed.com", F_BLACK, 104)
        b = draw_text(d, (SAFE_L, y + 14), "cassiancreed.com", f, GOLD)
        b = draw_text(d, (SAFE_L, b[3] + 16), "/court-calendar", f, GOLD)
        lines(d, b[3] + 44, VERSION + " · Nov 2, 2026", F_MED, 30, GRAY)


def say_box(d, y, who, ls):
    top = y
    h = 80 + len(ls) * 62 + 18
    d.rounded_rectangle([SAFE_L, top, SAFE_R, top + h], radius=22, fill=BG2, outline=SLATE, width=3)
    draw_text(d, (SAFE_L + 32, top + 24), who, font(F_BOLD, 40), GOLD)
    yy = top + 80
    for ln in ls:
        b = draw_text(d, (SAFE_L + 32, yy), ln, font(F_XB, 50), WHITE)
        yy += 62
    return top + h


def side_box(d, y, who, big, small, src):
    top = y
    d.rounded_rectangle([SAFE_L, top, SAFE_R, top + 256], radius=22, fill=BG2, outline=SLATE, width=3)
    draw_text(d, (SAFE_L + 32, top + 22), who, font(F_BOLD, 40), GOLD)
    b = draw_text(d, (SAFE_L + 32, top + 70), big, font(F_BLACK, 104), WHITE)
    fs = font(F_SEMI, 44)
    sb = d.textbbox((0, 0), small, font=fs)
    draw_text(d, (b[2] + 24, b[3] - (sb[3] - sb[1]) - sb[1]), small, fs, GRAY)
    draw_text(d, (SAFE_L + 32, top + 196), src, font(F_MED, 38), GRAY)
    return top + 256


def item(d, y, s, src, size=64):
    f = font(F_XB, size)
    ls = s.split("|") if "|" in s else wrap(d, s, f, TEXT_W - 64)
    lh = int(size * 1.25)
    h = 40 + len(ls) * lh + 60
    d.rounded_rectangle([SAFE_L, y, SAFE_R, y + h], radius=22, fill=BG2, outline=SLATE, width=3)
    yy = y + 26
    for ln in ls:
        b = draw_text(d, (SAFE_L + 32, yy), ln, f, WHITE)
        yy = b[3] + 14
    draw_text(d, (SAFE_L + 32, yy + 8), src, font(F_MED, 34), GRAY)
    return y + h


def box2(d, y, big, sub):
    h = 186
    d.rounded_rectangle([SAFE_L, y, SAFE_R, y + h], radius=22, fill=BG2, outline=SLATE, width=3)
    d.rectangle([SAFE_L + 28, y + 34, SAFE_L + 38, y + h - 34], fill=GOLD)
    b = draw_text(d, (SAFE_L + 64, y + 26), big, fit(d, big, F_BLACK, 68, TEXT_W - 100), WHITE)
    draw_text(d, (SAFE_L + 64, b[3] + 18), sub, fit(d, sub, F_SEMI, 42, TEXT_W - 100), GRAY)
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
    if ls is None:
        size = 80
        while size > 40 and text_w(d, s, font(F_XB, size)) > max_w:
            size -= 2
        ls, f = [s], font(F_XB, size)
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
NB = "\u00a0"
CHUNKS = [
    (0, "Today at 10:15" + NB + "a.m. Pacific,"),
    (7, "the Idaho Supreme Court hears"),
    (12, "Lori" + NB + "Vallow" + NB + "Daybell's appeal."),
    (16, "First, the victims:"),
    (19, "her son, 7."),
    (22, "Her daughter, 16."),
    (25, "And Tammy" + NB + "Daybell, 49."),
    (29, "In 2023, a jury convicted her"),
    (35, "of first-degree murder"),
    (39, "in the deaths of"),
    (43, "her son and daughter."),
    (47, "It also convicted her"),
    (51, "of conspiring to murder"),
    (55, "Tammy" + NB + "Daybell."),
    (57, "She is serving life"),
    (61, "without parole."),
    (63, "Today is a review,"),
    (67, "not a new trial."),
    (71, "No witnesses testify."),
    (74, "Her lawyers say the judge"),
    (79, "wrongly removed the attorney"),
    (83, "she hired,"),
    (85, "and denied her a speedy trial."),
    (91, "The State asks the court"),
    (96, "to keep her convictions in place."),
    (102, "The justices rule later,"),
    (106, "in writing."),
    (108, "Until then,"),
    (110, "her convictions stand."),
    (113, "Court dates and sources:"),
    (117, "cassiancreed.com/court-calendar"),
]
# card changes at these word indexes
CARDS = [(0, "hook"), (16, "victims"), (29, "verdict"), (63, "today"), (74, "sides1"),
         (91, "sides2"), (102, "next"), (113, "end")]


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
    if os.environ.get("PNG_ONLY"):
        print("png only"); return
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
