// Heimat-Karte: liest stand.json (erzeugt von heimat_web_export.py) und zeichnet die Karte als SVG.
// Keine Kartenbibliothek, keine Kacheln, keine Fremddienste.
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var svg = document.getElementById("karte");
  var KONZEPTE = { K1: "Zeitreise", K2: "Vergessene Orte", K3: "Orts-Quiz", K4: "Region in 60 Sekunden", K5: "Aufgedeckt", K6: "Alte Karte, neue Welt" };
  var D, vb, voll, ortsPunkte = [], aktiv = null, schild;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  }
  function zahl(n) { return n.toLocaleString("de-DE"); }
  function datum(s) { var t = s.split("-"); return t[2] + "." + t[1] + "." + t[0]; }

  fetch("stand.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(start)
    .catch(function () { document.getElementById("zeile").textContent = "Spielstand konnte nicht geladen werden."; });

  function start(d) {
    D = d;
    document.getElementById("zeile").textContent = "Orte " + d.orte.length + "  ·  Waben " + zahl(d.waben_offen) + " von " + zahl(d.waben_gesamt);
    document.getElementById("prozent").textContent = String(d.prozent).replace(".", ",") + " % aufgedeckt";
    document.getElementById("stand").textContent = zahl(d.abos) + " Abos  ·  " + zahl(d.km) + " km Radwege  ·  Stand " + datum(d.stand);
    document.getElementById("kapitel").textContent = "Kapitel 1 · " + d.kapitel;
    svg.style.aspectRatio = d.breite + " / " + d.hoehe;
    voll = { x: 0, y: 0, w: d.breite, h: d.hoehe };

    var defs = el("defs", {});
    var cp = el("clipPath", { id: "nrw" }, defs);
    el("path", { d: d.grenze }, cp);
    el("path", { d: d.grenze, class: "grenze-f" });
    var g = el("g", { "clip-path": "url(#nrw)" });
    el("path", { d: d.waben.abo, class: "w-abo" }, g);
    el("path", { d: d.waben.ort, class: "w-ort" }, g);
    if (d.waben.neu) el("path", { d: d.waben.neu, class: "w-neu" }, g);
    el("path", { d: d.grenze, class: "grenze-l" });
    d.wege.forEach(function (w) { el("path", { d: w, class: "weg" }); });

    var og = el("g", {});
    d.orte.forEach(function (o) {
      var c = el("circle", { cx: o.xy[0], cy: o.xy[1], class: "ort" + (o.neu ? " neu" : "") + (o.status !== "online" ? " geplant" : "") }, og);
      var t = el("circle", { cx: o.xy[0], cy: o.xy[1], class: "treffer" }, og);
      var ti = document.createElementNS(NS, "title"); ti.textContent = o.name; t.appendChild(ti);
      t.addEventListener("click", function (ev) { if (!bewegt) zeige(o, c); ev.stopPropagation(); });
      ortsPunkte.push({ o: o, c: c, t: t });
    });
    schild = el("g", { class: "schild", "pointer-events": "none" });
    if (d.orte.some(function (o) { return o.neu; })) document.getElementById("leg-neu").hidden = false;
    setze(voll.x, voll.y, voll.w);
  }

  // ---------- Ansicht (Zoom/Verschieben über die viewBox)
  function setze(x, y, w) {
    w = Math.max(voll.w / 14, Math.min(voll.w, w));
    var h = w * voll.h / voll.w;
    x = Math.max(voll.x - w * 0.25, Math.min(voll.x + voll.w - w * 0.75, x));
    y = Math.max(voll.y - h * 0.25, Math.min(voll.y + voll.h - h * 0.75, y));
    if (w >= voll.w) { x = voll.x; y = voll.y; }
    vb = { x: x, y: y, w: w, h: h };
    svg.setAttribute("viewBox", x + " " + y + " " + w + " " + h);
    var k = w / voll.w;
    ortsPunkte.forEach(function (p) {
      p.c.setAttribute("r", (p.o.neu || p === aktiv ? 9 : 6) * k);
      p.t.setAttribute("r", 18 * k);
    });
    if (aktiv) schildZeichnen();
  }
  function zoom(f, px, py) {
    var r = svg.getBoundingClientRect();
    var ux = px === undefined ? 0.5 : (px - r.left) / r.width, uy = py === undefined ? 0.5 : (py - r.top) / r.height;
    var mx = vb.x + ux * vb.w, my = vb.y + uy * vb.h, w = vb.w / f;
    w = Math.max(voll.w / 14, Math.min(voll.w, w));
    setze(mx - ux * w, my - uy * w * voll.h / voll.w, w);
  }
  document.getElementById("zplus").onclick = function () { zoom(1.6); };
  document.getElementById("zminus").onclick = function () { zoom(1 / 1.6); };
  document.getElementById("zreset").onclick = function () { setze(voll.x, voll.y, voll.w); };
  svg.addEventListener("wheel", function (e) { e.preventDefault(); zoom(e.deltaY < 0 ? 1.25 : 0.8, e.clientX, e.clientY); }, { passive: false });

  var zeiger = {}, start0 = null, bewegt = false;
  svg.addEventListener("pointerdown", function (e) {
    zeiger[e.pointerId] = { x: e.clientX, y: e.clientY };
    start0 = { vb: vb, z: kopie(zeiger) }; bewegt = false;
  });
  svg.addEventListener("pointermove", function (e) {
    if (!zeiger[e.pointerId] || !start0) return;
    zeiger[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(zeiger), r = svg.getBoundingClientRect(), s = start0.vb.w / r.width;
    if (ids.length === 1) {
      var a = start0.z[ids[0]]; if (!a) return;
      var dx = e.clientX - a.x, dy = e.clientY - a.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) { bewegt = true; svg.classList.add("zieht"); if (!svg.hasPointerCapture(e.pointerId)) svg.setPointerCapture(e.pointerId); }
      if (bewegt) setze(start0.vb.x - dx * s, start0.vb.y - dy * s, start0.vb.w);
    } else if (ids.length === 2 && start0.z[ids[0]] && start0.z[ids[1]]) {
      bewegt = true;
      var p0 = start0.z[ids[0]], p1 = start0.z[ids[1]], q0 = zeiger[ids[0]], q1 = zeiger[ids[1]];
      var d0 = Math.hypot(p0.x - p1.x, p0.y - p1.y), d1 = Math.hypot(q0.x - q1.x, q0.y - q1.y);
      var w = Math.max(voll.w / 14, Math.min(voll.w, start0.vb.w * d0 / Math.max(d1, 1)));
      var cx0 = (p0.x + p1.x) / 2 - r.left, cy0 = (p0.y + p1.y) / 2 - r.top;
      var cx1 = (q0.x + q1.x) / 2 - r.left, cy1 = (q0.y + q1.y) / 2 - r.top;
      var mx = start0.vb.x + cx0 * s, my = start0.vb.y + cy0 * s, s1 = w / r.width;
      setze(mx - cx1 * s1, my - cy1 * s1, w);
    }
  });
  function los(e) {
    delete zeiger[e.pointerId];
    start0 = Object.keys(zeiger).length ? { vb: vb, z: kopie(zeiger) } : null;
    svg.classList.remove("zieht");
  }
  svg.addEventListener("pointerup", los);
  svg.addEventListener("pointercancel", los);
  svg.addEventListener("click", function () { if (!bewegt) schliessen(); });
  function kopie(o) { var r = {}; for (var k in o) r[k] = { x: o[k].x, y: o[k].y }; return r; }

  // ---------- Infokarte zum Ort
  var info = document.getElementById("info");
  function zeige(o, c) {
    if (aktiv) aktiv.c.classList.remove("aktiv");
    aktiv = ortsPunkte.filter(function (p) { return p.o === o; })[0];
    c.classList.add("aktiv");
    var arten = [];
    o.folgen.forEach(function (f) { var k = KONZEPTE[f.slice(0, 2)]; if (k && arten.indexOf(k) < 0) arten.push(k); });
    document.getElementById("info-name").textContent = o.name.split(" (")[0];
    document.getElementById("info-text").textContent = (o.status === "online"
      ? "Aufgedeckt in: " : "Folge kommt bald: ") + (arten.join(", ") || "Unmapped") + (o.neu ? " · neu diese Woche" : "");
    var link = document.getElementById("info-link");
    link.href = "https://www.youtube.com/@Getunmapped/search?query=" + encodeURIComponent(o.name.split(" (")[0]);
    link.hidden = o.status !== "online";
    info.hidden = false;
    setze(vb.x, vb.y, vb.w);
  }
  function schliessen() {
    if (aktiv) aktiv.c.classList.remove("aktiv");
    aktiv = null; info.hidden = true; schild.innerHTML = "";
    if (vb) setze(vb.x, vb.y, vb.w);
  }
  document.getElementById("info-zu").onclick = schliessen;
  function schildZeichnen() {
    schild.innerHTML = "";
    var k = vb.w / voll.w, o = aktiv.o, fs = 15 * k;
    var t = el("text", { x: o.xy[0] + 16 * k, y: o.xy[1] + fs * 0.36, "font-size": fs }, schild);
    t.textContent = o.name.split(" (")[0].toUpperCase();
    var b = t.getBBox(), pad = 6 * k;
    var rr = el("rect", { x: b.x - pad, y: b.y - pad * 0.7, width: b.width + 2 * pad, height: b.height + 1.4 * pad, rx: 5 * k }, schild);
    schild.insertBefore(rr, t);
  }
})();
