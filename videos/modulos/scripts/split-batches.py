"""Split the three Gemini TTS batch takes (9 sentences each) into per-line WAVs.

Each batch was generated in one request (voice/pacing match across modules;
saves TTS quota) with a ~0.5s pause between sentences. We pick the set of
sentence breaks whose segment lengths best fit the syllable counts, check segment lengths against syllable counts, trim
edges (0.05s lead / 0.15s tail) and loudness-normalize to -16 LUFS.
Usage: split-batches.py <dir with b0.wav b1.wav b2.wav>
"""
import itertools, json, re, subprocess, sys, os
import numpy as np

SR = 24000
HOP = 240  # 10 ms
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load(p):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)

def syl(t):
    return len(re.findall(r"[aeiouáàâãéêíóôõúü]+", t.lower()))

def write(y, path):
    tmp = path + ".raw.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-c:a", "pcm_s16le", tmp], input=y.astype(np.float32).tobytes(), check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                    "-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le", path], check=True)
    os.remove(tmp)

mods = json.load(open(os.path.join(ROOT, "modules.json")))["modules"]
src = sys.argv[1]
for b in range(3):
    group = mods[b * 3:b * 3 + 3]
    texts = [(m["slug"], i + 1, t) for m in group for i, t in enumerate(m["lines"])]
    a = load(os.path.join(src, f"b{b}.wav"))
    rms = np.array([np.sqrt(np.mean(a[i * HOP:(i + 1) * HOP] ** 2)) for i in range(len(a) // HOP)])
    voiced = rms > rms.max() * 0.03
    idx = np.where(voiced)[0]; s0, s1 = idx[0], idx[-1] + 1
    gaps, run = [], None
    for i in range(s0, s1):
        if not voiced[i]: run = i if run is None else run
        elif run is not None: gaps.append((i - run, run, i)); run = None
    # Try every choice of sentence breaks among the pauses (>= 0.3s; ~12 candidates)
    # and keep the one whose segment lengths best match the syllable counts, with a
    # bonus for longer pauses. Longest-N alone mis-cuts at long commas/colons.
    gaps = [g for g in gaps if g[0] >= 30]
    syls = [syl(t) for *_, t in texts]
    def score(c):
        b = [s0] + [x for g in c for x in (g[1], g[2])] + [s1]
        d = [b[2 * k + 1] - b[2 * k] for k in range(len(texts))]
        rate = sum(d) / sum(syls)
        return sum(np.log(dk / (sk * rate)) ** 2 for dk, sk in zip(d, syls)) - 0.02 * sum(g[0] for g in c)
    cuts = min(itertools.combinations(gaps, len(texts) - 1), key=score)
    bounds = [s0] + [x for g in cuts for x in (g[1], g[2])] + [s1]
    segs = [(bounds[2 * k], bounds[2 * k + 1]) for k in range(len(texts))]
    tot_s = sum(syl(t) for *_, t in texts); tot_d = sum(e - s for s, e in segs)
    for (slug, n, t), (s, e) in zip(texts, segs):
        ratio = ((e - s) / tot_d) / (syl(t) / tot_s)
        flag = "" if 0.75 < ratio < 1.3 else "  <-- CHECK"
        print(f"b{b} {slug:18} {n} {(e-s)/100:5.2f}s ratio={ratio:.2f}{flag}  {t[:50]}")
        y = a[max(0, s * HOP - int(0.05 * SR)):min(len(a), e * HOP + int(0.15 * SR))].copy()
        f = int(0.005 * SR); y[-f:] *= np.linspace(1, 0, f); y[:f] *= np.linspace(0, 1, f)
        out = os.path.join(ROOT, "assets", "voice", slug); os.makedirs(out, exist_ok=True)
        write(y, os.path.join(out, f"{n:02d}.wav"))
