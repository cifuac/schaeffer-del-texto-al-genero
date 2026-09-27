/* ═══════════════════════════════════════════════════════════════════════
   DEL TEXTO AL GÉNERO · motor de la presentación horizontal
   Sin dependencias, sin red, funciona desde file://
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  /* ═════════════════ LIENZO: ESCALA DE LA DIAPOSITIVA ═════════════════
     El contenido vive en un lienzo fijo de 1280 × 720 —la medida de una
     diapositiva panorámica— y se escala en bloque para llenar la ventana.
     Así ninguna estación necesita desplazamiento: si no cabe, encoge. */
  var SLIDE_W = 1280, SLIDE_H = 720;
  var fitStage = function () {};

  function initStage() {
    var root = document.documentElement;
    var last = null;

    fitStage = function () {
      /* clientWidth/Height del documento es la medida fiable del área visible:
         innerWidth incluye la barra de desplazamiento y algunos navegadores la
         falsean con zoom. */
      var vw = root.clientWidth || window.innerWidth;
      var vh = root.clientHeight || window.innerHeight;
      var s = Math.min(vw / SLIDE_W, vh / SLIDE_H);
      if (s === last) return;
      last = s;
      root.style.setProperty("--slide-scale", String(s));
      var margin = Math.max(vw - SLIDE_W * s, vh - SLIDE_H * s);
      document.body.classList.toggle("boxed", margin > 6);
    };

    fitStage();

    /* El evento «resize» no siempre llega —cambio de pantalla o de zoom, vuelta
       desde la caché de retroceso, ventana redimensionada en segundo plano— y una
       escala obsoleta recorta la diapositiva. El observador sí ve cualquier cambio
       de la caja del documento; los demás avisos quedan como refuerzo. */
    if (window.ResizeObserver) new ResizeObserver(fitStage).observe(root);
    window.addEventListener("resize", fitStage);
    window.addEventListener("orientationchange", fitStage);
    window.addEventListener("pageshow", fitStage);
    document.addEventListener("fullscreenchange", fitStage);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", fitStage);
  }

  /* ═════════════════ MOTOR DE DIAPOSITIVAS ═════════════════ */
  var Deck = {
    panels: [], idx: 0, track: null, locked: false,

    init: function () {
      var self = this;
      this.track = $("#track");
      this.panels = $$(".panel");
      this.dots = $("#navDots");
      this.counter = $("#navCounter");
      this.tag = $("#chapterTag");
      this.prog = $("#progBar");
      this.btnPrev = $("#btnPrev");
      this.btnNext = $("#btnNext");

      this.panels.forEach(function (p, i) {
        var b = el("button", { type: "button", "aria-label": "Ir a " + (p.getAttribute("data-nav") || ("estación " + i)) });
        b.addEventListener("click", function () { self.go(i); });
        self.dots.appendChild(b);
      });

      this.btnPrev.addEventListener("click", function () { self.go(self.idx - 1); });
      this.btnNext.addEventListener("click", function () { self.go(self.idx + 1); });

      /* enlaces internos */
      document.addEventListener("click", function (e) {
        var t = e.target.closest ? e.target.closest("[data-goto], [data-go]") : null;
        if (!t) return;
        var id = t.getAttribute("data-goto") || t.getAttribute("data-go");
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        self.go(self.panels.indexOf(target));
      });

      /* El deck nunca debe desplazarse por su cuenta: el foco o scrollIntoView
         dentro de una diapositiva pueden mover el contenedor y desalinear el
         translate del carril. Se anula en cuanto ocurre. */
      var deck = $("#deck");
      deck.addEventListener("scroll", function () {
        if (deck.scrollLeft !== 0) deck.scrollLeft = 0;
        if (deck.scrollTop !== 0) deck.scrollTop = 0;
      }, { passive: true });

      this.buildIndex();
      this.bindWheel();
      this.bindTouch();
      this.bindKeys();

      window.addEventListener("resize", function () { self.place(true); });

      window.addEventListener("hashchange", function () {
        var h = document.getElementById(location.hash.slice(1));
        var k = h ? self.panels.indexOf(h) : -1;
        if (k > -1 && k !== self.idx) self.go(k);
      });

      var start = 0;
      if (location.hash) {
        var h = document.getElementById(location.hash.slice(1));
        if (h && this.panels.indexOf(h) > -1) start = this.panels.indexOf(h);
      }
      this.go(start, true);
    },

    place: function (instant) {
      if (instant) this.track.classList.add("no-anim");
      this.track.style.transform = "translateX(" + (-this.idx * 100) + "%)";
      if (instant) {
        var t = this.track;
        requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.remove("no-anim"); }); });
      }
    },

    go: function (i, instant) {
      var self = this;
      fitStage();
      i = Math.max(0, Math.min(this.panels.length - 1, i));
      var changed = i !== this.idx || instant;
      this.idx = i;
      var deck = $("#deck");
      deck.scrollLeft = 0; deck.scrollTop = 0;
      var frame = $("#stageFrame");
      if (frame) { frame.scrollLeft = 0; frame.scrollTop = 0; }
      this.place(instant);

      this.panels.forEach(function (p, k) {
        var active = k === i;
        p.classList.toggle("is-active", active);
        p.setAttribute("aria-hidden", active ? "false" : "true");
        if ("inert" in HTMLElement.prototype) p.inert = !active;
        if (active) {
          $$("[data-anim]", p).forEach(function (n, j) {
            n.style.animationDelay = (0.05 + j * 0.075).toFixed(3) + "s";
          });
          var inner = $(".panel-inner", p);
          if (inner) inner.scrollTop = 0;
        }
      });

      $$("button", this.dots).forEach(function (b, k) {
        b.classList.toggle("is-active", k === i);
        b.setAttribute("aria-current", k === i ? "true" : "false");
      });

      var p = this.panels[i];
      this.tag.textContent = p.getAttribute("data-chapter") || "";
      this.counter.textContent = String(i).padStart(2, "0") + " / " + String(this.panels.length - 1).padStart(2, "0");
      this.btnPrev.disabled = i === 0;
      this.btnNext.disabled = i === this.panels.length - 1;
      this.prog.style.width = ((i / (this.panels.length - 1)) * 100) + "%";

      /* color de la estación → capas de fondo */
      var accent = getComputedStyle(p).getPropertyValue("--accent").trim();
      if (accent) document.documentElement.style.setProperty("--deck-accent", accent);

      if (changed) {
        try { history.replaceState(null, "", "#" + p.id); } catch (e) {}
      }

      var dot = $$("button", this.dots)[i];
      if (dot) {
        /* Desplaza solo la fila de puntos. scrollIntoView también desplazaba el
           lienzo fijo y recortaba por la izquierda las estaciones finales. */
        var dotCenter = dot.offsetLeft - this.dots.offsetLeft + dot.offsetWidth / 2;
        var left = dotCenter - this.dots.clientWidth / 2;
        var max = Math.max(0, this.dots.scrollWidth - this.dots.clientWidth);
        this.dots.scrollTo({
          left: Math.max(0, Math.min(max, left)),
          behavior: reduce ? "auto" : "smooth"
        });
      }
    },

    next: function () { this.go(this.idx + 1); },
    prev: function () { this.go(this.idx - 1); },

    lock: function (ms) {
      var self = this;
      this.locked = true;
      clearTimeout(this._lt);
      this._lt = setTimeout(function () { self.locked = false; }, ms || 780);
    },

    bindWheel: function () {
      var self = this;
      var acc = 0, at = 0;
      $("#deck").addEventListener("wheel", function (e) {
        if (!$("#indexPanel").hidden) return;
        var dx = e.deltaX, dy = e.deltaY;
        var horiz = Math.abs(dx) > Math.abs(dy);
        var d = horiz ? dx : dy;

        e.preventDefault();
        if (self.locked) return;

        var now = Date.now();
        if (now - at > 220) acc = 0;
        at = now;
        acc += d;
        if (Math.abs(acc) > 46) {
          acc > 0 ? self.next() : self.prev();
          acc = 0;
          self.lock();
        }
      }, { passive: false });
    },

    bindTouch: function () {
      var self = this;
      var x0 = null, y0 = null, moved = false;
      var deck = $("#deck");

      deck.addEventListener("touchstart", function (e) {
        if (e.touches.length !== 1) { x0 = null; return; }
        x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; moved = false;
      }, { passive: true });

      deck.addEventListener("touchmove", function (e) {
        if (x0 == null || moved) return;
        var dx = e.touches[0].clientX - x0;
        var dy = e.touches[0].clientY - y0;
        if (Math.abs(dx) > 58 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          moved = true;
          dx < 0 ? self.next() : self.prev();
        }
      }, { passive: true });

      deck.addEventListener("touchend", function () { x0 = null; }, { passive: true });
    },

    bindKeys: function () {
      var self = this;
      document.addEventListener("keydown", function (e) {
        var t = e.target;
        var typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
        var panelOpen = !$("#indexPanel").hidden;

        if (e.key === "Escape" && panelOpen) { toggleIndex(false); return; }
        if (e.metaKey || e.ctrlKey || e.altKey) return;

        if (!typing) {
          if (e.key === "i" || e.key === "I") { e.preventDefault(); toggleIndex(); return; }
          if (e.key === "t" || e.key === "T") { e.preventDefault(); $("#btnTheme").click(); return; }
          if (e.key === "f" || e.key === "F") { e.preventDefault(); $("#btnFull").click(); return; }
        }
        if (panelOpen) return;

        if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !typing)) {
          e.preventDefault(); self.next();
        } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
          e.preventDefault(); self.prev();
        } else if (e.key === "Home") { e.preventDefault(); self.go(0); }
        else if (e.key === "End") { e.preventDefault(); self.go(self.panels.length - 1); }
      });
    },

    buildIndex: function () {
      var self = this;
      var host = $("#indexList");
      this.panels.forEach(function (p, i) {
        var accentName = p.getAttribute("data-accent") || "oro";
        if (accentName === "dual") accentName = "oro";
        var card = el("button", { type: "button", class: "index-card", "data-i": String(i) });
        card.style.setProperty("--c", "var(--" + accentName + ")");
        card.appendChild(el("span", { class: "ic-n" }, String(i).padStart(2, "0")));
        card.appendChild(el("span", { class: "ic-t" }, p.getAttribute("data-nav") || p.id));
        card.appendChild(el("span", { class: "ic-c" }, p.getAttribute("data-chapter") || ""));
        card.addEventListener("click", function () { self.go(i); toggleIndex(false); });
        host.appendChild(card);
      });
    }
  };

  /* ═════════════════ ÍNDICE, TEMA, PANTALLA ═════════════════ */
  function toggleIndex(force) {
    var panel = $("#indexPanel");
    var btn = $("#btnIndex");
    var open = typeof force === "boolean" ? force : panel.hidden;
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      $$(".index-card", panel).forEach(function (c, i) { c.classList.toggle("is-active", i === Deck.idx); });
      var cur = $$(".index-card", panel)[Deck.idx];
      if (cur) cur.focus();
    } else {
      btn.focus();
    }
  }

  function initChrome() {
    var root = document.documentElement;
    var saved = null;
    try { saved = localStorage.getItem("schaeffer-theme"); } catch (e) {}
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);

    $("#btnTheme").addEventListener("click", function () {
      var cur = root.getAttribute("data-theme");
      if (!cur) {
        var sysDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        cur = sysDark ? "dark" : "light";
      }
      var next = cur === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("schaeffer-theme", next); } catch (e) {}
      var p = Deck.panels[Deck.idx];
      if (p) {
        var accent = getComputedStyle(p).getPropertyValue("--accent").trim();
        if (accent) root.style.setProperty("--deck-accent", accent);
      }
    });

    $("#btnIndex").addEventListener("click", function () { toggleIndex(); });
    $("#indexPanel").addEventListener("click", function (e) {
      if (e.target === this || e.target.hasAttribute("data-close-index")) toggleIndex(false);
    });

    $("#btnFull").addEventListener("click", function () {
      if (!document.fullscreenElement) {
        (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
      } else {
        (document.exitFullscreen || function () {}).call(document);
      }
    });
  }

  /* ═════════════════ FONDO: RED TEXTUAL ═════════════════ */
  function initAmbient() {
    if (reduce) return;
    var cv = $("#ambient");
    var ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pts = [], W = 0, H = 0, raf = null;

    function resize() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(20, Math.min(52, Math.round((W * H) / 38000)));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - .5) * .14, vy: (Math.random() - .5) * .14,
          r: Math.random() * 1.7 + .5
        });
      }
    }

    function draw() {
      var accent = getComputedStyle(document.documentElement).getPropertyValue("--deck-accent").trim() || "#e8b96a";
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = accent; ctx.fillStyle = accent;

      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
        ctx.globalAlpha = .32;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      for (var a = 0; a < pts.length; a++) {
        for (var b = a + 1; b < pts.length; b++) {
          var dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 24000) {
            ctx.globalAlpha = .15 * (1 - d2 / 24000);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    draw();
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(draw);
    });
  }

  /* ═════════════════ § 1 · LA PREGUNTA ═════════════════ */
  var PREG_STEPS = [
    {
      h: "Paso 1 · La pregunta aparente",
      html: "<p>«<b>¿Qué es un género?</b>» parece inocente. Ha recibido, sin embargo, respuestas incompatibles entre sí: el género sería ya una norma, ya una esencia ideal, ya un modelo de competencia, ya un simple término de clasificación sin productividad textual propia.</p><p>Que una misma pregunta admita respuestas tan dispares es la primera señal de que algo falla en la pregunta.</p>"
    },
    {
      h: "Paso 2 · La reformulación",
      html: "<p>La pregunta (1) no suele ser más que una <b>forma abreviada</b> de la pregunta (2). Reformularla parece un avance: pone en escena los dos términos del problema.</p><p>Pero esa reformulación «corre el riesgo de estar sujeta a <b>dos confusiones mayores</b>».</p>"
    },
    {
      h: "Paso 3 · Primera confusión",
      html: "<p>(2) mezcla dos preguntas que hay que mantener separadas.</p><p><b>(2a)</b> es un problema de <b>clasificación</b>: cómo se agrupan los textos en clases. <b>(2b)</b> es un problema <b>histórico y productivo</b>: qué hace un texto concreto con el modelo que hereda.</p><p>Confundirlas es el indicio de una confusión más fundamental —y el origen del enredo que el artículo se dedica a deshacer—.</p>"
    },
    {
      h: "Paso 4 · El desvío",
      html: "<p>Segunda confusión, la decisiva: por su estructura sintáctica y semántica, la formulación (2) <b>amenaza desviar el debate de forma subrepticia</b> hacia la pregunta (3).</p><p>Y (3) ya no es una pregunta de teoría literaria: es la vieja querella de los universales. En ese terreno el teórico de la literatura es de antemano el perdedor.</p>"
    }
  ];

  function initPreguntas() {
    var ap = $("#ap-preguntas");
    if (!ap) return;
    var ro = $("#ro-preguntas"), dots = $("#sdots-preguntas");
    var prev = $("[data-step-prev]", ap), next = $("[data-step-next]", ap);
    var step = 0;

    PREG_STEPS.forEach(function (s, i) {
      var b = el("button", { type: "button", "aria-label": "Paso " + (i + 1) });
      b.addEventListener("click", function () { go(i); });
      dots.appendChild(b);
    });

    function go(n) {
      step = Math.max(0, Math.min(PREG_STEPS.length - 1, n));
      ap.setAttribute("data-step", String(step));
      $$("[data-s]", ap).forEach(function (node) {
        var s = parseInt(node.getAttribute("data-s"), 10);
        node.classList.toggle("is-on", s <= step);
        node.classList.toggle("is-cur", s === step);
      });
      ro.innerHTML = "<h4>" + PREG_STEPS[step].h + "</h4>" + PREG_STEPS[step].html;
      $$("button", dots).forEach(function (b, i) { b.classList.toggle("is-on", i <= step); });
      prev.disabled = step === 0;
      next.disabled = step === PREG_STEPS.length - 1;
    }

    prev.addEventListener("click", function () { go(step - 1); });
    next.addEventListener("click", function () { go(step + 1); });
    go(0);
  }

  /* ═════════════════ § 2 · TRILEMA ═════════════════ */
  function initTrilema() {
    var ap = $("#ap-trilema");
    if (!ap) return;
    $$(".tcard", ap).forEach(function (card) {
      function toggle() {
        var open = card.classList.toggle("open");
        card.setAttribute("aria-expanded", open ? "true" : "false");
      }
      card.addEventListener("click", toggle);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
    });
    var bc = $("#btnConverge");
    if (bc) bc.addEventListener("click", function () { ap.classList.add("converged"); });
  }

  /* ═════════════════ § 3 · HELDENEPOS ═════════════════ */
  var HELD_TEXTS = [
    { t1: "Canción de los", t2: "nibelungos", g: .93, gl: "hegemónico" },
    { t1: "Poema de", t2: "Wolfdietrich", g: .72, gl: "fuerte" },
    { t1: "Poema de", t2: "Dietrich", g: .63, gl: "fuerte" },
    { t1: "Poema de", t2: "Ortnit", g: .50, gl: "medio" },
    { t1: "Poema de", t2: "Kudrun", g: .34, gl: "debilitado" },
    { t1: "La muerte de", t2: "Alphart", g: .07, gl: "casi nulo" }
  ];

  var HELD_MODES = {
    proyeccion: {
      caption: "Estado 1 · Cada obra se conecta, una a una, con la cosmovisión postulada. La crítica ordena entonces los textos por cantidad de espíritu germánico: hegemónico en la Canción de los nibelungos, debilitado en el Poema de Kudrun, casi sin huellas en La muerte de Alphart.",
      findings: [
        { cls: "", h: "El procedimiento", p: "Se aíslan en los textos, uno a uno, los elementos que se consideran relacionados con la cosmovisión germánica de en torno al año 500 d.C." },
        { cls: "", h: "La jerarquía", p: "Como el espíritu germánico no se plasma igual en todas las obras, se las ordena según su cantidad. La desviación se explica como pérdida o contaminación." },
        { cls: "warn", h: "Lo que nadie comprueba", p: "Que esos elementos formen una red de similitudes entre las obras. Cada uno se relaciona con el postulado, no con las demás obras." }
      ]
    },
    textual: {
      caption: "Estado 2 · Retirado el postulado, se intenta trazar la red de similitudes que unirían a estos textos entre sí. Aparecen coincidencias aisladas, pero no una configuración común. El género no sobrevive a la prueba.",
      findings: [
        { cls: "good", h: "La prueba", p: "Los rasgos extraídos no tejen ningún conjunto de similitudes entre los diferentes textos reales." },
        { cls: "warn", h: "El resultado", p: "«Este “género”, que había hecho correr ríos de tinta patriótica y nacionalista, es, textualmente hablando, inexistente» (p. 164)." },
        { cls: "", h: "Qué se construyó", p: "Un género meramente imaginario: un texto ideal del que todos los textos reales no son más que ecos más o menos lejanos." }
      ]
    },
    germanistik: {
      caption: "Estado 3 · Si el género no está en los textos del siglo XIII, ¿dónde está? En el metatexto que lo postuló. La flecha desciende hacia el siglo XIX: ahí sí hay un género real, con sus reglas y su productividad.",
      findings: [
        { cls: "", h: "Desplazamiento", p: "El género cambia de siglo y de plano: deja de ser literario y medieval para ser metaliterario y decimonónico." },
        { cls: "warn", h: "La carga ideológica", p: "La oposición con la epopeya cortesana artúrica era también política: el alma germánica frente a un producto de importación francesa." },
        { cls: "good", h: "La lección de método", p: "Un género construido por proyección retrospectiva describe siempre mejor a quien lo construye que a los textos que pretende agrupar." }
      ]
    }
  };

  function initHeldenepos() {
    var ap = $("#ap-heldenepos");
    if (!ap) return;
    var gNodes = $("#heldNodes"), gRays = $("#rays"), gEdges = $("#edges");
    var caption = $("#heldCaption"), findings = $("#heldFindings");
    var positions = [];

    var SUN_X = 560, SUN_Y = 128, TOP = 264, BW = 152, BH = 48;

    HELD_TEXTS.forEach(function (t, i) {
      var cx = 115 + i * 178, top = TOP;
      positions.push({ cx: cx, top: top });

      /* rayo curvo: la proyección desciende desde el postulado hasta la obra */
      gRays.appendChild(svg("path", {
        class: "ray",
        d: "M " + SUN_X + " " + SUN_Y +
           " C " + SUN_X + " " + (SUN_Y + 62) +
           " " + cx + " " + (top - 86) +
           " " + cx + " " + (top - 10)
      }));

      var g = svg("g", { class: "hnode", "data-i": String(i) });
      g.appendChild(svg("rect", { class: "hnode-box", x: cx - BW / 2, y: top, width: BW, height: BH, rx: 6 }));
      var l1 = svg("text", { class: "hnode-title", x: cx, y: top + 20, "text-anchor": "middle" }); l1.textContent = t.t1;
      var l2 = svg("text", { class: "hnode-title", x: cx, y: top + 35, "text-anchor": "middle" }); l2.textContent = t.t2;
      g.appendChild(l1); g.appendChild(l2);
      g.appendChild(svg("rect", { class: "hnode-bar-bg", x: cx - 62, y: top + 62, width: 124, height: 5, rx: 2.5 }));
      g.appendChild(svg("rect", { class: "hnode-bar", x: cx - 62, y: top + 62, width: 124 * t.g, height: 5, rx: 2.5 }));
      var gl = svg("text", { class: "hnode-grade", x: cx, y: top + 84, "text-anchor": "middle" }); gl.textContent = t.gl;
      g.appendChild(gl);
      gNodes.appendChild(g);
    });

    /* las únicas coincidencias sueltas que aparecen sin el postulado */
    [[0, 1], [2, 3]].forEach(function (pair) {
      var a = positions[pair[0]], b = positions[pair[1]];
      var mx = (a.cx + b.cx) / 2;
      gEdges.appendChild(svg("path", {
        class: "edge",
        d: "M " + a.cx + " " + (a.top + 96) + " Q " + mx + " " + (a.top + 136) + " " + b.cx + " " + (b.top + 96)
      }));
    });

    var scatter = [[-4, 16], [5, -12], [-6, 10], [4, 20], [-3, -14], [7, 8]];

    function setMode(mode) {
      ap.setAttribute("data-mode", mode);
      $$(".mbtn", ap).forEach(function (b) {
        var on = b.getAttribute("data-mode") === mode;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      $$(".hnode", gNodes).forEach(function (n, i) {
        n.setAttribute("transform", mode === "textual"
          ? "translate(" + scatter[i][0] + "," + scatter[i][1] + ")" : "translate(0,0)");
      });

      var cfg = HELD_MODES[mode];
      caption.textContent = cfg.caption;
      findings.innerHTML = "";
      cfg.findings.forEach(function (f, i) {
        var d = el("div", { class: "finding " + f.cls });
        d.style.animationDelay = (i * 90) + "ms";
        d.appendChild(el("p", { class: "fh" }, f.h));
        d.appendChild(el("p", null, f.p));
        findings.appendChild(d);
      });
    }

    $$(".mbtn", ap).forEach(function (b) {
      b.addEventListener("click", function () { setMode(b.getAttribute("data-mode")); });
    });
    setMode("proyeccion");
  }

  /* ═════════════════ § 4 · CADENA Y CIRCUITO ═════════════════ */
  function initCadena() {
    var ap = $("#ap-cadena");
    if (!ap) return;
    ap.setAttribute("data-cad", "organismo");
    $$(".mbtn", ap).forEach(function (b) {
      b.addEventListener("click", function () {
        ap.setAttribute("data-cad", b.getAttribute("data-cad"));
        $$(".mbtn", ap).forEach(function (o) {
          var on = o === b;
          o.classList.toggle("is-on", on);
          o.setAttribute("aria-selected", on ? "true" : "false");
        });
      });
    });
  }

  var CIRC = {
    texto: {
      mid: "texto",
      back: "sin retroalimentación en acto",
      note: "Toda lectura es la resultante de al menos dos intenciones o estrategias comunicativas: la del codificador y la del descodificador. Ambas pueden ocultarse parcialmente, y sus relaciones comprenden necesariamente elementos aleatorios, aunque solo fuese porque en un texto no hay retroalimentación en acto."
    },
    conversacion: {
      mid: "palabra viva",
      back: "retroalimentación en acto",
      note: "En una conversación de viva voz el circuito se cierra: cada intención se corrige sobre la marcha. Es la diferencia con la que Schaeffer explica el «frenesí interpretativo» que provoca cierta poesía lírica: un texto que se niega a tematizar su intencionalidad comunicativa deja al lector ante un horror vacui, una suspensión provisional de la actividad semántica."
    }
  };

  function initCircuito() {
    var ap = $("#ap-circuito");
    if (!ap) return;
    function set(k) {
      ap.setAttribute("data-circ", k);
      $("#circMid").textContent = CIRC[k].mid;
      $("#circBack").textContent = CIRC[k].back;
      $("#circNote").textContent = CIRC[k].note;
      $$(".minib", ap).forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-circ") === k); });
    }
    $$(".minib", ap).forEach(function (b) {
      b.addEventListener("click", function () { set(b.getAttribute("data-circ")); });
    });
    set("texto");
  }

  /* ═════════════════ § 5 · ROSA TRANSTEXTUAL ═════════════════ */
  var ROSA = [
    { id: "para", ang: -90, label: "paratextualidad", partner: "su texto",
      h: "Paratextualidad",
      html: "<p>Relaciones de un texto con su título, su subtítulo y, más en general, con su contexto externo.</p><p><b>Cada paratexto tiene el texto que incluye.</b> Hay una pareja relacional identificable.</p>" },
    { id: "inter", ang: -18, label: "intertextualidad", partner: "el texto citado",
      h: "Intertextualidad",
      html: "<p>La cita, la alusión.</p><p><b>Cada intertexto tiene su texto citado.</b> La pareja está ahí, localizable.</p>" },
    { id: "hiper", ang: 54, label: "hipertextualidad", partner: "su hipotexto",
      h: "Hipertextualidad",
      html: "<p>Relaciones de imitación o transformación entre dos textos, o entre un texto y un estilo.</p><p><b>Cada hipertexto posee su hipotexto.</b> Y siempre hay pacto hipertextual: una estrategia discursiva reconstruible.</p>" },
    { id: "meta", ang: 126, label: "metatextualidad", partner: "su texto-objeto",
      short: true,
      h: "Metatextualidad",
      html: "<p>Relaciones entre un texto y su comentario.</p><p><b>Cada metatexto tiene su texto-objeto.</b> Aquí se aloja, por cierto, la propia teoría de los géneros.</p>" },
    { id: "archi", ang: 198, label: "architextualidad", partner: "¿?", alert: true,
      h: "Architextualidad · el zócalo vacío",
      html: "<p>«el conjunto de las categorías generales, o transcendentes, de las que es muestra cada texto». Aquí aloja Genette la genericidad, junto a los tipos de discurso y los modos de enunciación.</p><p><b>Pero no hay architexto</b>, sino en un sentido metafórico. Las otras cuatro determinan parejas relacionales de textos; en el caso de la architextualidad no hay nada de esto.</p><p>La asimetría no es un detalle de nomenclatura: es la grieta por donde Schaeffer entra a separar el género de la genericidad.</p>" }
  ];

  function initRosa() {
    var ap = $("#ap-rosa");
    if (!ap) return;
    var gLinks = $("#rosaLinks"), gSats = $("#rosaSats"), gPartner = $("#rosaPartner");
    var btns = $("#rosaButtons"), ro = $("#rosaReadout");
    /* disposición elíptica: el lienzo es apaisado, la rosa también */
    var CX = 450, CY = 250, RCORE = 50;
    var RSX = 200, RSY = 120, RPX = 340, RPY = 205;

    /* ancho de píldora según la longitud de la etiqueta: nada de cajas fijas */
    function pillW(text) { return Math.round(text.length * 6.15 + 30); }

    ROSA.forEach(function (r) {
      var rad = r.ang * Math.PI / 180;
      var cos = Math.cos(rad), sin = Math.sin(rad);
      r.x = CX + RSX * cos; r.y = CY + RSY * sin;
      r.px = CX + RPX * cos; r.py = CY + RPY * sin;
      r.w = pillW(r.label);
      r.pw = pillW(r.partner);

      /* dirección real núcleo → satélite (no coincide con el ángulo por la elipse) */
      var dx = r.x - CX, dy = r.y - CY, d = Math.sqrt(dx * dx + dy * dy) || 1;
      r.ux = dx / d; r.uy = dy / d;
      var pdx = r.px - r.x, pdy = r.py - r.y, pd = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
      r.pux = pdx / pd; r.puy = pdy / pd;

      gLinks.appendChild(svg("line", {
        class: "rosa-link" + (r.alert ? " archi" : ""), "data-id": r.id,
        x1: CX + (RCORE + 4) * r.ux, y1: CY + (RCORE + 4) * r.uy,
        x2: r.x - 24 * r.ux, y2: r.y - 18 * r.uy
      }));

      var g = svg("g", { class: "sat" + (r.alert ? " archi" : ""), "data-id": r.id });
      g.appendChild(svg("rect", { class: "sat-box", x: r.x - r.w / 2, y: r.y - 17, width: r.w, height: 34, rx: 17 }));
      var t = svg("text", { class: "sat-lab", x: r.x, y: r.y + 4, "text-anchor": "middle" });
      t.textContent = r.label;
      g.appendChild(t);
      g.addEventListener("click", function () { select(r.id); });
      gSats.appendChild(g);

      var b = el("button", { type: "button", "data-id": r.id, class: r.alert ? "archi" : "" }, r.label);
      b.addEventListener("click", function () { select(r.id); });
      btns.appendChild(b);
    });

    function select(id) {
      var r = null;
      ROSA.forEach(function (x) { if (x.id === id) r = x; });
      if (!r) return;

      $$(".sat", gSats).forEach(function (s) { s.classList.toggle("is-on", s.getAttribute("data-id") === id); });
      $$(".rosa-link", gLinks).forEach(function (l) { l.classList.toggle("is-on", l.getAttribute("data-id") === id); });
      $$("button", btns).forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-id") === id); });

      gPartner.innerHTML = "";
      var empty = !!r.alert;
      gPartner.appendChild(svg("line", {
        class: "partner-link" + (empty ? " empty" : ""),
        x1: r.x + 22 * r.pux, y1: r.y + 20 * r.puy,
        x2: r.px - 28 * r.pux, y2: r.py - 24 * r.puy
      }));

      if (empty) {
        gPartner.appendChild(svg("circle", { class: "partner-box empty", cx: r.px, cy: r.py, r: 24 }));
        var z = svg("text", { class: "partner-lab empty big", x: r.px, y: r.py + 8, "text-anchor": "middle" });
        z.textContent = "∅";
        gPartner.appendChild(z);
        var cap = svg("text", { class: "partner-lab empty", x: r.px, y: r.py + 46, "text-anchor": "middle" });
        cap.textContent = "no hay architexto";
        gPartner.appendChild(cap);
      } else {
        gPartner.appendChild(svg("rect", {
          class: "partner-box", x: r.px - r.pw / 2, y: r.py - 16, width: r.pw, height: 32, rx: 6
        }));
        var t = svg("text", { class: "partner-lab", x: r.px, y: r.py + 4, "text-anchor": "middle" });
        t.textContent = r.partner;
        gPartner.appendChild(t);
      }

      ro.className = "rosa-readout" + (empty ? " alert" : "");
      ro.innerHTML = "<h4>" + r.h + "</h4>" + r.html;
    }

    select("para");
  }

  /* ═════════════════ § 5b · LAS DOS MÁQUINAS ═════════════════ */
  function initMaquinas() {
    var basePts = [[110, 28], [350, 28], [350, 132], [110, 132]];
    var genPts = basePts.map(function (p) { return p.slice(); });
    var runs = 0;

    function ptsToString(pts) {
      return pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
    }

    $$("[data-run]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var kind = btn.getAttribute("data-run");
        var host = kind === "gen" ? $("#machGen") : $("#machPert");
        var feeder = $(".feeder", host);
        feeder.classList.remove("run");
        void feeder.getBoundingClientRect().width;
        feeder.classList.add("run");
        if (kind !== "gen") return;

        runs++;
        var mold = $("#genMold");
        var from = genPts.map(function (p) { return p.slice(); });
        var amp = Math.min(34, 11 + runs * 5);
        var to = from.map(function (p, i) {
          var dx = Math.sin(runs * 2.1 + i * 1.7) * amp;
          var dy = Math.cos(runs * 1.3 + i * 2.4) * amp * .6;
          return [Math.max(40, Math.min(424, p[0] + dx)), Math.max(16, Math.min(146, p[1] + dy))];
        });

        if (reduce) { genPts = to; mold.setAttribute("points", ptsToString(to)); return; }

        var start = null, dur = 1400;
        function frame(ts) {
          if (start == null) start = ts;
          var k = Math.min(1, (ts - start) / dur);
          var e = 1 - Math.pow(1 - k, 3);
          mold.setAttribute("points", ptsToString(from.map(function (p, i) {
            return [lerp(p[0], to[i][0], e), lerp(p[1], to[i][1], e)];
          })));
          if (k < 1) requestAnimationFrame(frame); else genPts = to;
        }
        requestAnimationFrame(frame);
      });
    });
  }

  /* ═════════════════ § 6 · MÁQUINA DEL TIEMPO ═════════════════ */
  function initTiempo() {
    var host = $("#ap-tiempo");
    if (!host) return;
    var letters = ["a", "b", "c", "d", "e", "f", "g"];
    var wrap = $("#tlTexts"), range = $("#tlRange"), ro = $("#tlReadout");
    var cls = $("#tlClass"), ghost = $("#tlGhost"), project = $("#tlProject"), warn = $("#tlWarn");

    letters.forEach(function (l, i) {
      var d = el("div", { class: "tl-t", "data-i": String(i) });
      d.appendChild(el("div", { class: "tl-dot" }, l));
      d.appendChild(el("div", { class: "tl-cap" }, ""));
      wrap.appendChild(d);
    });

    function render() {
      var cur = parseInt(range.value, 10);
      $$(".tl-t", wrap).forEach(function (n, i) {
        n.classList.remove("model", "cur", "future");
        var cap = $(".tl-cap", n);
        if (i < cur) { n.classList.add("model"); cap.textContent = "modelo disponible"; }
        else if (i === cur) { n.classList.add("cur"); cap.textContent = "texto en gestación"; }
        else { n.classList.add("future"); cap.textContent = "aún no existe"; }
      });

      var closed = cur === letters.length - 1;
      cls.classList.toggle("closed", closed);

      var model = letters.slice(0, cur), t = letters[cur], html = "";
      html += "El texto <em>" + t + "</em> surge en el momento <em>t</em>.<br>";
      if (!model.length) {
        html += "Modelo genérico disponible: <span class=\"bad\">∅</span> — no hay serie previa, y sin embargo este texto entrará después en la clase.<br>";
      } else {
        html += "Modelo genérico disponible: <span class=\"set\">{" + model.join(", ") + "}</span><br>";
      }
      html += "Género <em>G</em> (retrospectivo): <span class=\"setg\">{" + letters.join(", ") + "}</span>";
      if (closed) {
        html += " — la clase queda fijada <em>ahora</em>, cuando el último texto entra en el circuito de la comunicación social.<br>Caso límite: solo aquí coinciden el modelo textual y el género retrospectivo.";
      } else {
        html += "<br><span class=\"bad\">{" + model.join(", ") + "} ≠ {" + letters.join(", ") + "}</span> — el modelo genérico textual nunca es idéntico al retrospectivo.";
      }
      if (project.checked) html += "<br><span class=\"bad\">⚠ Se está proyectando G sobre un texto que no pudo conocerlo.</span>";
      ro.innerHTML = html;

      ghost.hidden = !project.checked;
      warn.hidden = !project.checked;
    }

    range.addEventListener("input", render);
    project.addEventListener("change", render);
    render();
  }

  /* ═════════════════ § 7 · CLASIFICADOR ═════════════════ */
  var QUIZ = [
    { t: "Es una categoría de clasificación retrospectiva.", a: "genero", e: "Solo queda fijada cuando el último texto de la serie ha entrado en circulación." },
    { t: "Es un factor productivo de la constitución de la textualidad.", a: "genericidad", e: "Es la definición misma que Schaeffer opone a la del género (p. 174)." },
    { t: "Estructura un cierto tipo de lectura: es una norma de lectura.", a: "genero", e: "Su componente prescriptivo es de lectura, no de escritura." },
    { t: "Todo texto la ejerce modificando el modelo que hereda.", a: "genericidad", e: "«Todo texto modifica “su” género»: el modelo es un material sobre el que se trabaja." },
    { t: "Depende de la estrategia discursiva del metatexto, es decir, del teórico.", a: "genero", e: "El teórico elige las fronteras, el nivel de abstracción y el modelo explicativo." },
    { t: "Su modelo está formado únicamente por los textos anteriores.", a: "genericidad", e: "De ahí el error de lógica temporal de la estación 11." },
    { t: "Se funda en parecidos de familia, en el sentido de Wittgenstein.", a: "genero", e: "No es arbitraria: se manifiesta por similitudes textuales, sin necesidad de esencia." },
    { t: "Consiste en un remiendo más o menos transformador del armazón de uno o varios hipotextos.", a: "genericidad", e: "Por eso el postulado de un modelo de competencia resulta superfluo." },
    { t: "Tiene dos regímenes: la reduplicación y la transformación.", a: "genericidad", e: "Son las dos caras de una misma función textual." },
    { t: "Pertenece al campo de las categorías de la lectura.", a: "genero", e: "Frente a la genericidad, que pertenece al de la productividad textual." }
  ];

  function initQuiz() {
    var host = $("#quizz");
    if (!host) return;
    var state = QUIZ.map(function () { return null; });

    QUIZ.forEach(function (q, i) {
      var row = el("div", { class: "qrow", "data-i": String(i) });
      row.appendChild(el("p", null, q.t));
      var opts = el("div", { class: "qopts" });
      ["genero", "genericidad"].forEach(function (k) {
        var b = el("button", { type: "button", class: "qopt", "data-k": k }, k === "genero" ? "Género" : "Genericidad");
        b.addEventListener("click", function () {
          state[i] = k;
          $$(".qopt", opts).forEach(function (o) { o.classList.toggle("sel", o === b); });
          row.classList.remove("ok", "no", "checked");
        });
        opts.appendChild(b);
      });
      row.appendChild(opts);
      row.appendChild(el("p", { class: "qexp" }, q.e));
      host.appendChild(row);
    });

    $("#quizCheck").addEventListener("click", function () {
      var right = 0, answered = 0;
      $$(".qrow", host).forEach(function (row, i) {
        row.classList.add("checked");
        if (state[i] == null) { row.classList.remove("ok", "no"); return; }
        answered++;
        var ok = state[i] === QUIZ[i].a;
        if (ok) right++;
        row.classList.toggle("ok", ok);
        row.classList.toggle("no", !ok);
      });
      var s = $("#quizScore");
      s.textContent = !answered ? "Sin respuestas todavía."
        : right + " de " + QUIZ.length + " correctas" + (answered < QUIZ.length ? " · " + (QUIZ.length - answered) + " sin responder" : "");
    });

    $("#quizReset").addEventListener("click", function () {
      state = QUIZ.map(function () { return null; });
      $$(".qrow", host).forEach(function (row) {
        row.classList.remove("ok", "no", "checked");
        $$(".qopt", row).forEach(function (o) { o.classList.remove("sel"); });
      });
      $("#quizScore").textContent = "";
    });
  }

  /* ═════════════════ § 8 · REGÍMENES Y QUIJOTE ═════════════════ */
  function initRegimenes() {
    var host = $("#ap-regimenes");
    if (!host) return;
    var gs = $("#regShapes"), range = $("#regRange"), ro = $("#regReadout");
    var N = 6, shapes = [], seeds = [];

    for (var i = 0; i < N; i++) {
      seeds.push({
        rot: Math.sin(i * 2.7) * 26,
        dy: Math.cos(i * 1.9) * 34,
        dw: Math.sin(i * 3.3) * 32,
        dh: Math.cos(i * 2.2) * 28,
        rx: 4 + Math.abs(Math.sin(i * 1.4)) * 26
      });
    }
    for (var j = 0; j < N; j++) {
      var g = svg("g", { class: "rshape" });
      var r = svg("rect", { x: -50, y: -50, width: 100, height: 100, rx: 3 });
      r.setAttribute("fill", "var(--accent-wash)");
      r.setAttribute("stroke", "var(--accent)");
      g.appendChild(r);
      gs.appendChild(g);
      shapes.push({ g: g, r: r });
    }

    function render() {
      var t = parseInt(range.value, 10) / 100;
      shapes.forEach(function (s, i) {
        var sd = seeds[i];
        var x = lerp(550, 90 + i * 184, t);
        var y = lerp(115, 115 + sd.dy, t);
        var w = 100 + sd.dw * t, h = 100 + sd.dh * t;
        s.g.setAttribute("transform", "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ") rotate(" + (sd.rot * t).toFixed(1) + ")");
        s.r.setAttribute("x", (-w / 2).toFixed(1));
        s.r.setAttribute("y", (-h / 2).toFixed(1));
        s.r.setAttribute("width", w.toFixed(1));
        s.r.setAttribute("height", h.toFixed(1));
        s.r.setAttribute("rx", (3 + sd.rx * t).toFixed(1));
      });

      var html;
      if (t < .12) html = "<b>Reduplicación pura.</b> Los seis textos ocupan el mismo lugar: el componente genérico repite el modelo. «Cuando se leen muchas novelas policiacas, se llega a tener la impresión de que siempre se trata de la misma».";
      else if (t < .45) html = "<b>Reduplicación dominante.</b> Los textos se distinguen, pero el modelo sigue integrado y reconocible. Es el régimen que la clasificación maneja bien —y el que, dice Schaeffer, «apenas es interesante»—.";
      else if (t < .8) html = "<b>Transformación en curso.</b> El desvío genérico desintegra el modelo: los rasgos seleccionados están cada vez menos integrados entre sí. Aquí la clasificación empieza a dudar.";
      else html = "<b>Transformación plena.</b> El mejor terreno de estudio para la genericidad, y el punto ciego de la clasificación: al no reconocer el modelo, solo sabe ver el comienzo de un género nuevo o un texto a-genérico. De ahí la tesis de que los grandes textos no serían nunca genéricos.";
      ro.innerHTML = html;
    }

    range.addEventListener("input", render);
    render();
  }

  var QJ_LEVELS = [
    { tag: "modal", name: "Narración de aventuras caballerescas", on: false },
    { tag: "formal", name: "Serie episódica, entrelazamiento, manuscrito hallado", on: false },
    { tag: "temático", name: "Caballero andante, dama, desafío, encantadores", on: false },
    { tag: "ideológico", name: "El código de la caballería como verdad del mundo", on: false }
  ];

  function initQuijote() {
    var host = $("#qjLevels");
    if (!host) return;
    var whole = $("#qjWhole"), out = $("#qjResult");

    QJ_LEVELS.forEach(function (lv, i) {
      var b = el("button", { type: "button", class: "qj-level", "data-i": String(i) });
      b.appendChild(el("span", { class: "qj-tag" }, lv.tag));
      b.appendChild(el("span", null, lv.name));
      b.addEventListener("click", function () {
        lv.on = !lv.on;
        b.classList.toggle("on", lv.on);
        render();
      });
      host.appendChild(b);
    });
    whole.addEventListener("change", render);

    function render() {
      var n = QJ_LEVELS.filter(function (l) { return l.on; }).length;
      var v, body;
      if (whole.checked) {
        v = "Reduplicación";
        body = "Tomado <b>en bloque y ya integrado</b>, el modelo se reduplica: sale otra novela de caballerías. El texto pertenece al género sin modificarlo apreciablemente. Es el régimen que, según Schaeffer, «apenas es interesante».";
      } else if (n === 0) {
        v = "Sin relación genérica";
        body = "Si el texto no toma nada del armazón, no hay relación genérica que estudiar. Selecciona al menos un nivel.";
      } else if (n === 1) {
        v = "Alusión, no transformación";
        body = "Un solo nivel no basta para una relación genérica pertinente: sin <b>copresencia de similitudes en niveles diferentes</b> estamos ante un préstamo aislado. Es el criterio de la estación 16.";
      } else if (n < 4) {
        v = "Transformación genérica";
        body = "Esto es lo que hace Cervantes: la transformación no estriba en el modelo completo, sino en <b>rasgos aislados elegidos en niveles diferentes</b>. Por eso el <i>Quijote</i> no es una imitación ni el negativo de una novela de caballerías, sino <b>«otra cosa distinta»</b> —que se constituye entre otras, y sin reducirse a ser una de ellas—.";
      } else {
        v = "Transformación máxima";
        body = "Con los cuatro niveles retomados pero <b>desintegrados</b>, la transformación es total. El resultado ya no se deja clasificar: la clasificación solo sabrá ver el comienzo de un género nuevo o un texto a-genérico.";
      }
      out.innerHTML = "";
      out.appendChild(el("p", { class: "qj-verdict" }, v));
      var p = el("p", { class: "qj-body" });
      p.innerHTML = body;
      out.appendChild(p);
    }
    render();
  }

  /* ═════════════════ § 9 · PERTINENCIA ═════════════════ */
  var LEVELS = [
    { name: "Nivel modal", desc: "El modo de enunciación: narrativo, dramático, mixto. Quién habla y en qué régimen." },
    { name: "Nivel formal", desc: "La disposición: métrica, extensión, estructura, procedimientos de composición." },
    { name: "Nivel temático", desc: "El asunto, los motivos, el mundo representado, las figuras recurrentes." }
  ];

  function initPertinencia() {
    var host = $("#levels");
    if (!host) return;
    var needle = $("#gNeedle"), verdict = $("#gaugeVerdict");
    var on = [false, false, false];

    LEVELS.forEach(function (lv, i) {
      var b = el("button", { type: "button", class: "level-btn", "aria-pressed": "false" });
      b.appendChild(el("span", { class: "level-led" }));
      var box = el("span");
      box.appendChild(el("p", { class: "level-name" }, lv.name));
      box.appendChild(el("p", { class: "level-desc" }, lv.desc));
      b.appendChild(box);
      b.addEventListener("click", function () {
        on[i] = !on[i];
        b.classList.toggle("on", on[i]);
        b.setAttribute("aria-pressed", on[i] ? "true" : "false");
        render();
      });
      host.appendChild(b);
    });

    function render() {
      var n = on.filter(Boolean).length;
      needle.setAttribute("transform", "rotate(" + [-80, -46, 16, 74][n] + ")");
      var html;
      if (n === 0) html = "<b>Nada que evaluar.</b> Enciende los niveles en los que dos textos se parecen.";
      else if (n === 1) html = "<b>No pertinente.</b> Una similitud en un solo nivel no basta. Si bastara, la genericidad se identificaría con la totalidad de los estudios literarios, entendidos como el estudio de los caracteres generales de los textos.";
      else if (n === 2) html = "<b>Indicio.</b> Dos niveles ya sugieren una relación genérica, pero el criterio es exigente: la copresencia debe darse en niveles <i>diferentes</i>, y cuantos más, más firme.";
      else html = "<b>Pertinente.</b> Copresencia de similitudes en el nivel modal, formal y temático a la vez: ese es el criterio esencial. No hace falta, en cambio, que los rasgos se integren en un texto ideal unitario —eso solo ocurre en la reduplicación—.";
      verdict.innerHTML = html;
    }
    render();
  }

  /* ═════════════════ § 10 · INVENTARIO ═════════════════ */
  var CHIPS = [
    { t: "parodia", a: "relacion", e: "Lo es desde siempre y en todas partes; está al mismo nivel de abstracción que las categorías de la genericidad." },
    { t: "imitación", a: "relacion", e: "Relación textual posible, no configuración histórica." },
    { t: "traducción", a: "relacion", e: "Relación entre textos disponible en cualquier época y lengua." },
    { t: "refutación", a: "relacion", e: "Otra de las relaciones del inventario que enumera Schaeffer." },
    { t: "novela de caballerías", a: "genero", e: "Configuración histórica concreta y única: la que el Quijote transforma." },
    { t: "novela policiaca", a: "genero", e: "El ejemplo con el que Schaeffer ilustra el régimen de la reduplicación." },
    { t: "epopeya cortesana artúrica", a: "genero", e: "Configuración histórica concreta, construida por oposición a la epopeya heroica." }
  ];

  function initInventario() {
    var pool = $("#chipPool");
    if (!pool) return;
    var placed = {}, sel = null;

    CHIPS.forEach(function (c, i) {
      var b = el("button", { type: "button", class: "chip", "data-i": String(i), title: "Selecciona y coloca en un estante" }, c.t);
      b.addEventListener("click", function () {
        if (sel === b) { b.classList.remove("sel"); sel = null; return; }
        $$(".chip").forEach(function (o) { o.classList.remove("sel"); });
        b.classList.add("sel");
        sel = b;
      });
      pool.appendChild(b);
    });

    $$(".shelf-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!sel) return;
        var shelf = btn.getAttribute("data-place");
        var drop = shelf === "genero" ? $("#shelfGenero") : $("#shelfRelacion");
        placed[sel.getAttribute("data-i")] = shelf;
        sel.classList.remove("sel", "ok", "no");
        drop.appendChild(sel);
        sel = null;
      });
    });

    $("#invCheck").addEventListener("click", function () {
      var right = 0, done = 0;
      CHIPS.forEach(function (c, i) {
        var chip = $('.chip[data-i="' + i + '"]');
        var p = placed[i];
        chip.classList.remove("ok", "no");
        if (!p) return;
        done++;
        var ok = p === c.a;
        if (ok) right++;
        chip.classList.add(ok ? "ok" : "no");
        chip.title = (ok ? "Correcto. " : "No: va en el otro estante. ") + c.e;
      });
      $("#invScore").textContent = !done ? "Coloca al menos una ficha."
        : right + " de " + CHIPS.length + " bien colocadas" +
          (done < CHIPS.length ? " · " + (CHIPS.length - done) + " sin colocar" : "") +
          " · pasa el cursor por cada ficha para ver por qué";
    });

    $("#invReset").addEventListener("click", function () {
      placed = {}; sel = null;
      CHIPS.forEach(function (c, i) {
        var chip = $('.chip[data-i="' + i + '"]');
        chip.classList.remove("ok", "no", "sel");
        chip.title = "Selecciona y coloca en un estante";
        pool.appendChild(chip);
      });
      $("#invScore").textContent = "";
    });
  }

  /* ═════════════════ GLOSARIO ═════════════════ */
  var GLOSSARY = [
    ["Genericidad", "Función textual: el componente genérico como factor productivo de la constitución de la textualidad. Dinámica e histórica; tiene dos regímenes, reduplicación y transformación."],
    ["Género", "Categoría de clasificación retrospectiva. Pertenece al campo de las categorías de la lectura y funciona como norma de lectura; su constitución depende de la estrategia discursiva del metatexto."],
    ["Architextualidad", "En Genette, el conjunto de categorías generales o transcendentes de las que es muestra cada texto. Schaeffer objeta que, a diferencia de las otras relaciones transtextuales, no determina parejas de textos: no hay architexto."],
    ["Transtextualidad", "Término general de Genette: paratextualidad, intertextualidad, hipertextualidad, metatextualidad y architextualidad. Como modelo de lectura, muestra más aspectos textuales que la lectura puramente inmanente."],
    ["Hipotexto", "El texto sobre el que trabaja un hipertexto por imitación o transformación. Toda relación architextual postulada se basa de hecho en una relación de hipertextualidad más o menos múltiple."],
    ["Exterioridad genérica", "El postulado de un término externo que fundaría la categoría de textos: molde de competencia, esencia oculta, estructura universal. Es el postulado que Schaeffer declara inadecuado e inútil."],
    ["Reificación del texto", "Tratar el texto como analogon de objeto físico. Es la condición para plantear una relación ontológica entre texto y género, y lo que sostiene la ilusión del texto como sistema cerrado."],
    ["Proyección retrospectiva", "Producir la noción de un género no a partir de similitudes existentes entre textos, sino postulando un texto ideal del que los textos reales serían derivados imperfectos."],
    ["Familienähnlichkeiten", "Parecidos de familia. La clase de textos no responde a una esencia común sino a una red de semejanzas parciales y superpuestas, en el sentido de Wittgenstein."],
    ["Reduplicación", "Régimen de la genericidad en que el componente genérico repite el modelo heredado. Da clases nítidas y clasificables; para Schaeffer, «apenas interesante»."],
    ["Transformación genérica", "Régimen del desvío: el texto trabaja rasgos aislados del modelo, elegidos en niveles diferentes. El mejor terreno de estudio de la genericidad, y el que la clasificación no sabe leer."],
    ["Circulación textual", "El carácter institucional de la literatura como conjunto de redes textuales. Postularla es la condición sine qua non de todo estudio de la genericidad."]
  ];

  function initGlossary() {
    var dl = $("#glossary");
    if (!dl) return;
    GLOSSARY.forEach(function (g) {
      var box = el("div", { class: "gitem" });
      box.appendChild(el("dt", null, g[0]));
      box.appendChild(el("dd", null, g[1]));
      dl.appendChild(box);
    });
  }

  /* ═════════════════ AJUSTE DE SEGURIDAD DE CADA ESTACIÓN ═════════════════
     El lienzo mide 1280 × 720 y el contenido está calculado para caber, pero el
     tamaño con que se pinta el texto no siempre es el que pide el CSS: un tamaño
     mínimo de fuente configurado en el navegador, una fuente del sistema ausente
     —fuera de macOS no hay Iowan Old Style ni Palatino— o un zoom de solo texto
     lo agrandan y la estación se sale de su caja. Cuando eso pasa, se reduce lo
     justo para caber, y así ninguna estación puede sobresalir jamás. */
  function initFit() {
    var panels = $$(".panel");

    function fitPanel(p) {
      var inner = $(".panel-inner", p);
      if (!inner || !inner.clientHeight) return;

      /* Medidas de maquetación (offset*), no rectángulos pintados: así el cálculo
         no depende ni de la escala del lienzo ni del desplazamiento con que entran
         los elementos animados, que falseaba el resultado al medir a media entrada. */
      var kids = inner.children;
      var top = Infinity, bot = -Infinity, left = Infinity, right = -Infinity;
      for (var i = 0; i < kids.length; i++) {
        var n = kids[i];
        if (!n.offsetHeight) continue;
        if (n.offsetTop < top) top = n.offsetTop;
        if (n.offsetTop + n.offsetHeight > bot) bot = n.offsetTop + n.offsetHeight;
        if (n.offsetLeft < left) left = n.offsetLeft;
        if (n.offsetLeft + n.offsetWidth > right) right = n.offsetLeft + n.offsetWidth;
      }
      if (!isFinite(top)) return;

      var alto = bot - top, ancho = right - left;
      var k = Math.min(
        1,
        alto ? inner.clientHeight / alto : 1,
        ancho ? inner.clientWidth / ancho : 1
      );
      var nuevo = k < .995 ? "scale(" + (Math.floor(k * 1000) / 1000) + ")" : "";
      if (nuevo !== inner.style.transform) inner.style.transform = nuevo;
    }

    function fitAll() { panels.forEach(fitPanel); }

    /* cualquier cambio de altura dentro de una estación —explicaciones que se
       abren, fichas que cambian de estante, avisos que aparecen— la revisa */
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function (entries) {
        var vistos = [];
        entries.forEach(function (e) {
          var p = e.target.parentNode ? e.target.parentNode.parentNode : null;
          if (p && p.classList && p.classList.contains("panel") && vistos.indexOf(p) < 0) {
            vistos.push(p);
            fitPanel(p);
          }
        });
      });
      panels.forEach(function (p) {
        var inner = $(".panel-inner", p);
        if (!inner) return;
        for (var i = 0; i < inner.children.length; i++) ro.observe(inner.children[i]);
      });
    }

    fitAll();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
    window.addEventListener("pageshow", fitAll);
  }

  /* ═════════════════ ARRANQUE ═════════════════ */
  ready(function () {
    initStage();
    initChrome();
    initPreguntas();
    initTrilema();
    initHeldenepos();
    initCadena();
    initCircuito();
    initRosa();
    initMaquinas();
    initTiempo();
    initQuiz();
    initRegimenes();
    initQuijote();
    initPertinencia();
    initInventario();
    initGlossary();
    Deck.init();
    initFit();
    initAmbient();
  });
})();
