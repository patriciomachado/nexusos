"""Build the per-module motion videos (9 modules × 9:16 and 16:9).

For every module in modules.json this writes
  audio-meta/<slug>.json              voices (3 module lines + shared CTA) with word timings
  .hyperframes/captions/<slug>.json   same, frame 1 words cleared (the hook IS the on-screen text)
  storyboards/<slug>-<fmt>.md         4-frame storyboard (durations = narration lengths)
  compositions/frames/<slug>-<fmt>/   hook · demo A · demo B · CTA sub-compositions

Word timings are estimated from the waveform (no ASR offline): pauses are
matched to punctuation and words spread by syllable count, as in
../nexus-os-promo/scripts/align-words.py. Animation cues key off those words.
Surfaces are authored at landscape scale; 9:16 shows them with zoom 1.35.
"""
import json, os, re, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "modules.json")))
FORMATS = {"9x16": (1080, 1920), "16x9": (1920, 1080)}
CTA_WORDS = [  # approved promo line 9 ("…nexusgestor ponto com." shown as the URL)
    ("Teste", 0.05, 0.452), ("grátis", 0.472, 0.875), ("por", 0.895, 1.086), ("quinze", 1.106, 1.509),
    ("dias,", 1.529, 1.72), ("sem", 1.84, 2.037), ("cartão.", 2.057, 2.47), ("nexusgestor.com", 2.88, 4.18)]

# ── word timing estimation ────────────────────────────────────────────────────
SR, HOP = 16000, 0.01

def load(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)

def duration(path):
    return round(float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                                      capture_output=True, text=True, check=True).stdout), 3)

def syllables(w):
    w = re.sub(r"[^a-záàâãéêíóôõúüç]", "", w.lower())
    return max(1, len(re.findall(r"[aeiouáàâãéêíóôõúü]+", w)))

def align(audio, text):
    hop = int(SR * HOP)
    n = len(audio) // hop
    rms = np.array([np.sqrt(np.mean(audio[i*hop:(i+1)*hop] ** 2)) for i in range(n)])
    voiced = rms > max(rms.max() * 0.06, 1e-4)
    idx = np.where(voiced)[0]
    s0, s1 = idx[0], idx[-1] + 1
    pauses, run = [], None
    for i in range(s0, s1):
        if not voiced[i]:
            run = i if run is None else run
        elif run is not None:
            if i - run >= 9: pauses.append((run, i))
            run = None
    segs, cur = [], []
    for w in text.split():
        cur.append(w)
        if re.search(r"[,.:;…!?]$", w): segs.append(cur); cur = []
    if cur: segs.append(cur)
    seg_syl = [sum(syllables(w) for w in seg) for seg in segs]
    total, cum, bounds, used = sum(seg_syl), 0, [s0], set()
    for si in range(len(segs) - 1):
        cum += seg_syl[si]
        exp = s0 + (s1 - s0) * cum / total
        cand = [(abs((p[0] + p[1]) / 2 - exp), j) for j, p in enumerate(pauses)
                if j not in used and p[0] > bounds[-1] and abs((p[0] + p[1]) / 2 - exp) < 0.22 * (s1 - s0)]
        if cand:
            j = min(cand)[1]; used.add(j); bounds += [pauses[j][0], pauses[j][1]]
        else:
            e = max(int(exp), bounds[-1]); bounds += [e, e]
    bounds.append(s1)
    out = []
    for si, seg in enumerate(segs):
        a, b = bounds[2*si] * HOP, bounds[2*si+1] * HOP
        syl = [syllables(w) for w in seg]
        t = a
        for w, sy in zip(seg, syl):
            d = (b - a) * sy / sum(syl)
            out.append({"text": w, "start": round(t, 3), "end": round(t + d - 0.02, 3)})
            t += d
    return out

# ── frame scaffolding ─────────────────────────────────────────────────────────
FONTS = "".join(
    f'@font-face{{font-family:"Inter";src:url("assets/fonts/inter-latin-{w}-normal.woff2") format("woff2");font-weight:{w};font-style:normal}}\n'
    for w in (400, 500, 600, 700))

COMMON_CSS = """
.__bg{position:absolute;inset:0;background:#F2F2F7}
.__card{background:#FFFFFF;border-radius:44px;box-shadow:0 22px 60px rgba(0,0,0,.11),0 2px 6px rgba(0,0,0,.04)}
.__dcard{background:#1C1C1E;border:2px solid rgba(255,255,255,.08);border-radius:44px}
.__muted{color:#6E6E73}
.__pill{display:inline-flex;align-items:center;border-radius:100px;font-weight:600;white-space:nowrap}
.__num{font-variant-numeric:tabular-nums}
.__eyebrow{font-weight:600;color:#5856D6;letter-spacing:.06em;text-transform:uppercase}
.__h2{font-weight:700;letter-spacing:-.025em;line-height:1.06}
.__ok{background:rgba(52,199,89,.14);color:#1E8E3E;padding:12px 26px;font-size:28px}
.__row{display:flex;justify-content:space-between;align-items:center}
.__btn{background:#5856D6;color:#fff;justify-content:center}
"""
LAYOUT_CSS = {
    "9x16": """
#root{position:absolute;inset:0;width:1080px;height:1920px;overflow:hidden;font-family:"Inter",sans-serif;color:#1D1D1F;-webkit-font-smoothing:antialiased}
.__f{position:absolute;left:0;right:0;top:0;height:1590px;padding:150px 76px 0;display:flex;flex-direction:column}
.__eyebrow{font-size:38px}
.__h2{font-size:84px;margin-top:22px}
.__r{margin-top:80px;zoom:1.35;display:flex;flex-direction:column}
""",
    "16x9": """
#root{position:absolute;inset:0;width:1920px;height:1080px;overflow:hidden;font-family:"Inter",sans-serif;color:#1D1D1F;-webkit-font-smoothing:antialiased}
.__f{position:absolute;left:0;right:0;top:0;height:880px;padding:0 130px;display:flex;flex-direction:row;align-items:center;gap:100px}
.__l{flex:0 0 640px;display:flex;flex-direction:column}
.__eyebrow{font-size:30px}
.__h2{font-size:76px;margin-top:20px}
.__r{flex:1;min-width:0;display:flex;flex-direction:column}
""",
}

def frame_html(fid, prefix, w, h, dur, css, body, js, dark=False):
    dark_css = "\n#root{color:#fff}\n.__bg{background:#000}\n.__eyebrow{color:#7D7AFF}\n" if dark else ""
    css = (FONTS + LAYOUT_CSS[FMT] + COMMON_CSS + dark_css + css).replace("__", prefix)
    body = body.replace("__", prefix)
    js = js.replace("__", prefix)
    return f"""<template>
  <style>{css}
  </style>
  <div id="root" data-composition-id="{fid}" data-width="{w}" data-height="{h}">
    <div id="{prefix}bg" class="clip {prefix}bg" data-start="0" data-duration="{dur}" data-track-index="0"></div>
{body}
  </div>
  <script>
  (function(){{
    const tl = gsap.timeline({{ paused: true }});
    const q = (s) => document.querySelector('[data-composition-id="{fid}"] ' + s);
    const qa = (s) => document.querySelectorAll('[data-composition-id="{fid}"] ' + s);
    const brl = (v) => {{
      const r = Math.floor(v), c = Math.round((v - r) * 100);
      return [String(r).replace(/\\B(?=(\\d{{3}})+(?!\\d))/g, "."), String(c).padStart(2, "0")];
    }};
{js}
    window.__timelines["{fid}"] = tl;
  }})();
  </script>
</template>
"""

def r2(t): return round(max(0.0, t), 2)
def rise(sel, t, y=60, d=0.55):
    return f'    tl.fromTo(q("{sel}"), {{opacity:0, y:{y}}}, {{opacity:1, y:0, duration:{d}, ease:"power3.out"}}, {r2(t)});\n'
def pop(sel, t, s=0.6, d=0.5):
    return f'    tl.fromTo(q("{sel}"), {{opacity:0, scale:{s}}}, {{opacity:1, scale:1, duration:{d}, ease:"back.out(1.8)"}}, {r2(t)});\n'
def slide(sel, t, x=-70, d=0.45):
    return f'    tl.fromTo(q("{sel}"), {{opacity:0, x:{x}}}, {{opacity:1, x:0, duration:{d}, ease:"power3.out"}}, {r2(t)});\n'
def to(sel, t, props, d=0.3):
    return f'    tl.to(q("{sel}"), {{{props}, duration:{d}}}, {r2(t)});\n'
def count(sel_int, sel_cts, t, value, d=1.2):
    return (f'    {{ const st = {{v:0}}; tl.fromTo(st, {{v:0}}, {{v:{value}, duration:{d}, ease:"power2.out", onUpdate(){{\n'
            f'      const [a, b] = brl(st.v); q("{sel_int}").textContent = a; q("{sel_cts}").textContent = b; }}}}, {r2(t)}); }}\n')
def typeon(sel, t, text, d):
    return (f'    {{ const ty = {{n:0}}; const S = {json.dumps(text, ensure_ascii=False)};\n'
            f'      tl.fromTo(ty, {{n:0}}, {{n:S.length, duration:{d}, ease:"none", onUpdate(){{ q("{sel}").textContent = S.slice(0, Math.round(ty.n)); }}}}, {r2(t)}); }}\n')

def header(eb, h2):
    """Eyebrow + headline: left column (16:9) or top block (9:16). Animated in by demo()."""
    inner = f'<div class="__eyebrow" id="__eb">{eb}</div>\n      <div class="__h2" id="__h">{h2}</div>'
    return f'      <div class="__l">\n      {inner}\n      </div>\n'

def demo(eb, h2, surface, css, js):
    body = f'    <div class="__f">\n{header(eb, h2)}      <div class="__r">\n{surface}      </div>\n    </div>\n'
    js = rise("#__eb", 0, y=30, d=0.4) + rise("#__h", 0.05, y=40, d=0.5) + js
    return body, css, js

# ── module surfaces: two demo frames each; c(frame, word) → cue seconds ──────
def surfaces(slug, c):
    S = {}
    if slug == "ordens-de-servico":
        S[2] = demo("Ordens de serviço", "Entrada completa,<br>sem papel.", """        <div class="__card __os" id="__card">
          <div class="__row __muted" style="font-size:28px"><span class="__num">Nova OS #1043</span><span>Recebido hoje, 09:12</span></div>
          <div class="__dev">Galaxy A54 · Troca de bateria</div>
          <div class="__lbl">Fotos de entrada</div>
          <div class="__photos"><span class="__ph" id="__p0"></span><span class="__ph" id="__p1"></span><span class="__ph" id="__p2"></span></div>
          <div class="__lbl">Checklist</div>
          <div class="__ck" id="__c0"><span class="__box">✓</span>Liga normalmente</div>
          <div class="__ck" id="__c1"><span class="__box">✓</span>Tela sem trincas</div>
          <div class="__ck" id="__c2"><span class="__box">✓</span>Câmeras e áudio ok</div>
          <div class="__row __quote" id="__q"><span>Orçamento</span><b class="__num">R$ 160,00</b></div>
        </div>
""", """
.__os{padding:40px 50px 44px}
.__dev{font-size:44px;font-weight:700;letter-spacing:-.02em;margin-top:12px}
.__lbl{font-size:24px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:.05em;margin-top:30px}
.__photos{display:flex;gap:18px;margin-top:14px}
.__ph{width:150px;height:150px;border-radius:26px;background:linear-gradient(145deg,#E5E5EA,#C7C7CC);position:relative}
.__ph::after{content:"";position:absolute;left:50%;top:50%;width:58px;height:42px;margin:-21px 0 0 -29px;border:5px solid #fff;border-radius:12px;box-sizing:border-box}
.__ck{display:flex;align-items:center;gap:18px;font-size:30px;margin-top:14px}
.__box{width:40px;height:40px;border-radius:12px;background:#34C759;color:#fff;font-size:24px;font-weight:700;display:flex;align-items:center;justify-content:center}
.__quote{margin-top:30px;padding:24px 30px;border-radius:28px;background:rgba(88,86,214,.08);font-size:32px;color:#5856D6}
.__quote b{font-size:40px}
""", rise("#__card", 0.15, y=110, d=0.6)
           + "".join(pop(f"#__p{i}", c(2, "fotos") - 0.2 + i * 0.12, s=0.7, d=0.4) for i in range(3))
           + "".join(slide(f"#__c{i}", c(2, "checklist") - 0.1 + i * 0.15) for i in range(3))
           + pop("#__q", c(2, "orçamento") - 0.1, s=0.8))
        steps = ["Na fila", "Em reparo", "Pronto para retirada"]
        S[3] = demo("Acompanhamento", "O aparelho anda.<br>O cliente vê.", """        <div class="__card __os" id="__card">
          <div class="__row __muted" style="font-size:28px"><span class="__num">OS #1042</span><span id="__tec">Técnico: Rafael</span></div>
          <div class="__dev">iPhone 13 · Troca de tela</div>
          <div class="__muted" style="font-size:28px;margin-top:6px" id="__due">Ana P. · prazo hoje, 17h</div>
          <div class="__rail">
            <div class="__line"><div class="__fill" id="__fill"></div></div>
""" + "".join(f'            <div class="__step" id="__s{i}"><span class="__dot" id="__d{i}"></span><span>{s}</span></div>\n' for i, s in enumerate(steps)) + """          </div>
        </div>
        <div class="__pill __link" id="__link"><span class="__g">●</span>nexusgestor.com/acompanhar · enviado à Ana</div>
""", """
.__os{padding:40px 50px 46px}
.__dev{font-size:44px;font-weight:700;letter-spacing:-.02em;margin-top:12px}
.__rail{position:relative;margin-top:36px;display:flex;flex-direction:column;gap:28px}
.__line{position:absolute;left:21px;top:22px;bottom:22px;width:6px;border-radius:3px;background:rgba(88,86,214,.15)}
.__fill{position:absolute;left:0;top:0;width:100%;height:100%;border-radius:3px;background:#5856D6;transform-origin:top center}
.__step{position:relative;display:flex;align-items:center;gap:28px;font-size:34px;font-weight:500;color:#76767C}
.__dot{width:48px;height:48px;border-radius:50%;background:#fff;border:6px solid rgba(88,86,214,.25);box-sizing:border-box;flex:none}
.__link{align-self:flex-start;margin-top:30px;background:#fff;box-shadow:0 12px 34px rgba(0,0,0,.08);padding:22px 34px;font-size:28px;gap:16px}
.__g{color:#1E8E3E;font-size:24px}
""", rise("#__card", 0.12, y=110, d=0.6)
           + '    tl.set(q("#__fill"), {scaleY:0}, 0);\n'
           + to("#__d0", c(3, "etapa") - 0.1, 'background:"#5856D6", borderColor:"#5856D6"', 0.25)
           + to("#__s0", c(3, "etapa") - 0.1, 'color:"#1D1D1F"', 0.25)
           + pop("#__tec", c(3, "técnico") - 0.1, s=0.85, d=0.4)
           + pop("#__due", c(3, "prazo") - 0.1, s=0.85, d=0.4)
           + to("#__fill", c(3, "prazo"), 'scaleY:0.5, ease:"power2.inOut"', 0.5)
           + to("#__d1", c(3, "prazo") + 0.35, 'background:"#5856D6", borderColor:"#5856D6"', 0.25)
           + to("#__s1", c(3, "prazo") + 0.35, 'color:"#1D1D1F"', 0.25)
           + to("#__fill", c(3, "cliente") - 0.1, 'scaleY:1, ease:"power2.inOut"', 0.5)
           + to("#__d2", c(3, "cliente") + 0.3, 'background:"#34C759", borderColor:"#34C759"', 0.25)
           + to("#__s2", c(3, "cliente") + 0.3, 'color:"#1D1D1F", fontWeight:600', 0.25)
           + pop("#__link", c(3, "link") - 0.3, s=0.7))
    elif slug == "pdv-e-caixa":
        items = [("Película 3D", "40,00"), ("Capinha anti-impacto", "59,90"), ("Carregador USB-C", "89,90")]
        S[2] = demo("PDV", "Venda no balcão<br>em segundos.", """        <div class="__card __pdv" id="__card">
          <div class="__row"><b style="font-size:34px">Venda rápida</b><span class="__muted" style="font-size:26px">Balcão · caixa aberto</span></div>
""" + "".join(f'          <div class="__row __it" id="__i{i}"><span>{n}</span><b class="__num">R$ {p}</b></div>\n' for i, (n, p) in enumerate(items)) + """          <div class="__row __tot"><span class="__muted">Total</span><b class="__num">R$ <span id="__int">0</span>,<span id="__cts">00</span></b></div>
          <div class="__pill __btn __go" id="__go">Finalizar no Pix</div>
          <div class="__pill __ok __done" id="__done">✓ Venda concluída · recibo enviado</div>
        </div>
""", """
.__pdv{padding:40px 50px 46px;display:flex;flex-direction:column}
.__it{font-size:32px;padding:24px 0;border-bottom:2px solid #EFEFF4}
.__tot{margin-top:22px;font-size:32px}
.__tot b{font-size:64px;color:#5856D6;letter-spacing:-.03em}
.__go{margin-top:28px;padding:28px;font-size:34px}
.__done{align-self:center;margin-top:20px}
""", rise("#__card", 0.12, y=110, d=0.6)
           + "".join(slide(f"#__i{i}", 0.4 + i * 0.3) for i in range(3))
           + count("#__int", "#__cts", 0.45, 189.80, d=1.1)
           + f'    tl.to(q("#__go"), {{scale:0.94, duration:0.1, ease:"power2.in"}}, {r2(c(2, "segundos") - 0.3)});\n'
           + f'    tl.to(q("#__go"), {{scale:1, duration:0.35, ease:"back.out(3)"}}, {r2(c(2, "segundos") - 0.2)});\n'
           + pop("#__done", c(2, "segundos"), s=0.7))
        rows = [("Vendas do dia", "+ R$ 1.286,00", "#1E8E3E", "vendas"), ("Sangria · troco do cofre", "− R$ 200,00", "#1D1D1F", "sangrias"),
                ("Conta fixa · internet", "− R$ 119,90", "#1D1D1F", "contas")]
        S[3] = demo("Caixa", "Caixa que bate<br>no fim do dia.", """        <div class="__card __cx">
          <div class="__row"><b style="font-size:34px">Caixa de hoje</b><span class="__muted" style="font-size:26px">Qui, 18:02</span></div>
""" + "".join(f'          <div class="__row __m" id="__m{i}"><span>{n}</span><b class="__num" style="color:{col}">{v}</b></div>\n' for i, (n, v, col, _) in enumerate(rows)) + """          <div class="__row __sal"><span class="__muted">Saldo em caixa</span><b class="__num">R$ 966,10</b></div>
          <div class="__pill __ok" id="__ok" style="align-self:flex-start;margin-top:22px">✓ Fechamento confere</div>
        </div>
""", """
.__cx{padding:40px 50px 44px;display:flex;flex-direction:column}
.__m{font-size:30px;padding:26px 0;border-bottom:2px solid #EFEFF4}
.__m b{font-size:32px}
.__sal{margin-top:20px;font-size:30px}
.__sal b{font-size:56px;color:#5856D6;letter-spacing:-.03em}
""", rise(".__cx", 0.1, y=110, d=0.6)
           + "".join(slide(f"#__m{i}", c(3, w) - 0.15) for i, (*_, w) in enumerate(rows))
           + pop("#__ok", c(3, "certo") - 0.2, s=0.7))
    elif slug == "estoque":
        items = [("Tela iPhone 13", "Peça · 4 un", "R$ 310", "R$ 480"), ("Película 3D", "Acessório · 32 un", "R$ 8", "R$ 40"),
                 ("iPhone 11 128 GB", "Seminovo · 1 un", "R$ 1.350", "R$ 1.890")]
        S[2] = demo("Estoque", "Custo e preço<br>de tudo.", """        <div class="__card __tb">
          <div class="__row __hd"><span style="flex:1">Item</span><span class="__c">Custo</span><span class="__c">Preço</span></div>
""" + "".join(f'          <div class="__row __ln" id="__i{i}"><span style="flex:1"><b>{n}</b><small class="__muted">{s}</small></span><span class="__c __num __muted">{cst}</span><span class="__c __num"><b>{p}</b></span></div>\n'
              for i, (n, s, cst, p) in enumerate(items)) + """        </div>
""", """
.__tb{padding:30px 46px 20px}
.__hd{font-size:24px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:.05em;padding-bottom:16px;border-bottom:2px solid #EFEFF4}
.__ln{padding:28px 0;border-bottom:2px solid #EFEFF4;font-size:30px}
.__ln:last-child{border-bottom:0}
.__ln b{display:block;font-size:34px}
.__ln small{display:block;font-size:26px;margin-top:4px}
.__c{width:170px;text-align:right}
""", rise(".__tb", 0.1, y=110, d=0.6)
           + "".join(slide(f"#__i{i}", c(2, w) - 0.15) for i, w in enumerate(["peças", "acessórios", "seminovos"])))
        S[3] = demo("Aparelhos na troca", "Troca avaliada<br>e registrada.", """        <div class="__card __av">
          <div class="__muted" style="font-size:26px">Avaliação de troca</div>
          <div class="__dev">iPhone 11 · 128 GB</div>
          <div class="__row __ck" id="__k0"><span>Bateria</span><b>86%</b></div>
          <div class="__row __ck" id="__k1"><span>Tela</span><b>Sem marcas</b></div>
          <div class="__row __ck" id="__k2"><span>Face ID</span><b>Ok</b></div>
          <div class="__row __val" id="__val"><span>Valor da troca</span><b class="__num">R$ 1.350</b></div>
        </div>
        <div class="__pill __ok" id="__ok" style="align-self:flex-start;margin-top:26px;font-size:30px;padding:16px 30px">✓ Entrou no estoque como seminovo</div>
""", """
.__av{padding:40px 50px 44px}
.__dev{font-size:44px;font-weight:700;letter-spacing:-.02em;margin-top:8px;margin-bottom:12px}
.__ck{font-size:30px;padding:22px 0;border-bottom:2px solid #EFEFF4}
.__ck b{font-weight:600}
.__val{margin-top:24px;padding:24px 30px;border-radius:28px;background:rgba(88,86,214,.08);font-size:30px;color:#5856D6}
.__val b{font-size:44px}
""", rise(".__av", 0.1, y=110, d=0.6)
           + "".join(slide(f"#__k{i}", c(3, "troca") + 0.1 + i * 0.18) for i in range(3))
           + pop("#__val", c(3, "avaliação") - 0.05, s=0.85)
           + pop("#__ok", c(3, "estoque") - 0.25, s=0.7))
    elif slug == "tarefas":
        tasks = [("Ligar para Ana P. · retorno do orçamento", "10:00"), ("Pedir tela do iPhone 13 ao fornecedor", "11:30"),
                 ("Cobrar OS #1031 · pronta há 4 dias", "14:00"), ("Conferir o caixa", "18:00")]
        S[2] = demo("Tarefas", "Pendências num<br>lugar só.", """        <div class="__card __tk">
          <div class="__row"><b style="font-size:34px">Hoje</b><span class="__muted" style="font-size:26px">4 pendências</span></div>
""" + "".join(f'          <div class="__t" id="__t{i}"><span class="__cb" id="__cb{i}"></span><span style="flex:1">{n}</span><span class="__muted __num">{h}</span></div>\n'
              for i, (n, h) in enumerate(tasks)) + """        </div>
""", """
.__tk{padding:40px 46px 30px}
.__t{display:flex;align-items:center;gap:22px;font-size:30px;padding:26px 0;border-bottom:2px solid #EFEFF4}
.__t:last-child{border-bottom:0}
.__cb{width:40px;height:40px;border-radius:50%;border:4px solid #C7C7CC;box-sizing:border-box;flex:none}
""", rise(".__tk", 0.1, y=110, d=0.6)
           + "".join(slide(f"#__t{i}", c(2, "pendências") - 0.2 + i * 0.16) for i in range(4))
           + to("#__cb3", c(2, "só") - 0.1, 'background:"#34C759", borderColor:"#34C759"', 0.25))
        S[3] = demo("Lembretes", "Lembrete no celular,<br>na hora certa.", """        <div class="__lock">
          <div class="__time"><span id="__hh">09:59</span></div>
          <div class="__date">quinta-feira, 9 de outubro</div>
          <div class="__note" id="__note">
            <div class="__row" style="font-size:24px;color:rgba(0,0,0,.55)"><span><b class="__app"></b>NEXUS OS</span><span>agora</span></div>
            <b style="display:block;font-size:30px;margin-top:10px">Lembrete · 10:00</b>
            <span style="display:block;font-size:28px;margin-top:4px">Ligar para Ana P. · retorno do orçamento</span>
          </div>
        </div>
""", """
.__lock{position:relative;height:640px;border-radius:56px;background:linear-gradient(160deg,#3B3A8F,#5856D6 55%,#8E6CF0);padding:60px 40px 0;display:flex;flex-direction:column;align-items:center;color:#fff;overflow:hidden}
.__time{font-size:150px;font-weight:600;letter-spacing:-.03em;line-height:1}
.__date{font-size:30px;font-weight:500;margin-top:14px;opacity:.85}
.__note{align-self:stretch;margin-top:70px;background:rgba(255,255,255,.88);color:#1D1D1F;border-radius:36px;padding:28px 34px}
.__app{display:inline-block;width:30px;height:30px;border-radius:8px;background:#5856D6;vertical-align:-7px;margin-right:12px}
""", rise(".__lock", 0.08, y=110, d=0.6)
           + f'    tl.set(q("#__hh"), {{textContent:"09:59"}}, 0);\n    tl.set(q("#__hh"), {{textContent:"10:00"}}, {r2(c(3, "lembrete") - 0.1)});\n'
           + f'    tl.fromTo(q("#__note"), {{opacity:0, y:-120, scale:0.92}}, {{opacity:1, y:0, scale:1, duration:0.55, ease:"back.out(1.6)"}}, {r2(c(3, "chega") - 0.1)});\n'
           + f'    tl.to(q("#__note"), {{x:8, duration:0.06, yoyo:true, repeat:3, ease:"sine.inOut"}}, {r2(c(3, "hora") - 0.1)});\n')
    elif slug == "relatorios":
        S[2] = demo("Relatórios", "Você sabe se<br>teve lucro.", """        <div class="__card __rep">
          <div class="__muted" style="font-size:28px">Faturamento do mês</div>
          <div class="__big __num">R$ <span id="__int">0</span><small>,<span id="__cts">00</span></small></div>
          <div class="__pill __ok" id="__up">↑ +12% vs mês anterior</div>
          <div class="__kpis">
            <div class="__k" id="__k0"><span class="__muted">Lucro</span><b class="__num">R$ 7.320,40</b></div>
            <div class="__k" id="__k1"><span class="__muted">Ticket médio</span><b class="__num">R$ 214,50</b></div>
          </div>
        </div>
""", """
.__rep{padding:40px 50px 44px}
.__big{font-size:96px;font-weight:700;letter-spacing:-.04em;line-height:1.1;margin:6px 0 12px}
.__big small{font-size:.5em}
.__kpis{display:flex;gap:22px;margin-top:30px}
.__k{flex:1;border-radius:28px;background:rgba(88,86,214,.07);padding:24px 28px;display:flex;flex-direction:column;gap:8px;font-size:26px}
.__k b{font-size:40px;color:#5856D6;letter-spacing:-.02em}
""", rise(".__rep", 0.1, y=110, d=0.6) + count("#__int", "#__cts", c(2, "faturamento") - 0.1, 18450.90, d=1.2)
           + pop("#__k0", c(2, "lucro") - 0.1, s=0.8) + pop("#__k1", c(2, "ticket") - 0.1, s=0.8)
           + pop("#__up", c(2, "comparados") - 0.1, s=0.7))
        S[3] = demo("Relatórios · Plano Pro", "DRE, meta<br>e equipe.", """        <div class="__card __pro">
          <div id="__dre"><div class="__lbl">DRE do mês</div>
            <div class="__row __d"><span>Receita</span><b class="__num">R$ 18.450,90</b></div>
            <div class="__row __d"><span>Custos e despesas</span><b class="__num">− R$ 11.130,50</b></div>
            <div class="__row __d"><span>Lucro líquido</span><b class="__num" style="color:#5856D6">R$ 7.320,40</b></div></div>
          <div id="__meta"><div class="__lbl" style="margin-top:28px">Meta do mês · 82%</div>
            <div class="__bar"><div class="__barf" id="__barf"></div></div></div>
          <div id="__tec"><div class="__lbl" style="margin-top:28px">Desempenho por técnico</div>
            <div class="__row __d"><span>Rafael</span><b>38 OS</b></div>
            <div class="__row __d"><span>Bruna</span><b>31 OS</b></div></div>
        </div>
""", """
.__pro{padding:36px 50px 36px}
.__lbl{font-size:24px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
.__d{font-size:28px;padding:14px 0;border-bottom:2px solid #EFEFF4}
.__bar{height:26px;border-radius:13px;background:rgba(88,86,214,.14);margin-top:12px;overflow:hidden}
.__barf{height:100%;width:82%;border-radius:13px;background:#5856D6;transform-origin:left center}
""", rise(".__pro", 0.1, y=110, d=0.6)
           + rise("#__dre", c(3, "dre") - 0.15, y=30, d=0.4)
           + rise("#__meta", c(3, "meta") - 0.15, y=30, d=0.4)
           + f'    tl.fromTo(q("#__barf"), {{scaleX:0}}, {{scaleX:1, duration:0.8, ease:"power2.out"}}, {r2(c(3, "meta"))});\n'
           + rise("#__tec", c(3, "desempenho") - 0.15, y=30, d=0.4))
    elif slug == "pos-venda":
        revs = [("Ana P.", "Tela perfeita e me avisaram quando ficou pronto."), ("Marcos T.", "Atendimento rápido e preço justo."),
                ("Júlia R.", "Resolveram no mesmo dia.")]
        S[2] = demo("Pós-venda", "O que os clientes<br>acharam.", """        <div class="__card __sc"><span class="__nota __num">4,9</span><span><span class="__stars">★★★★★</span><span class="__muted" style="display:block;font-size:26px">média de 128 avaliações</span></span></div>
""" + "".join(f'        <div class="__card __rv" id="__r{i}"><div class="__row"><b>{n}</b><span class="__stars" style="font-size:26px">★★★★★</span></div><div class="__muted">“{t}”</div></div>\n'
              for i, (n, t) in enumerate(revs)), """
.__sc{display:flex;align-items:center;gap:28px;padding:30px 44px}
.__nota{font-size:92px;font-weight:700;letter-spacing:-.04em;color:#5856D6}
.__stars{color:#A87800;font-size:40px;letter-spacing:4px}
.__rv{margin-top:18px;padding:26px 40px;font-size:28px;border-radius:36px}
.__rv b{font-size:30px}
.__rv .__muted{margin-top:8px}
""", rise(".__sc", 0.1, y=90, d=0.55) + "".join(rise(f"#__r{i}", c(2, "avaliações") - 0.2 + i * 0.2, y=70, d=0.45) for i in range(3)))
        S[3] = demo("Pós-venda · Plano Pro", "Quem contatar,<br>com a mensagem pronta.", """        <div class="__card __who" id="__who"><span class="__av">AP</span><span style="flex:1"><b>Ana P.</b><small class="__muted">Troca de tela há 30 dias · iPhone 13</small></span><span class="__pill __tag">Contatar hoje</span></div>
        <div class="__wa" id="__wa">
          <div class="__bub" id="__bub"><span id="__msg"></span></div>
          <div class="__pill __send" id="__send">Enviar no WhatsApp</div>
        </div>
""", """
.__who{display:flex;align-items:center;gap:24px;padding:28px 36px;font-size:28px}
.__who b{display:block;font-size:32px}
.__who small{display:block;font-size:24px;margin-top:4px}
.__av{width:76px;height:76px;border-radius:50%;background:rgba(88,86,214,.14);color:#5856D6;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}
.__tag{background:rgba(255,149,0,.15);color:#B25E00;padding:10px 20px;font-size:22px}
.__wa{margin-top:24px;border-radius:44px;background:#E9E2D8;padding:34px 34px 30px;display:flex;flex-direction:column}
.__bub{align-self:flex-end;max-width:88%;min-height:150px;background:#D9FDD3;border-radius:28px 28px 8px 28px;padding:22px 28px;font-size:28px;line-height:1.38;box-shadow:0 2px 3px rgba(0,0,0,.08)}
.__send{align-self:flex-end;margin-top:22px;background:#25D366;color:#fff;padding:20px 34px;font-size:28px}
""", rise("#__who", 0.1, y=90, d=0.55) + pop("#__who .__tag", c(3, "contatar") - 0.1, s=0.7)
           + rise("#__wa", c(3, "contatar") + 0.1, y=90, d=0.5)
           + typeon("#__msg", c(3, "mensagem") - 0.2, "Oi, Ana! Tudo certo com o iPhone 13 depois da troca de tela? Qualquer coisa, é só chamar. 😊", 1.0)
           + pop("#__send", c(3, "whatsapp") - 0.1, s=0.7))
    elif slug == "catalogo-online":
        prods = [("iPhone 11 · 128 GB", "R$ 1.890", "Seminovo"), ("Galaxy A54", "R$ 1.390", "Seminovo"),
                 ("Carregador USB-C", "R$ 89,90", "Acessório"), ("Fone Bluetooth", "R$ 149,90", "Acessório")]
        S[2] = demo("Catálogo online", "Sua vitrine<br>de aparelhos.", """        <div class="__grid">
""" + "".join(f'          <div class="__card __p" id="__p{i}"><span class="__img{" __acc" if i > 1 else ""}"><span></span></span><small class="__muted">{t}</small><b>{n}</b><span class="__pr __num">{p}</span></div>\n'
              for i, (n, p, t) in enumerate(prods)) + """        </div>
""", """
.__grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.__p{border-radius:36px;padding:24px 26px 26px;display:flex;flex-direction:column;font-size:28px}
.__img{height:170px;border-radius:24px;background:linear-gradient(150deg,#EEEEF6,#DCDCEC);display:flex;align-items:center;justify-content:center;margin-bottom:16px}
.__img span{width:70px;height:120px;border-radius:16px;border:6px solid #5856D6;box-sizing:border-box}
.__acc span{width:84px;height:84px;border-radius:50%}
.__p small{font-size:22px}
.__p b{font-size:28px;margin-top:4px}
.__pr{font-size:32px;font-weight:700;color:#5856D6;margin-top:8px}
""", "".join(pop(f"#__p{i}", (c(2, "aparelhos") if i < 2 else c(2, "acessórios")) - 0.25 + (i % 2) * 0.15, s=0.85, d=0.45) for i in range(4)))
        S[3] = demo("Catálogo online", "Link próprio<br>para divulgar.", """        <div class="__card __url"><span class="__lock">🔒</span><span id="__u"></span><span class="__car" id="__car"></span></div>
        <div class="__share">
          <div class="__card __sh" id="__s0"><span class="__ic" style="background:#25D366"></span>WhatsApp</div>
          <div class="__card __sh" id="__s1"><span class="__ic" style="background:linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)"></span>Instagram</div>
          <div class="__card __sh" id="__s2"><span class="__ic" style="background:#5856D6"></span>Copiar link</div>
        </div>
        <div class="__pill __ok" id="__ok" style="align-self:flex-start;margin-top:26px;font-size:30px;padding:16px 30px">✓ Link copiado</div>
""", """
.__url{display:flex;align-items:center;gap:16px;padding:32px 40px;font-size:34px;font-weight:600;border-radius:100px;min-height:44px}
.__lock{font-size:28px}
.__car{display:inline-block;width:4px;height:40px;background:#5856D6}
.__share{display:flex;gap:18px;margin-top:26px}
.__sh{flex:1;display:flex;flex-direction:column;align-items:center;gap:14px;padding:28px 10px;font-size:26px;font-weight:600;border-radius:36px}
.__ic{width:70px;height:70px;border-radius:20px}
""", rise(".__url", 0.1, y=60, d=0.5) + typeon("#__u", 0.35, "nexusgestor.com/loja/sua-loja", max(0.6, c(3, "próprio") - 0.1))
           + to("#__car", c(3, "pronto") - 0.1, "opacity:0", 0.05)
           + "".join(pop(f"#__s{i}", c(3, "divulgar") - 0.35 + i * 0.1, s=0.7, d=0.4) for i in range(3))
           + f'    tl.to(q("#__s2"), {{scale:0.92, duration:0.1}}, {r2(c(3, "divulgar") + 0.2)});\n'
           + f'    tl.to(q("#__s2"), {{scale:1, duration:0.3, ease:"back.out(3)"}}, {r2(c(3, "divulgar") + 0.3)});\n'
           + pop("#__ok", c(3, "divulgar") + 0.35, s=0.7, d=0.4))
    elif slug == "studio":
        S[2] = demo("Studio de conteúdo", "Ideias, roteiros<br>e artes.", """        <div class="__card __b" id="__b0"><span class="__tg">Ideia</span><b>Antes e depois: troca de tela do iPhone 13</b></div>
        <div class="__card __b" id="__b1"><span class="__tg">Roteiro</span><span>1. Mostre a tela trincada · 2. O reparo em 10s · 3. A tela nova, com o preço</span></div>
        <div class="__card __b __art" id="__b2"><span class="__tg" style="background:rgba(255,255,255,.2);color:#fff">Arte</span><b style="font-size:46px;line-height:1.05">Troca de tela<br>em 1 hora.</b><span style="opacity:.85">Garantia de 90 dias</span></div>
""", """
.__b{margin-bottom:18px;padding:28px 36px;font-size:28px;display:flex;flex-direction:column;gap:10px;border-radius:36px}
.__b b{font-size:32px}
.__tg{align-self:flex-start;background:rgba(88,86,214,.1);color:#5856D6;border-radius:100px;padding:8px 18px;font-size:22px;font-weight:600}
.__art{background:linear-gradient(140deg,#4643C4,#6E4FD6 60%,#2F7FC0);color:#fff;min-height:230px}
""", "".join(rise(f"#__b{i}", c(2, w) - 0.2, y=80, d=0.45) for i, w in enumerate(["ideias", "roteiros", "artes"])))
        S[3] = demo("Studio de conteúdo", "Pronto para<br>postar.", """        <div class="__card __post" id="__post">
          <div class="__row" style="font-size:26px;padding:20px 28px"><span><span class="__avt"></span><b>sua.assistencia</b></span><span class="__muted">•••</span></div>
          <div class="__art"><b>Troca de tela<br>em 1 hora.</b><span>Garantia de 90 dias</span></div>
          <div style="padding:20px 28px 26px;font-size:26px"><b>sua.assistencia</b> Tela trincada? A gente troca enquanto você toma um café. ☕</div>
        </div>
        <div class="__pill __btn" id="__sch" style="align-self:flex-start;margin-top:22px;padding:20px 34px;font-size:28px">Baixar arte e legenda</div>
""", """
.__post{border-radius:36px;overflow:hidden}
.__avt{display:inline-block;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#F58529,#DD2A7B);vertical-align:-14px;margin-right:14px}
.__art{height:330px;background:linear-gradient(140deg,#4643C4,#6E4FD6 60%,#2F7FC0);color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 44px;gap:10px;font-size:28px}
.__art b{font-size:58px;line-height:1.04;letter-spacing:-.02em}
""", pop("#__post", 0.1, s=0.88, d=0.6) + pop("#__sch", c(3, "redes") - 0.1, s=0.7))
    elif slug == "alice":
        S[2] = demo("Alice · IA", "Pergunte.<br>A Alice resolve.", """        <div class="__dcard __chat">
          <div class="__hd"><span class="__avt"></span><b>Alice</b></div>
          <div class="__me" id="__q"><span id="__qt"></span></div>
          <div class="__ai" id="__a">São 4 aparelhos prontos há mais de 3 dias. Quer que eu crie uma tarefa para ligar para os clientes?</div>
          <div class="__act" id="__act"><span>Criar tarefa · Ligar para 4 clientes · hoje 14h</span><span class="__pill __btn" id="__cf">Confirmar</span></div>
        </div>
""", """
.__chat{padding:32px 36px 36px;display:flex;flex-direction:column;gap:18px;color:#fff}
.__hd{display:flex;align-items:center;gap:20px;padding-bottom:18px;border-bottom:2px solid rgba(255,255,255,.1);font-size:32px}
.__avt{width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#818CF8,#7C3AED)}
.__me{align-self:flex-end;max-width:84%;min-height:44px;background:#5856D6;border-radius:32px 32px 10px 32px;padding:20px 30px;font-size:29px;line-height:1.35}
.__ai{align-self:flex-start;max-width:90%;background:rgba(255,255,255,.1);border-radius:32px 32px 32px 10px;padding:20px 30px;font-size:29px;line-height:1.38}
.__act{display:flex;align-items:center;gap:20px;border:2px solid rgba(125,122,255,.5);border-radius:28px;padding:18px 18px 18px 28px;font-size:26px;color:rgba(255,255,255,.85)}
.__act .__btn{padding:16px 28px;font-size:26px;margin-left:auto}
""", rise(".__chat", 0.1, y=110, d=0.6) + rise("#__q", 0.3, y=30, d=0.3)
           + typeon("#__qt", 0.35, "Quais aparelhos estão prontos e ninguém veio buscar?", 0.9)
           + rise("#__a", c(2, "responde") - 0.15, y=30, d=0.4)
           + pop("#__act", c(2, "prepara") - 0.1, s=0.85)
           + f'    tl.to(q("#__cf"), {{scale:0.9, duration:0.1}}, {r2(c(2, "confirma") - 0.05)});\n'
           + f'    tl.to(q("#__cf"), {{scale:1, background:"#34C759", duration:0.3, ease:"back.out(3)"}}, {r2(c(2, "confirma") + 0.05)});\n')
        S[3] = demo("Alice no WhatsApp", "Atende o cliente<br>no WhatsApp.", """        <div class="__wa">
          <div class="__top"><span class="__avt">N</span><span><b>Assistência Centro</b><small>online</small></span></div>
          <div class="__in" id="__m0">Oi! Meu iPhone 13 já ficou pronto?</div>
          <div class="__typ" id="__typ"><span></span><span></span><span></span></div>
          <div class="__out" id="__m1">Oi, Ana! Ficou sim: a troca de tela foi concluída e ele está pronto para retirada desde as 15h. ✓✓</div>
        </div>
""", """
.__wa{border-radius:44px;background:#0B141A;overflow:hidden;padding-bottom:30px;display:flex;flex-direction:column;gap:18px}
.__top{display:flex;align-items:center;gap:20px;background:#1F2C34;padding:24px 30px;color:#fff;font-size:28px}
.__top small{display:block;font-size:22px;color:#8696A0}
.__top .__avt{width:62px;height:62px;border-radius:50%;background:#5856D6;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center}
.__in,.__out{max-width:80%;padding:20px 26px;font-size:28px;line-height:1.38;color:#E9EDEF}
.__in{align-self:flex-start;margin-left:28px;background:#202C33;border-radius:8px 28px 28px 28px}
.__out{align-self:flex-end;margin-right:28px;background:#005C4B;border-radius:28px 8px 28px 28px}
.__typ{align-self:flex-start;margin-left:28px;display:flex;gap:10px;background:#202C33;border-radius:28px;padding:22px 26px}
.__typ span{width:14px;height:14px;border-radius:50%;background:#8696A0}
""", rise(".__wa", 0.1, y=110, d=0.6) + rise("#__m0", c(3, "whatsapp") - 0.2, y=30, d=0.35)
           + pop("#__typ", c(3, "whatsapp") + 0.4, s=0.8, d=0.3)
           + f'    tl.to(q("#__typ"), {{opacity:0, height:0, padding:0, duration:0.15}}, {r2(c(3, "status") - 0.35)});\n'
           + rise("#__m1", c(3, "status") - 0.25, y=30, d=0.4))
    return S

def hook(name, words, dark=False):
    """Frame 1: the pain question, word by word on its VO cue."""
    spans = " ".join(f'<span class="__w" id="__w{i}">{w["text"]}</span>' for i, w in enumerate(words))
    body = f'''    <div class="__f __hookf">
      <div class="__pill __mod" id="__mod">{name}</div>
      <div class="__q">{spans}</div>
    </div>
'''
    css = """
.__hookf{justify-content:center;gap:0}
.__mod{align-self:flex-start;background:rgba(88,86,214,.1);color:#5856D6;padding:16px 32px;font-size:34px}
.__q{font-weight:700;letter-spacing:-.035em;line-height:1.08;margin-top:40px}
.__w{display:inline-block}
""" + (".__hookf{flex-direction:column;align-items:flex-start;padding-top:40px}\n.__q{font-size:112px;max-width:1500px}\n" if FMT == "16x9"
       else ".__hookf{padding-bottom:160px}\n.__q{font-size:116px}\n")
    js = pop("#__mod", 0, s=0.8, d=0.4)
    for i, w in enumerate(words):
        js += f'    tl.fromTo(q("#__w{i}"), {{opacity:0, y:40, scale:0.9}}, {{opacity:1, y:0, scale:1, duration:0.32, ease:"back.out(1.7)"}}, {r2(w["start"] - 0.06)});\n'
    last = words[-1]
    js += f'    tl.to(q("#__w{len(words) - 1}"), {{color:"#5856D6", duration:0.25}}, {r2(last["start"])});\n'
    return body, css, js

def cta(name):
    landscape = FMT == "16x9"
    body = f'''    <div class="__glow" id="__glow" data-layout-allow-overflow></div>
    <div class="__f __ctaf">
      <div class="__lock">
        <div class="__tile" id="__tile"><img src="capture/assets/nexus-logo.png" alt="Nexus" class="__logo"></div>
        <div class="__txt"><div class="__pill __mod" id="__mod">{name}</div><div class="__nm" id="__nm">Nexus OS</div></div>
      </div>
      <div class="__pill __btn __go" id="__go">Teste grátis por 15 dias</div>
      <div class="__muted __nc" id="__nc">Sem cartão de crédito.</div>
      <div class="__url" id="__url">nexusgestor.com</div>
    </div>
'''
    css = """
.__glow{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(162,28,240,.18),rgba(45,212,239,.09) 55%,rgba(242,242,247,0))}
.__ctaf{flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:0}
.__lock{display:flex;align-items:center}
.__tile{background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.13);display:flex;align-items:center;justify-content:center;flex:none}
.__logo{object-fit:contain;display:block}
.__txt{display:flex;flex-direction:column}
.__mod{background:rgba(88,86,214,.1);color:#5856D6}
.__nm{font-weight:700;letter-spacing:-.04em;line-height:1}
.__go{box-shadow:0 18px 44px rgba(88,86,214,.35)}
.__url{font-weight:700;color:#5856D6;letter-spacing:-.01em}
""" + ("""
.__glow{left:360px;top:-380px;width:1200px;height:1200px}
.__lock{gap:56px}
.__tile{width:260px;height:260px;border-radius:60px}
.__logo{width:232px;height:232px}
.__txt{align-items:flex-start}
.__mod{padding:12px 26px;font-size:30px}
.__nm{font-size:128px;margin-top:20px}
.__go{margin-top:60px;padding:34px 72px;font-size:42px}
.__nc{font-size:32px;margin-top:24px}
.__url{font-size:44px;margin-top:18px}
""" if landscape else """
.__glow{left:-60px;top:120px;width:1200px;height:1200px}
.__ctaf{padding-bottom:80px}
.__lock{flex-direction:column;gap:56px}
.__tile{width:330px;height:330px;border-radius:76px}
.__logo{width:296px;height:296px}
.__txt{align-items:center}
.__mod{padding:16px 34px;font-size:38px}
.__nm{font-size:132px;margin-top:28px}
.__go{margin-top:80px;padding:44px 86px;font-size:50px}
.__nc{font-size:42px;margin-top:34px}
.__url{font-size:52px;margin-top:26px}
""")
    w = {x[0].lower().strip(",."): x[1] for x in CTA_WORDS}
    js = '    tl.fromTo(q("#__glow"), {opacity:0, scale:0.7}, {opacity:1, scale:1, duration:0.9, ease:"power2.out"}, 0);\n'
    js += pop("#__tile", 0, s=0.6, d=0.55) + pop("#__mod", 0.15, s=0.8, d=0.4) + rise("#__nm", 0.2, y=40, d=0.5)
    js += pop("#__go", w["teste"] + 0.05, s=0.6) + rise("#__nc", w["sem"] - 0.1, y=30, d=0.4)
    t_url = w["nexusgestor.com"] - 0.15
    js += rise("#__url", t_url, y=30, d=0.45)
    js += f'    tl.to(q("#__go"), {{scale:0.94, duration:0.12, ease:"power2.in"}}, {r2(t_url + 0.5)});\n'
    js += f'    tl.to(q("#__go"), {{scale:1, duration:0.4, ease:"back.out(3)"}}, {r2(t_url + 0.62)});\n'
    return body, css, js

# ── main ──────────────────────────────────────────────────────────────────────
TRANS = ["cut", "push-slide LEFT", "blur-crossfade", "zoom-through"]
os.makedirs(os.path.join(ROOT, ".hyperframes", "captions"), exist_ok=True)
for mi, mod in enumerate(CFG["modules"]):
    slug, name = mod["slug"], mod["name"]
    voices = []
    for n, line in enumerate(mod["lines"], 1):
        path = f"assets/voice/{slug}/{n:02d}.wav"
        voices.append({"frame": n, "path": path, "duration_s": duration(os.path.join(ROOT, path)),
                       "words": align(load(os.path.join(ROOT, path)), line)})
    voices.append({"frame": 4, "path": "assets/voice/cta.wav", "duration_s": duration(os.path.join(ROOT, "assets/voice/cta.wav")),
                   "words": [{"text": t, "start": s, "end": e} for t, s, e in CTA_WORDS]})
    meta = {"bgm": None, "bgm_pending": False, "voices": voices, "sfx": []}
    json.dump(meta, open(os.path.join(ROOT, "audio-meta", f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    cap = json.loads(json.dumps(meta)); cap["voices"][0]["words"] = []
    json.dump(cap, open(os.path.join(ROOT, ".hyperframes", "captions", f"{slug}.json"), "w"), indent=2, ensure_ascii=False)
    W_ = {v["frame"]: v["words"] for v in voices}
    D_ = {v["frame"]: v["duration_s"] for v in voices}

    def c(frame, word, nth=0):
        hits = [w for w in W_[frame] if w["text"].lower().strip(",.:;?!…").startswith(word.lower())]
        if len(hits) <= nth: raise SystemExit(f"{slug}: cue '{word}' not in frame {frame} ({[w['text'] for w in W_[frame]]})")
        return hits[nth]["start"]

    dark = slug == "alice"
    for FMT, (W, H) in FORMATS.items():
        built = {1: hook(name, W_[1])}
        built.update(surfaces(slug, c))
        built[4] = cta(name)
        ids = {1: "01-hook", 2: "02-demo-a", 3: "03-demo-b", 4: "04-cta"}
        fdir = os.path.join(ROOT, "compositions", "frames", f"{slug}-{FMT}")
        os.makedirs(fdir, exist_ok=True)
        sb = [f"""---
format: {W}x{H}
duration: {round(sum(D_.values()))}s
message: "{name}: {mod['lines'][1]}"
arc: Dor → {name} em ação → resultado → CTA
audience: donos de assistência técnica de celulares e eletrônicos
mode: collaborative
captions: yes
voice: Puck (Gemini TTS, pt-BR)
music: none
---
"""]
        for n in range(1, 5):
            body, css, js = built[n]
            fid = ids[n]  # must equal the file basename (assemble-index)
            prefix = f"m{mi}{n}-"
            html = frame_html(fid, prefix, W, H, D_[n], css, body, js, dark=dark and n in (2, 3))
            src = f"compositions/frames/{slug}-{FMT}/{ids[n]}.html"
            open(os.path.join(ROOT, src), "w").write(html)
            vo = mod["lines"][n - 1] if n < 4 else CFG["cta_text"]
            sb.append(f"""
## Frame {n} — {['Gancho', 'Demonstração A', 'Demonstração B', 'CTA'][n - 1]}

- scene: {['pergunta de dor palavra a palavra', 'tela do app, parte 1', 'tela do app, parte 2', 'logo + módulo + teste grátis'][n - 1]}
- voiceover: "{vo}"
- duration: {D_[n]}s
- transition_in: {TRANS[n - 1]}
- status: animated
- src: {src}
""")
        open(os.path.join(ROOT, "storyboards", f"{slug}-{FMT}.md"), "w").write("".join(sb))
    print(f"{slug:18} {sum(D_.values()):5.2f}s  " + " | ".join(" ".join(w["text"] for w in W_[n])[:40] for n in (1, 2, 3)))
