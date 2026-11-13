// Aktuelle Zahlen der Heimat-Karte (heimat/kurz.json, jeden Sonntag neu) in den Aufmacher schreiben.
fetch("heimat/kurz.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
  var z = function (n) { return n.toLocaleString("de-DE"); };
  document.getElementById("h-prozent").textContent = String(d.prozent).replace(".", ",") + " %";
  document.getElementById("h-orte").textContent = z(d.orte);
  document.getElementById("h-abos").textContent = z(d.abos);
  var t = d.stand.split("-");
  document.getElementById("h-stand").textContent = "Stand " + t[2] + "." + t[1] + "." + t[0] + " · jeden Sonntag neuer Spielstand.";
}).catch(function () {});
