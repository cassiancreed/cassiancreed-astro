"""NEP Morphew Status Short v1 - Kokoro TTS (af_heart), one call per sentence.

Usage: python3 tts_gen.py <out.wav> [speed]
TTS input follows the Vallow fix list: times as words (no "a.m."/"p.m."),
no "slash" in the web address, "Cassy-an" spelling for the brand name.
"""
import json
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

TTS = "/tmp/claude-0/-home-claude/4397d5fc-40bf-5374-8504-385b4859f633/scratchpad/vallow/tts/"
k = Kokoro(TTS + "kokoro-v1.0.onnx", TTS + "voices-v1.0.bin")
out = sys.argv[1]
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.1

# (spoken text for TTS, pause after in seconds)
S = [
    ("Today at twelve thirty Pacific, the Barry Morphew case is back in court.", 0.30),
    ("First, the victim: Suzanne Morphew.", 0.20),
    ("She was forty-nine when she went missing on Mother's Day, May tenth, twenty twenty.", 0.20),
    ("Her remains were found in twenty twenty-three.", 0.30),
    ("Her husband, Barry Morphew, is charged with first-degree murder in her death.", 0.20),
    ("He pleaded not guilty.", 0.20),
    ("By law, he is presumed innocent.", 0.25),
    ("An earlier case against him was dismissed in twenty twenty-two.", 0.30),
    ("Today is a status conference, held by video.", 0.15),
    ("It is a check-in on the schedule. It is not a trial.", 0.15),
    ("No verdict can come from it.", 0.30),
    ("News reports say his trial is planned for summer twenty twenty-seven.", 0.30),
    ("Court dates and sources: Cassy-an Creed dot com.", 0.30),
]

parts, marks, t, sr = [], [], 0.05, None
for text, p in S:
    a, sr = k.create(text, voice="af_heart", speed=speed, lang="en-us")
    idx = np.where(np.abs(a) > 0.01)[0]
    if len(idx):
        a = a[max(0, idx[0] - int(0.03 * sr)): idx[-1] + int(0.06 * sr)]
    marks.append({"text": text, "start": round(t, 3), "end": round(t + len(a) / sr, 3)})
    parts.append(a)
    parts.append(np.zeros(int(p * sr), dtype=a.dtype))
    t += len(a) / sr + p
y = np.concatenate([np.zeros(int(0.05 * sr), dtype=parts[0].dtype)] + parts)
sf.write(out, y, sr)
json.dump({"sr": sr, "speed": speed, "dur": len(y) / sr, "sentences": marks}, open(out + ".json", "w"), indent=1)
print(out, round(len(y) / sr, 2))
