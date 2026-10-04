"""Re-time the assembled video after the narration changes.

Reads audio_meta.json (voice durations + frame-relative word timings) and:
  - index.html: frame/voice clip starts and durations, transition cue times and
    the total duration (each frame overlaps the next by OVERLAP for its exit);
  - caption_groups.json, .hyperframes/audio_meta.captions.json and
    compositions/captions.html: word-timed caption groups (frame 1 is skipped —
    the hook frame already spells its words on screen).

Caption groups break at punctuation; longer sentences split into evenly sized
groups of about MAX_WORDS words / MAX_CHARS characters, never ending on a
dangling article or preposition.
"""
import json, math, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OVERLAP = 0.5
MAX_WORDS, MAX_CHARS = 3, 26
DANGLING = {"a", "o", "e", "de", "do", "da", "no", "na", "em", "um", "com", "por", "para", "sua", "que", "se", "sob"}

def path(*p): return os.path.join(ROOT, *p)

meta = json.load(open(path("audio_meta.json")))
voices = meta["voices"]
starts, t = [], 0.0
for v in voices:
    starts.append(round(t, 3)); t += v["duration_s"]
total = round(t, 3)

# ── index.html ────────────────────────────────────────────────────────────────
html = open(path("index.html")).read()
old_starts = []
for i, v in enumerate(voices):
    fid = re.search(r'compositions/frames/(\d\d-[a-z]+)\.html', html[html.index(f'compositions/frames/{v["frame"]:02d}-'):]).group(1)
    last = i == len(voices) - 1
    scene_d = round(v["duration_s"] + (0 if last else OVERLAP), 3)
    # voice clips end 1 ms early so float rounding never overlaps the next one
    voice_d = v["duration_s"] if last else round(v["duration_s"] - 0.001, 3)
    for el, d in ((f"el-{fid}", scene_d), (f"el-{fid}-voice", voice_d)):
        m = re.search(rf'id="{el}"[^>]*?data-start="([\d.]+)"\s*data-duration="([\d.]+)"', html, re.S)
        if not el.endswith("voice"): old_starts.append(float(m.group(1)))
        seg = m.group(0)
        seg2 = seg.replace(f'data-start="{m.group(1)}"', f'data-start="{starts[i]}"').replace(f'data-duration="{m.group(2)}"', f'data-duration="{d}"')
        html = html.replace(seg, seg2)
# transitions fire at each frame boundary (the next frame's start)
remap = {round(o, 3): n for o, n in zip(old_starts, starts)}
def fix_tl(m):
    old = round(float(m.group(2)), 3)
    return m.group(1) + str(remap.get(old, old)) + m.group(3)
html = re.sub(r'(\n\s*tl\.(?:to|fromTo)\("#el-[^\n]*\}, )([\d.]+)(\);)', fix_tl, html)
html = re.sub(r'tl\.to\(\{\}, \{ duration: [\d.]+ \}, 0\)', f'tl.to({{}}, {{ duration: {total} }}, 0)', html)
html = re.sub(r'(id="root"[^>]*?data-duration=")[\d.]+', rf'\g<1>{total}', html, flags=re.S)
html = re.sub(r'(id="el-captions"[^>]*?data-duration=")[\d.]+', rf'\g<1>{total}', html, flags=re.S)
open(path("index.html"), "w").write(html)

# ── captions ──────────────────────────────────────────────────────────────────
def chunks(words):
    sents, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r"[,.:;…!?]$", w["text"]): sents.append(cur); cur = []
    if cur: sents.append(cur)
    text = lambda g: " ".join(x["text"] for x in g)
    out = []
    for s in sents:
        # a short sentence stays whole; longer ones split into evenly sized groups
        k = 1 if len(s) <= MAX_WORDS + 2 and len(text(s)) <= MAX_CHARS else math.ceil(len(s) / (MAX_WORDS + 0.5))
        while True:
            sizes = [len(s) // k + (1 if i < len(s) % k else 0) for i in range(k)]
            parts, i = [], 0
            for n in sizes: parts.append(s[i:i + n]); i += n
            # never end a group on a dangling article / preposition
            for j in range(len(parts) - 1):
                while len(parts[j]) > 1 and parts[j][-1]["text"].lower() in DANGLING:
                    parts[j + 1].insert(0, parts[j].pop())
            if all(len(text(p)) <= MAX_CHARS for p in parts) or k >= len(s): break
            k += 1
        out += parts
    return out

groups = []
for i, v in enumerate(voices):
    if v["frame"] == 1: continue
    for g in chunks(v["words"]):
        gi = len(groups)
        ws = [{"id": f"caption-word-{gi}-{k}", "text": w["text"],
               "start": round(starts[i] + w["start"], 3), "end": round(starts[i] + w["end"], 3)}
              for k, w in enumerate(g)]
        groups.append({"id": f"caption-group-{gi}", "frame": v["frame"], "start": ws[0]["start"],
                       "end": round(ws[-1]["end"] + 0.02, 3), "text": " ".join(w["text"] for w in g), "words": ws})

json.dump({"total_duration_s": total, "width": 1080, "height": 1920, "groups": groups},
          open(path("caption_groups.json"), "w"), indent=2, ensure_ascii=False)
cap_meta = {**meta, "voices": [{**v, "words": [] if v["frame"] == 1 else v["words"]} for v in voices]}
json.dump(cap_meta, open(path(".hyperframes", "audio_meta.captions.json"), "w"), indent=2, ensure_ascii=False)

cap = open(path("compositions", "captions.html")).read()
cap = re.sub(r"var GROUPS = .*?;\n", lambda _: "var GROUPS = " + json.dumps(groups, ensure_ascii=False, separators=(",", ":")) + ";\n", cap, count=1)
cap = re.sub(r"var DURATION = [\d.]+;", f"var DURATION = {total};", cap)
cap = re.sub(r'(id="captions-root"[^>]*?data-duration=")[\d.]+', rf'\g<1>{total}', cap, flags=re.S)
open(path("compositions", "captions.html"), "w").write(cap)

print("total", total)
print("starts", starts)
for g in groups: print(f'  {g["frame"]} {g["start"]:6.2f}-{g["end"]:6.2f}  {g["text"]}')
