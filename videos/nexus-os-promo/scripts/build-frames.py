"""Generate the nine frame sub-compositions (compositions/frames/NN-*.html).

Each frame is a bare <template> fragment: shared base CSS (Inter @font-face,
frame.md tokens, iOS app-card components) + frame markup + one paused GSAP
timeline at window.__timelines[<frame_id>]. Class/ids are prefixed per frame
(`__` → `f03-` etc.) so frames assembled into one DOM never collide. Timings
are cued to the narration word timings in audio_meta.json (frame-relative).
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "compositions", "frames")
W, H = 1080, 1920

meta = json.load(open(os.path.join(ROOT, "audio_meta.json")))
DUR = {v["frame"]: v["duration_s"] for v in meta["voices"]}
WORDS = {v["frame"]: v["words"] for v in meta["voices"]}

def cue(frame, word, nth=0, at="start"):
    """Frame-relative time of the nth occurrence of a narration word."""
    hits = [w for w in WORDS[frame] if w["text"].lower().strip(",.:…!?").startswith(word.lower())]
    return round(hits[nth][at], 2)

BASE_CSS = """
@font-face{font-family:"Inter";src:url("assets/fonts/inter-latin-400-normal.woff2") format("woff2");font-weight:400;font-style:normal}
@font-face{font-family:"Inter";src:url("assets/fonts/inter-latin-500-normal.woff2") format("woff2");font-weight:500;font-style:normal}
@font-face{font-family:"Inter";src:url("assets/fonts/inter-latin-600-normal.woff2") format("woff2");font-weight:600;font-style:normal}
@font-face{font-family:"Inter";src:url("assets/fonts/inter-latin-700-normal.woff2") format("woff2");font-weight:700;font-style:normal}
#root{position:absolute;inset:0;width:1080px;height:1920px;overflow:hidden;font-family:"Inter",sans-serif;color:#1D1D1F;-webkit-font-smoothing:antialiased}
.__bg{position:absolute;inset:0;background:#F2F2F7}
.__f{position:absolute;left:0;right:0;top:0;height:1590px;padding:150px 76px 0;display:flex;flex-direction:column}
.__eyebrow{font-size:38px;font-weight:600;color:#5856D6;letter-spacing:.06em;text-transform:uppercase}
.__h2{font-size:84px;font-weight:700;letter-spacing:-.025em;line-height:1.06;margin-top:22px}
.__card{background:#FFFFFF;border-radius:56px;box-shadow:0 26px 70px rgba(0,0,0,.12),0 2px 6px rgba(0,0,0,.04)}
.__muted{color:#6E6E73}
.__pill{display:inline-flex;align-items:center;border-radius:100px;font-weight:600;white-space:nowrap}
.__num{font-variant-numeric:tabular-nums}
"""

def frame_html(fid, prefix, dur, css, body, js):
    css = (BASE_CSS + css).replace("__", prefix)
    body = body.replace("__", prefix)
    js = js.replace("__", prefix)
    return f"""<template>
  <style>{css}
  </style>
  <div id="root" data-composition-id="{fid}" data-width="{W}" data-height="{H}">
    <div id="__bg" class="clip __bg" data-start="0" data-duration="{dur}" data-track-index="0"></div>
{body}
  </div>
  <script>
  (function(){{
    const tl = gsap.timeline({{ paused: true }});
    const q = (s) => document.querySelector('[data-composition-id="{fid}"] ' + s);
    const qa = (s) => document.querySelectorAll('[data-composition-id="{fid}"] ' + s);
    const brl = (v, cents) => {{
      const r = Math.floor(v), c = Math.round((v - r) * 100);
      const s = String(r).replace(/\\B(?=(\\d{{3}})+(?!\\d))/g, ".");
      return cents ? [s, String(c).padStart(2, "0")] : [s, "00"];
    }};
{js}
    window.__timelines["{fid}"] = tl;
  }})();
  </script>
</template>
""".replace("__bg", prefix + "bg")

def rise(sel, t, y=60, d=0.6, ease="power3.out"):
    return f'    tl.fromTo(q("{sel}"), {{opacity:0, y:{y}}}, {{opacity:1, y:0, duration:{d}, ease:"{ease}"}}, {round(t, 2)});\n'

def pop(sel, t, s=0.6, d=0.55):
    return f'    tl.fromTo(q("{sel}"), {{opacity:0, scale:{s}}}, {{opacity:1, scale:1, duration:{d}, ease:"back.out(1.8)"}}, {round(t, 2)});\n'

frames = {}

# ── 01 Hook ───────────────────────────────────────────────────────────────────
d = DUR[1]
words = [("caderno", "Caderno."), ("whatsapp", "WhatsApp."), ("mem", "Memória.")]
body = '    <div class="__f" style="justify-content:center;padding-bottom:120px">\n'
for i, (_, label) in enumerate(words):
    body += f'      <div class="__w" id="__w{i}"><span class="__wt">{label}</span><span class="__strike" id="__s{i}"></span></div>\n'
body += '      <div class="__final" id="__final">Sua assistência<br>merece <span id="__mais" style="color:#5856D6;display:inline-block">mais.</span></div>\n    </div>\n'
css = """
.__w{position:relative;align-self:flex-start;font-size:132px;font-weight:700;letter-spacing:-.035em;line-height:1.12;color:#1D1D1F}
.__strike{position:absolute;left:-6px;right:-6px;top:54%;height:14px;border-radius:7px;background:#5856D6;transform-origin:left center}
.__final{font-size:112px;font-weight:700;letter-spacing:-.035em;line-height:1.05;margin-top:90px}
"""
js = ""
for i, (w, _) in enumerate(words):
    t0 = max(0, cue(1, w) - 0.05)
    t1 = cue(1, w, at="end") - 0.1
    js += f'    tl.fromTo(q("#__w{i}"), {{opacity:0, scale:1.35, y:-20}}, {{opacity:1, scale:1, y:0, duration:0.4, ease:"back.out(1.6)", transformOrigin:"left center"}}, {t0});\n'
    js += f'    tl.fromTo(q("#__s{i}"), {{scaleX:0}}, {{scaleX:1, duration:0.3, ease:"power2.inOut"}}, {t1});\n'
    js += f'    tl.to(q("#__w{i}"), {{color:"#8B8B90", duration:0.3}}, {t1});\n'
tf = cue(1, "sua") - 0.1
js += f'    tl.to(qa(".__w"), {{opacity:0.35, duration:0.4, ease:"power2.out"}}, {tf});\n'
js += rise("#__final", tf, y=80, d=0.6)
js += pop("#__mais", cue(1, "mais") - 0.05, s=0.5, d=0.5)
frames["01-hook"] = (d, css, body, js)

# ── 02 Intro ──────────────────────────────────────────────────────────────────
d = DUR[2]
body = """    <div class="__glow" id="__glow"></div>
    <div class="__f" style="align-items:center;justify-content:center;text-align:center;padding-bottom:140px">
      <div class="__tile" id="__tile"><img src="capture/assets/nexus-logo.png" alt="Nexus" class="__logo"></div>
      <div class="__name" id="__name">Nexus OS</div>
      <div class="__eyebrow" id="__eb" style="margin-top:26px">Sistema para assistências técnicas</div>
    </div>
"""
css = """
.__glow{position:absolute;left:-90px;top:200px;width:1260px;height:1260px;border-radius:50%;background:radial-gradient(closest-side,rgba(162,28,240,.24),rgba(45,212,239,.12) 55%,rgba(242,242,247,0))}
.__tile{width:500px;height:500px;border-radius:112px;background:#fff;box-shadow:0 34px 90px rgba(0,0,0,.14);display:flex;align-items:center;justify-content:center}
.__logo{width:450px;height:450px;object-fit:contain;display:block}
.__name{font-size:124px;font-weight:700;letter-spacing:-.035em;margin-top:70px}
"""
js = '    tl.fromTo(q("#__glow"), {opacity:0, scale:0.6}, {opacity:1, scale:1, duration:0.9, ease:"power2.out"}, 0);\n'
js += pop("#__tile", 0.02, s=0.55, d=0.6)
js += rise("#__name", cue(2, "nexus") - 0.2, y=50, d=0.5)
js += rise("#__eb", cue(2, "nexus") + 0.05, y=30, d=0.45)
frames["02-intro"] = (d, css, body, js)

# ── 03 OS ─────────────────────────────────────────────────────────────────────
d = DUR[3]
body = """    <div class="__f">
      <div class="__eyebrow" id="__eb">Ordens de serviço</div>
      <div class="__h2" id="__h">O aparelho anda.<br>O cliente acompanha.</div>
      <div class="__card __os" id="__card">
        <div class="__row __muted"><span class="__num">OS #1042</span><span>Técnico: Rafael</span></div>
        <div class="__dev">iPhone 13 · Troca de tela</div>
        <div class="__muted __who">Ana P. · prazo hoje, 17h</div>
        <div class="__rail">
          <div class="__line"><div class="__fill" id="__fill"></div></div>
          <div class="__step" id="__st0"><span class="__dot"></span><span>Na fila</span></div>
          <div class="__step" id="__st1"><span class="__dot"></span><span>Em reparo</span></div>
          <div class="__step" id="__st2"><span class="__dot __dotok" id="__dot2"><span class="__ck" id="__ck">✓</span></span><span>Pronto para retirada</span></div>
        </div>
      </div>
      <div class="__pill __link" id="__link"><span style="color:#34C759;font-size:30px">●</span>Link de acompanhamento enviado</div>
    </div>
"""
css = """
.__os{margin-top:80px;padding:64px 64px 70px}
.__row{display:flex;justify-content:space-between;font-size:36px}
.__dev{font-size:62px;font-weight:700;letter-spacing:-.025em;margin-top:18px}
.__who{font-size:38px;margin-top:10px}
.__rail{position:relative;margin-top:60px;display:flex;flex-direction:column;gap:46px}
.__line{position:absolute;left:23px;top:24px;bottom:24px;width:6px;border-radius:3px;background:rgba(88,86,214,.15)}
.__fill{position:absolute;left:0;top:0;width:100%;height:100%;border-radius:3px;background:#5856D6;transform-origin:top center}
.__step{position:relative;display:flex;align-items:center;gap:34px;font-size:44px;font-weight:500;color:#8E8E93}
.__dot{width:52px;height:52px;border-radius:50%;background:#fff;border:6px solid rgba(88,86,214,.25);box-sizing:border-box;flex:none;display:flex;align-items:center;justify-content:center}
.__ck{color:#fff;font-size:28px;font-weight:700;opacity:0}
.__link{align-self:flex-start;margin-top:56px;background:#fff;box-shadow:0 12px 34px rgba(0,0,0,.08);padding:30px 46px;font-size:38px;gap:22px}
"""
t_et = cue(3, "etapa") - 0.15
t_pr = cue(3, "prazo")
t_cl = cue(3, "cliente") - 0.1
t_link = cue(3, "link") - 0.35
js = rise("#__eb", 0.0, y=30, d=0.45) + rise("#__h", 0.1, y=40, d=0.55)
js += rise("#__card", 0.25, y=140, d=0.75)
js += '    tl.fromTo(q("#__fill"), {scaleY:0}, {scaleY:0, duration:0.01}, 0);\n'
js += f'    tl.fromTo(q("#__st0 .__dot"), {{background:"#fff", borderColor:"rgba(88,86,214,.25)"}}, {{background:"#5856D6", borderColor:"#5856D6", duration:0.25}}, {t_et});\n'
js += f'    tl.to(q("#__st0"), {{color:"#1D1D1F", duration:0.25}}, {t_et});\n'
js += f'    tl.to(q("#__fill"), {{scaleY:0.5, duration:0.5, ease:"power2.inOut"}}, {t_pr});\n'
js += f'    tl.to(q("#__st0"), {{color:"#8E8E93", duration:0.25}}, {t_pr + 0.3});\n'
js += f'    tl.to(q("#__st1 .__dot"), {{background:"#5856D6", borderColor:"#5856D6", duration:0.25}}, {t_pr + 0.35});\n'
js += f'    tl.to(q("#__st1"), {{color:"#1D1D1F", duration:0.25}}, {t_pr + 0.35});\n'
js += f'    tl.to(q("#__fill"), {{scaleY:1, duration:0.5, ease:"power2.inOut"}}, {t_cl});\n'
js += f'    tl.to(q("#__st1"), {{color:"#8E8E93", duration:0.25}}, {t_cl + 0.3});\n'
js += f'    tl.to(q("#__dot2"), {{background:"#34C759", borderColor:"#34C759", duration:0.2}}, {t_cl + 0.4});\n'
js += f'    tl.fromTo(q("#__dot2"), {{scale:1}}, {{scale:1.25, duration:0.15, ease:"power2.out"}}, {t_cl + 0.4});\n'
js += f'    tl.to(q("#__dot2"), {{scale:1, duration:0.3, ease:"back.out(2)"}}, {t_cl + 0.55});\n'
js += f'    tl.to(q("#__ck"), {{opacity:1, duration:0.2}}, {t_cl + 0.45});\n'
js += f'    tl.to(q("#__st2"), {{color:"#1D1D1F", fontWeight:600, duration:0.25}}, {t_cl + 0.4});\n'
js += pop("#__link", t_link, s=0.7, d=0.5)
frames["03-os"] = (d, css, body, js)

# ── 04 PDV ────────────────────────────────────────────────────────────────────
d = DUR[4]
sales = [("Película 3D", "R$ 40,00"), ("Carregador USB-C", "R$ 89,90"), ("Capinha anti-impacto", "R$ 59,90")]
rows = "".join(f'          <div class="__sale" id="__r{i}"><span>{n}</span><b>{p}</b></div>\n' for i, (n, p) in enumerate(sales))
body = f"""    <div class="__f">
      <div class="__eyebrow" id="__eb">PDV e caixa</div>
      <div class="__h2" id="__h">Caixa que bate<br>no fim do dia.</div>
      <div class="__card __hero" id="__hero">
        <div class="__muted" style="font-size:40px">Caixa de hoje</div>
        <div class="__big __num"><span class="__cur">R$ </span><span id="__int">0</span><span class="__cents">,<span id="__cts">00</span></span></div>
        <div class="__pill __ok" id="__ok">9 vendas no PDV</div>
      </div>
      <div class="__card __list">
{rows}      </div>
    </div>
"""
css = """
.__hero{margin-top:80px;padding:56px 64px 60px}
.__big{font-size:150px;font-weight:700;letter-spacing:-.04em;color:#5856D6;line-height:1.1;margin-top:6px}
.__cur{font-size:.42em;color:#6E6E73;font-weight:600;letter-spacing:0}
.__cents{font-size:.5em}
.__ok{margin-top:18px;background:rgba(52,199,89,.14);color:#1E8E3E;padding:14px 30px;font-size:36px}
.__list{margin-top:36px;padding:14px 64px}
.__sale{display:flex;justify-content:space-between;padding:34px 0;font-size:42px;border-bottom:2px solid #EFEFF4}
.__sale:last-child{border-bottom:0}
"""
t_cx = cue(4, "caixa")
js = rise("#__eb", 0, y=30, d=0.4) + rise("#__h", 0.05, y=40, d=0.5) + rise("#__hero", 0.12, y=120, d=0.6)
js += f"""    const st = {{v:0}};
    tl.fromTo(st, {{v:0}}, {{v:1286, duration:1.7, ease:"power2.out", onUpdate(){{
      const [a, b] = brl(st.v, false); q("#__int").textContent = a; q("#__cts").textContent = b; }}}}, {max(0.3, t_cx - 0.1)});
"""
for i in range(3):
    js += f'    tl.fromTo(q("#__r{i}"), {{opacity:0, x:-80}}, {{opacity:1, x:0, duration:0.45, ease:"power3.out"}}, {round(0.35 + i * 0.42, 2)});\n'
js += pop("#__ok", cue(4, "fim") - 0.1, s=0.6, d=0.45)
frames["04-pdv"] = (d, css, body, js)

# ── 05 Estoque ────────────────────────────────────────────────────────────────
d = DUR[5]
items = [("Tela iPhone 13", "Peça · 4 un", "R$ 480"), ("Bateria Galaxy A54", "Peça · 7 un", "R$ 160"),
         ("Conector Moto G84", "Peça · 12 un", "R$ 70"), ("iPhone 11 seminovo", "Aparelho · 128 GB", "R$ 1.890")]
icons = ["▢", "▮", "◖", "▯"]
rows = ""
for i, (n, s, p) in enumerate(items):
    rows += f'        <div class="__card __item" id="__i{i}"><span class="__ic"><span class="__icd"></span></span><span style="flex:1"><b class="__in">{n}</b><span class="__is __muted">{s}</span></span><b class="__ip">{p}</b></div>\n'
body = f"""    <div class="__f">
      <div class="__eyebrow" id="__eb">Estoque e aparelhos</div>
      <div class="__h2" id="__h">Peças e seminovos<br>sob controle.</div>
      <div class="__stack">
{rows}      </div>
    </div>
"""
css = """
.__stack{display:flex;flex-direction:column;gap:30px;margin-top:80px}
.__item{display:flex;align-items:center;gap:40px;padding:46px 54px;border-radius:44px}
.__ic{width:112px;height:112px;border-radius:30px;background:rgba(88,86,214,.1);display:flex;align-items:center;justify-content:center;flex:none}
.__icd{width:44px;height:64px;border-radius:12px;border:6px solid #5856D6;box-sizing:border-box}
.__in{display:block;font-size:46px;font-weight:700;letter-spacing:-.015em}
.__is{display:block;font-size:36px;margin-top:6px}
.__ip{font-size:44px;font-weight:700}
"""
js = rise("#__eb", 0, y=30, d=0.4) + rise("#__h", 0.05, y=40, d=0.5)
t_semi = cue(5, "seminovos")
times = [0.25, 0.5, 0.75, max(1.0, t_semi - 0.1)]
for i, t in enumerate(times):
    js += f'    tl.fromTo(q("#__i{i}"), {{opacity:0, y:110, scale:0.96}}, {{opacity:1, y:0, scale:1, duration:0.55, ease:"power3.out"}}, {round(t, 2)});\n'
frames["05-estoque"] = (d, css, body, js)

# ── 06 Relatórios ─────────────────────────────────────────────────────────────
d = DUR[6]
heights = [35, 48, 42, 60, 55, 72, 100]
bars = "".join(f'<span class="__bar{" __last" if i == 6 else ""}" id="__b{i}" style="height:{h}%"></span>' for i, h in enumerate(heights))
body = f"""    <div class="__f">
      <div class="__eyebrow" id="__eb">Relatórios</div>
      <div class="__h2" id="__h">Você sabe se<br>teve lucro.</div>
      <div class="__card __rep" id="__card">
        <div class="__muted" style="font-size:40px">Faturamento do mês</div>
        <div class="__big __num"><span class="__cur">R$ </span><span id="__int">0</span><span class="__cents">,<span id="__cts">00</span></span></div>
        <div class="__pill __up" id="__up">↑ +12% vs anterior</div>
        <div class="__bars">{bars}</div>
      </div>
      <div class="__card __profit" id="__profit"><span class="__muted" style="font-size:40px">Lucro líquido</span><span class="__pv __num">R$ 7.320,40</span></div>
    </div>
"""
css = """
.__rep{margin-top:80px;padding:56px 64px 60px}
.__big{font-size:132px;font-weight:700;letter-spacing:-.04em;line-height:1.1;margin-top:6px}
.__cur{font-size:.45em;color:#6E6E73;font-weight:600;letter-spacing:0}
.__cents{font-size:.5em}
.__up{margin-top:14px;background:rgba(52,199,89,.14);color:#1E8E3E;padding:14px 30px;font-size:36px}
.__bars{display:flex;align-items:flex-end;gap:22px;height:330px;margin-top:56px}
.__bar{flex:1;border-radius:16px;background:rgba(88,86,214,.14);transform-origin:bottom center}
.__last{background:#5856D6}
.__profit{margin-top:36px;padding:46px 64px;display:flex;justify-content:space-between;align-items:center}
.__pv{font-size:62px;font-weight:700;color:#5856D6;letter-spacing:-.02em}
"""
js = rise("#__eb", 0, y=30, d=0.4) + rise("#__h", 0.05, y=40, d=0.5) + rise("#__card", 0.1, y=120, d=0.6)
js += """    const st = {v:0};
    tl.fromTo(st, {v:0}, {v:18450.90, duration:1.25, ease:"power2.out", onUpdate(){
      const [a, b] = brl(st.v, true); q("#__int").textContent = a; q("#__cts").textContent = b; }}, 0.2);
"""
for i in range(7):
    js += f'    tl.fromTo(q("#__b{i}"), {{scaleY:0}}, {{scaleY:1, duration:0.55, ease:"power3.out"}}, {round(0.25 + i * 0.1, 2)});\n'
js += pop("#__up", cue(6, "você") - 0.1, s=0.6, d=0.45)
js += rise("#__profit", cue(6, "lucro") - 0.35, y=90, d=0.5)
frames["06-relatorios"] = (d, css, body, js)

# ── 07 Alice ──────────────────────────────────────────────────────────────────
d = DUR[7]
Q = "Quais aparelhos estão prontos e ninguém veio buscar?"
body = f"""    <div class="__dark"></div>
    <div class="__f" style="color:#fff">
      <div class="__eyebrow" id="__eb" style="color:#7D7AFF">Alice · IA</div>
      <div class="__h2" id="__h" style="font-size:76px">Pergunte.<br>A Alice resolve.</div>
      <div class="__chat" id="__chat">
        <div class="__head"><span class="__av"></span><b>Alice</b></div>
        <div class="__me" id="__q"><span id="__qt"></span><span class="__caret" id="__caret"></span></div>
        <div class="__slot"><div class="__dots" id="__dots"><span></span><span></span><span></span></div>
        <div class="__ai" id="__a">
          <div id="__a0">São 4, prontos há mais de 3 dias:</div>
          <div class="__sub" id="__a1">#1039 Moto G84 · Júlia R. · 5 dias</div>
          <div class="__sub" id="__a2">#1031 iPhone 11 · Marcos T. · 4 dias</div>
          <div class="__sub" id="__a3">e mais 2.</div>
        </div></div>
        <div class="__me __short" id="__ok">Pode criar</div>
        <div class="__ai __done" id="__done"><span style="color:#34C759;font-weight:700">✓</span><span>Pronto. Tarefa criada para hoje às 14h.</span></div>
      </div>
    </div>
"""
css = """
.__dark{position:absolute;inset:0;background:#000}
.__chat{margin-top:50px;background:#1C1C1E;border:2px solid rgba(255,255,255,.08);border-radius:56px;padding:50px 50px 54px;display:flex;flex-direction:column;gap:28px}
.__head{display:flex;align-items:center;gap:26px;padding-bottom:26px;border-bottom:2px solid rgba(255,255,255,.1);font-size:42px}
.__av{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#818CF8,#7C3AED)}
.__me{align-self:flex-end;max-width:84%;background:#5856D6;border-radius:42px 42px 12px 42px;padding:30px 40px;font-size:40px;line-height:1.35;min-height:112px}
.__short{min-height:0}
.__caret{display:inline-block;width:4px;height:44px;background:#fff;vertical-align:-8px;margin-left:4px}
.__slot{position:relative;align-self:flex-start;max-width:90%}
.__dots{position:absolute;left:0;top:0;display:flex;gap:14px;background:rgba(255,255,255,.1);border-radius:42px 42px 42px 12px;padding:34px 40px}
.__dots span{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.6)}
.__ai{align-self:flex-start;background:rgba(255,255,255,.1);border-radius:42px 42px 42px 12px;padding:30px 40px;font-size:40px;line-height:1.4}
.__sub{color:rgba(255,255,255,.72);font-size:36px}
.__done{display:flex;gap:20px}
"""
t_typ_end = 1.0
t_alice = max(1.45, cue(7, "intelig") - 0.05)
js = rise("#__eb", 0, y=30, d=0.4) + rise("#__h", 0.05, y=40, d=0.5) + rise("#__chat", 0.1, y=120, d=0.6)
js += f"""    const ty = {{n:0}}; const QS = {json.dumps(Q)};
    tl.fromTo(q("#__q"), {{opacity:0, y:30}}, {{opacity:1, y:0, duration:0.3, ease:"power3.out"}}, 0.25);
    tl.fromTo(ty, {{n:0}}, {{n:QS.length, duration:{round(t_typ_end - 0.3, 2)}, ease:"none", onUpdate(){{ q("#__qt").textContent = QS.slice(0, Math.round(ty.n)); }}}}, 0.3);
    tl.to(q("#__caret"), {{opacity:0, duration:0.05}}, {t_typ_end + 0.05});
"""
js += f'    tl.fromTo(q("#__dots"), {{opacity:0, scale:0.8}}, {{opacity:1, scale:1, duration:0.25, ease:"back.out(2)"}}, {t_typ_end + 0.1});\n'
for i in range(3):
    js += f'    tl.fromTo(q("#__dots span:nth-child({i+1})"), {{y:0}}, {{y:-10, duration:0.18, ease:"sine.out"}}, {round(t_typ_end + 0.2 + i * 0.1, 2)});\n'
    js += f'    tl.to(q("#__dots span:nth-child({i+1})"), {{y:0, duration:0.18, ease:"sine.in"}}, {round(t_typ_end + 0.38 + i * 0.1, 2)});\n'
js += f'    tl.to(q("#__dots"), {{opacity:0, duration:0.1}}, {t_alice});\n'
js += f'    tl.fromTo(q("#__a"), {{opacity:0, y:30}}, {{opacity:1, y:0, duration:0.35, ease:"power3.out"}}, {t_alice});\n'
for i in range(4):
    js += f'    tl.fromTo(q("#__a{i}"), {{opacity:0}}, {{opacity:1, duration:0.25}}, {round(t_alice + i * 0.22, 2)});\n'
t_ok = cue(7, "nexus") - 0.25
js += pop("#__ok", t_ok, s=0.7, d=0.4)
js += pop("#__done", cue(7, "responde") - 0.2, s=0.7, d=0.5)
# keep layout stable: answer/ok/done hidden until revealed (fromTo handles), dots collapse at answer
frames["07-alice"] = (d, css, body, js)

# ── 08 Tudo ───────────────────────────────────────────────────────────────────
d = DUR[8]
mods = ["Ordens de serviço", "PDV e caixa", "Estoque", "Tarefas", "Relatórios", "Pós-venda", "Catálogo online", "Alice (IA)"]
tiles = "".join(f'        <div class="__card __tile" id="__t{i}"><span class="__ti{" __tia" if i == 7 else ""}"></span><b>{m}</b></div>\n' for i, m in enumerate(mods))
body = f"""    <div class="__f">
      <div class="__eyebrow" id="__eb">Tudo da loja em um app</div>
      <div class="__h2" id="__h" style="font-size:76px">Da entrada do aparelho ao fechamento do caixa.</div>
      <div class="__grid">
{tiles}      </div>
    </div>
"""
css = """
.__grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:64px}
.__tile{border-radius:40px;padding:38px 40px;display:flex;flex-direction:column;gap:22px;font-size:40px}
.__ti{width:76px;height:76px;border-radius:22px;background:rgba(88,86,214,.12)}
.__tia{background:#5856D6}
"""
js = rise("#__eb", 0, y=30, d=0.35) + rise("#__h", 0.04, y=40, d=0.45)
for i in range(8):
    t = round(0.12 + i * 0.09, 2) if i < 7 else round(0.12 + 7 * 0.09 + 0.12, 2)
    js += f'    tl.fromTo(q("#__t{i}"), {{opacity:0, y:70, scale:0.92}}, {{opacity:1, y:0, scale:1, duration:0.45, ease:"{"back.out(1.8)" if i == 7 else "power3.out"}"}}, {round(t, 2)});\n'
frames["08-tudo"] = (d, css, body, js)

# ── 09 CTA ────────────────────────────────────────────────────────────────────
d = DUR[9]
body = """    <div class="__glow" id="__glow"></div>
    <div class="__f" style="align-items:center;justify-content:center;text-align:center;padding-bottom:100px">
      <div class="__tile" id="__tile"><img src="capture/assets/nexus-logo.png" alt="Nexus" class="__logo"></div>
      <div class="__h2" id="__h" style="margin-top:70px;font-size:90px">Sua assistência organizada a partir de hoje.</div>
      <div class="__pill __btn" id="__btn">Teste grátis por 15 dias</div>
      <div class="__muted" id="__nc" style="font-size:42px;margin-top:34px">Sem cartão de crédito.</div>
      <div class="__url" id="__url">nexusgestor.com</div>
    </div>
"""
css = """
.__glow{position:absolute;left:-60px;top:80px;width:1200px;height:1200px;border-radius:50%;background:radial-gradient(closest-side,rgba(162,28,240,.18),rgba(45,212,239,.09) 55%,rgba(242,242,247,0))}
.__tile{width:340px;height:340px;border-radius:78px;background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.13);display:flex;align-items:center;justify-content:center}
.__logo{width:305px;height:305px;object-fit:contain;display:block}
.__btn{margin-top:70px;background:#5856D6;color:#fff;padding:44px 86px;font-size:50px;box-shadow:0 18px 44px rgba(88,86,214,.35)}
.__url{font-size:52px;font-weight:700;color:#5856D6;margin-top:30px;letter-spacing:-.01em}
"""
js = '    tl.fromTo(q("#__glow"), {opacity:0, scale:0.7}, {opacity:1, scale:1, duration:0.9, ease:"power2.out"}, 0);\n'
js += pop("#__tile", 0, s=0.6, d=0.55)
js += rise("#__h", 0.15, y=50, d=0.55)
js += pop("#__btn", max(0.4, cue(9, "teste") + 0.1), s=0.6, d=0.5)
js += rise("#__nc", cue(9, "sem") - 0.1, y=30, d=0.4)
t_url = cue(9, "nexusgestor") - 0.15
js += rise("#__url", t_url, y=30, d=0.45)
js += f'    tl.to(q("#__btn"), {{scale:0.94, duration:0.12, ease:"power2.in"}}, {round(t_url + 0.5, 2)});\n'
js += f'    tl.to(q("#__btn"), {{scale:1, duration:0.4, ease:"back.out(3)"}}, {round(t_url + 0.62, 2)});\n'
frames["09-cta"] = (d, css, body, js)

os.makedirs(OUT, exist_ok=True)
for i, (fid, (d, css, body, js)) in enumerate(frames.items(), 1):
    prefix = f"f{fid[:2]}-"
    html = frame_html(fid, prefix, d, css, body, js)
    open(os.path.join(OUT, f"{fid}.html"), "w").write(html)
    print("wrote", fid, d)
