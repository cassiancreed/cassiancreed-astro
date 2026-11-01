import json, sys
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
import soundfile as sf
import numpy as np
a, sr = sf.read(sys.argv[1], dtype="float32")
segs, _ = m.transcribe(a, word_timestamps=True, beam_size=5, language="en")
words = []
for s in segs:
    for w in s.words:
        words.append([w.word.strip(), round(w.start, 3), round(w.end, 3), round(w.probability, 3)])
json.dump({"words": words}, open(sys.argv[2], "w"), indent=0)
print(len(words)); print(" ".join(w[0] for w in words))
for i, w in enumerate(words): print(i, w)
