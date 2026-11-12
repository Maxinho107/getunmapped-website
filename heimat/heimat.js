// Heimat-Karte: App-Karte „Sepia“ (OpenStreetMap, eigener Kartenserver karte.getunmapped.eu)
// mit Nebel darüber; nur die aufgedeckten Waben lassen die Karte durchscheinen.
// Daten: stand.json + karte-stil.json, erzeugt von heimat_web_export.py.
(function () {
  "use strict";
  var FARBE = { pergament: "#F3EBDD", eisen: "#2B2A33", indigo: "#3B4A8C", gold: "#DCAB38", nebel: "#D6D2C8", elfenbein: "#F9F7F6" };
  var KONZEPTE = { K1: "Zeitreise", K2: "Vergessene Orte", K3: "Orts-Quiz", K4: "Region in 60 Sekunden", K5: "Aufgedeckt", K6: "Alte Karte, neue Welt" };
  var basis = new URL(".", location.href).href;

  function zahl(n) { return n.toLocaleString("de-DE"); }
  function datum(s) { var t = s.split("-"); return t[2] + "." + t[1] + "." + t[0]; }
  function laden(u) { return fetch(u, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw r; return r.json(); }); }

  Promise.all([laden("stand.json"), laden("karte-stil.json")]).then(function (x) { start(x[0], x[1]); })
    .catch(function () { document.getElementById("zeile").textContent = "Spielstand konnte nicht geladen werden."; });

  function start(d, stil) {
    document.getElementById("zeile").textContent = "Orte " + d.orte.features.length + "  ·  Waben " + zahl(d.waben_offen) + " von " + zahl(d.waben_gesamt);
    document.getElementById("prozent").textContent = String(d.prozent).replace(".", ",") + " % aufgedeckt";
    document.getElementById("stand").textContent = zahl(d.abos) + " Abos  ·  " + zahl(d.km) + " km Wege  ·  Stand " + datum(d.stand);
    document.getElementById("kapitel").textContent = "Kapitel 1 · " + d.kapitel;
    if (d.orte.features.some(function (f) { return f.properties.neu; })) document.getElementById("leg-neu").hidden = false;

    stil.glyphs = basis + "glyphs/{fontstack}/{range}.pbf";
    var g = d.grenzen, rand = 0.6;
    var karte = new maplibregl.Map({
      container: "karte", style: stil, bounds: [[g[0], g[1]], [g[2], g[3]]], fitBoundsOptions: { padding: 12 },
      maxBounds: [[g[0] - rand * 2, g[1] - rand], [g[2] + rand * 2, g[3] + rand]], minZoom: 6, maxZoom: 14.5,
      attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, cooperativeGestures: false
    });
    karte.touchZoomRotate.disableRotation();
    karte.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    karte.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    window.heimatKarte = karte;
    karte.on("load", function () {
      var at = document.querySelector("#karte .maplibregl-ctrl-attrib"); if (at) at.classList.remove("maplibregl-compact-show");
      ["nebel", "waben", "wege", "orte", "grenze"].forEach(function (k) { karte.addSource(k, { type: "geojson", data: d[k] }); });
      karte.addLayer({ id: "nebel", type: "fill", source: "nebel", paint: { "fill-color": FARBE.nebel, "fill-opacity": 0.93 } });
      karte.addLayer({ id: "waben-neu", type: "fill", source: "waben", filter: ["==", ["get", "t"], "neu"], paint: { "fill-color": FARBE.gold, "fill-opacity": 0.35 } });
      karte.addLayer({ id: "waben-kante", type: "line", source: "waben", minzoom: 8,
        paint: { "line-color": FARBE.eisen, "line-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0, 9, 0.18, 12, 0.3], "line-width": 0.6 } });
      karte.addLayer({ id: "grenze", type: "line", source: "grenze", paint: { "line-color": FARBE.eisen, "line-width": 2.5 } });
      karte.addLayer({ id: "wege", type: "line", source: "wege", layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": FARBE.indigo, "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1.6, 12, 4] } });
      karte.addLayer({ id: "orte", type: "circle", source: "orte", paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, ["case", ["get", "neu"], 6, 4], 12, ["case", ["get", "neu"], 10, 8]],
        "circle-color": ["case", ["get", "neu"], FARBE.indigo, ["==", ["get", "status"], "online"], FARBE.eisen, FARBE.elfenbein],
        "circle-stroke-color": ["case", ["==", ["get", "status"], "online"], FARBE.pergament, FARBE.eisen],
        "circle-stroke-width": 2 } });
      karte.addLayer({ id: "orte-name", type: "symbol", source: "orte", minzoom: 8.3, layout: {
        "text-field": ["upcase", ["get", "name"]], "text-font": ["Noto Sans Medium"], "text-size": 12, "text-offset": [0, 1.2],
        "text-anchor": "top", "text-letter-spacing": 0.04 },
        paint: { "text-color": FARBE.eisen, "text-halo-color": FARBE.pergament, "text-halo-width": 2 } });

      karte.on("click", "orte", function (e) { zeige(e.features[0].properties); });
      karte.on("mouseenter", "orte", function () { karte.getCanvas().style.cursor = "pointer"; });
      karte.on("mouseleave", "orte", function () { karte.getCanvas().style.cursor = ""; });
    });
  }

  var info = document.getElementById("info");
  function zeige(p) {
    var folgen = typeof p.folgen === "string" ? JSON.parse(p.folgen) : p.folgen, arten = [];
    folgen.forEach(function (f) { var k = KONZEPTE[f.slice(0, 2)]; if (k && arten.indexOf(k) < 0) arten.push(k); });
    document.getElementById("info-name").textContent = p.name;
    document.getElementById("info-text").textContent = (p.status === "online" ? "Aufgedeckt in: " : "Folge kommt bald: ")
      + (arten.join(", ") || "Unmapped") + (p.neu ? " · neu diese Woche" : "");
    var link = document.getElementById("info-link");
    link.href = "https://www.youtube.com/@Getunmapped/search?query=" + encodeURIComponent(p.name);
    link.hidden = p.status !== "online";
    info.hidden = false;
  }
  document.getElementById("info-zu").onclick = function () { info.hidden = true; };
})();
