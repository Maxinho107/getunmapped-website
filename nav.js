// Menü-Knopf für die Navigation auf dem Handy
(function () {
  var k = document.querySelector(".menu-knopf"), n = document.getElementById("hauptnav");
  if (!k || !n) return;
  k.addEventListener("click", function () {
    var auf = k.getAttribute("aria-expanded") !== "true";
    k.setAttribute("aria-expanded", String(auf));
    n.classList.toggle("offen", auf);
  });
  n.addEventListener("click", function (e) { if (e.target.closest("a")) { k.setAttribute("aria-expanded", "false"); n.classList.remove("offen"); } });
})();
