"""Generate the pt-BR narration with Gemini TTS and split it into one WAV per frame.

All script lines go out in ONE request (same voice, energy and pacing across
frames, and one request against the free tier's small daily quota). The model
is asked for a clear pause between lines; the take is then cut at the pause
nearest each line's syllable-proportional position in speech time, favouring
long pauses.

    GEMINI_API_KEY=... python3 scripts/gemini-tts.py [--take take.wav]

--take re-splits an existing full take instead of calling the API. Writes
assets/voice/NN.wav (24 kHz mono) and the full take to
.hyperframes/gemini-take.wav. Then run align-words.py, build-frames.py and
retime.py.
"""
import argparse, base64, json, os, re, subprocess, urllib.error, urllib.request
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.1-flash-tts-preview")
VOICE = os.environ.get("GEMINI_TTS_VOICE", "Puck")  # male, upbeat
STYLE = ("Leia o roteiro abaixo em português do Brasil, com sotaque brasileiro, tom confiante, próximo e animado, "
         "como a locução de um vídeo curto para Reels. Faça uma pausa clara de um segundo entre uma linha e a próxima.")
SR, HOP = 24000, 0.01

def script_lines():
    lines, cur = {}, None
    for ln in open(os.path.join(ROOT, "SCRIPT.md"), encoding="utf8"):
        m = re.match(r"## Line \d+ .*\(Frame (\d+)\)", ln)
        if m: cur = int(m.group(1)); continue
        if cur and ln.startswith("    ") and ln.strip():
            lines[cur] = ln.strip()
    return [lines[k] for k in sorted(lines)]

def synthesize(lines, out):
    body = {"contents": [{"parts": [{"text": STYLE + "\n\n" + "\n\n".join(lines)}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={os.environ['GEMINI_API_KEY']}"
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json"})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=300))
    except urllib.error.HTTPError as e:
        raise SystemExit(e.read().decode()[:800])
    part = d["candidates"][0]["content"]["parts"][0]["inlineData"]
    raw = base64.b64decode(part["data"])
    if raw[:4] == b"RIFF":
        src = ["-f", "wav"]
    else:  # audio/l16; rate=24000 — raw little-endian PCM
        rate = re.search(r"rate=(\d+)", part["mimeType"])
        src = ["-f", "s16le", "-ar", rate.group(1) if rate else "24000", "-ac", "1"]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *src, "-i", "-", "-ac", "1", "-ar", str(SR), out],
                   input=raw, check=True)

def syllables(text):
    return sum(max(1, len(re.findall(r"[aeiouáàâãéêíóôõúü]+", w))) for w in text.lower().split())

def split(take, lines):
    a = np.frombuffer(subprocess.run(["ffmpeg", "-loglevel", "error", "-i", take, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                     capture_output=True, check=True).stdout, dtype=np.float32)
    h = int(SR * HOP); n = len(a) // h
    rms = np.array([np.sqrt(np.mean(a[i*h:(i+1)*h] ** 2)) for i in range(n)])
    voiced = rms > max(rms.max() * 0.03, 1e-4)
    idx = np.where(voiced)[0]; s0, s1 = idx[0], idx[-1] + 1
    pauses, run = [], None
    for i in range(s0, s1):
        if not voiced[i]: run = i if run is None else run
        elif run is not None:
            if i - run >= 25: pauses.append((run, i))
            run = None
    # Place each line break by speech time (voiced frames before the pause), not
    # wall time, so dramatic pauses inside a line don't drag the estimate.
    spoken = np.cumsum(voiced)
    syl = [syllables(l) for l in lines]
    cuts, cum = [], 0
    for k in range(len(lines) - 1):
        cum += syl[k]
        exp = spoken[s1 - 1] * cum / sum(syl)
        after = cuts[-1][1] if cuts else s0
        cand = [p for p in pauses if p[0] > after]
        cuts.append(min(cand, key=lambda p: abs(spoken[p[0]] - exp) - (p[1] - p[0])))
    bounds = [s0] + [x for c in cuts for x in c] + [s1]
    for k in range(len(lines)):
        t0 = max(0, bounds[2*k] * HOP - 0.06); t1 = bounds[2*k+1] * HOP + 0.12
        out = os.path.join(ROOT, "assets", "voice", f"{k+1:02d}.wav")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", take, "-ss", f"{t0:.3f}", "-to", f"{t1:.3f}",
                        "-af", "afade=t=in:d=0.01,areverse,afade=t=in:d=0.03,areverse", "-ac", "1", "-ar", str(SR), out], check=True)
        print(f"{out}  {t1 - t0:.2f}s  {lines[k]}")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--take")
    args = ap.parse_args()
    lines = script_lines()
    take = args.take or os.path.join(ROOT, ".hyperframes", "gemini-take.wav")
    if not args.take:
        synthesize(lines, take)
    split(take, lines)
