import sys, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("tts/kokoro-v1.0.onnx", "tts/voices-v1.0.bin")
voice = sys.argv[1]; out = sys.argv[2]; speed = float(sys.argv[3])
# (text, pause after in seconds)
S = [
 ("Today at ten fifteen a.m. Pacific, the Idaho Supreme Court hears Lori Vallow Daybell's appeal.", 0.3),
 ("First, the victims:", 0.15),
 ("her son, seven.", 0.15), ("Her daughter, sixteen.", 0.15), ("And Tammy Daybell, forty-nine.", 0.3),
 ("In twenty twenty-three, a jury convicted her of first-degree murder in the deaths of her son and daughter.", 0.2),
 ("It also convicted her of conspiring to murder Tammy Daybell.", 0.2),
 ("She is serving life without parole.", 0.25),
 ("Today is a review, not a new trial.", 0.15), ("No witnesses testify.", 0.3),
 ("Her lawyers say the judge wrongly removed the attorney she hired, and that she was denied a speedy trial.", 0.2),
 ("The State asks the court to keep her convictions in place.", 0.35),
 ("The justices rule later, in writing.", 0.15),
 ("Until then, her convictions stand.", 0.25),
 ("Court dates and sources: Cassy-an Creed dot com, slash court calendar.", 0.25),
]
parts=[]; sr=None; marks=[]; t=0.0
for text,p in S:
    a, sr = k.create(text, voice=voice, speed=speed, lang="en-us")
    # trim leading/trailing near-silence
    thr = 0.01; idx = np.where(np.abs(a)>thr)[0]
    if len(idx): a = a[max(0,idx[0]-int(0.03*sr)): idx[-1]+int(0.06*sr)]
    marks.append({"text":text,"start":round(t,3),"end":round(t+len(a)/sr,3)})
    parts.append(a); parts.append(np.zeros(int(p*sr),dtype=a.dtype)); t += len(a)/sr + p
lead = np.zeros(int(0.05*sr), dtype=parts[0].dtype)
y = np.concatenate([lead]+parts)
sf.write(out, y, sr)
json.dump({"sr":sr,"dur":len(y)/sr,"sentences":marks}, open(out+".json","w"), indent=1)
print(out, len(y)/sr)
