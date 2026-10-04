"""Estimate word timings for Kokoro narration (no ASR available offline).

The script text is known exactly, so we find speech/pause regions from the
waveform energy, map punctuation breaks to the longest pauses, and spread the
words of each segment by syllable count. Writes voices[].words into
audio_meta.json (frame-relative seconds), the shape captions.mjs reads.
"""
import json, re, subprocess, numpy as np

SR = 16000
HOP = 0.01

def load(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)

def syllables(w):
    w = re.sub(r"[^a-záàâãéêíóôõúüç]", "", w.lower())
    return max(1, len(re.findall(r"[aeiouáàâãéêíóôõúü]+", w)))

def parse_script(path):
    lines, cur = {}, None
    for ln in open(path, encoding="utf8"):
        m = re.match(r"## Line \d+ .*\(Frame (\d+)\)", ln)
        if m: cur = int(m.group(1)); continue
        if cur and ln.startswith("    ") and ln.strip():
            lines[cur] = ln.strip()
    return lines

def align(audio, text):
    hop = int(SR * HOP)
    n = len(audio) // hop
    rms = np.array([np.sqrt(np.mean(audio[i*hop:(i+1)*hop] ** 2)) for i in range(n)])
    thr = max(rms.max() * 0.06, 1e-4)
    voiced = rms > thr
    idx = np.where(voiced)[0]
    s0, s1 = idx[0], idx[-1] + 1
    # internal pauses (>= 90 ms)
    pauses, run = [], None
    for i in range(s0, s1):
        if not voiced[i]:
            run = i if run is None else run
        elif run is not None:
            if i - run >= 9: pauses.append((run, i))
            run = None
    words = text.split()
    # segment words at punctuation
    segs, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r"[,.:;…!?]$", w): segs.append(cur); cur = []
    if cur: segs.append(cur)
    # Pick, for each punctuation break, the pause nearest its syllable-proportional
    # expected time, favouring long pauses: closures inside words also read as
    # short silences, while real punctuation breaks are the longest gaps.
    seg_syl = [sum(syllables(w) for w in seg) for seg in segs]
    total, cum, bounds, used = sum(seg_syl), 0, [s0], set()
    for si in range(len(segs) - 1):
        cum += seg_syl[si]
        exp = s0 + (s1 - s0) * cum / total
        wgt = 1 if segs[si][-1].endswith(",") else 3  # sentence stops pause longer than commas
        cand = [(abs((p[0] + p[1]) / 2 - exp) - wgt * (p[1] - p[0]), j) for j, p in enumerate(pauses)
                if j not in used and p[0] > bounds[-1] and abs((p[0] + p[1]) / 2 - exp) < 0.3 * (s1 - s0)]
        if cand:
            j = min(cand)[1]; used.add(j); bounds += [pauses[j][0], pauses[j][1]]
        else:
            e = max(int(exp), bounds[-1]); bounds += [e, e]
    bounds.append(s1)
    out = []
    for si, seg in enumerate(segs):
        a, b = bounds[2*si] * HOP, bounds[2*si+1] * HOP
        syl = [syllables(w) for w in seg]
        tot, t = sum(syl), a
        for w, sy in zip(seg, syl):
            d = (b - a) * sy / tot
            out.append({"text": w, "start": round(t, 3), "end": round(t + d - 0.02, 3)})
            t += d
    return out

def display_fix(words):
    # Spoken "nexusgestor ponto com." → caption "nexusgestor.com"
    for i in range(len(words) - 2):
        if words[i]["text"].lower() == "nexusgestor" and words[i+1]["text"].lower() == "ponto":
            words[i:i+3] = [{"text": "nexusgestor.com", "start": words[i]["start"], "end": words[i+2]["end"]}]
            break
    return words

meta = json.load(open("audio_meta.json"))
script = parse_script("SCRIPT.md")
for v in meta["voices"]:
    if v["words"]: continue  # keep timings already set (e.g. the hand-assembled hook)
    v["words"] = display_fix(align(load(v["path"]), script[v["frame"]]))
    print(v["frame"], " ".join(f'{w["text"]}@{w["start"]}' for w in v["words"]))
json.dump(meta, open("audio_meta.json", "w"), indent=2, ensure_ascii=False)
