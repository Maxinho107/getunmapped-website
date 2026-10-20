// Die drei Links für die Warteliste. Solange ein Feld leer ist,
// wird der passende Knopf auf der Seite nicht angezeigt.
const LINKS = {
  // Link zum Anmeldeformular bei Brevo (Formular > Teilen > Link kopieren)
  warteliste: "https://fcebda93.sibforms.com/serve/MUIFAJSqeO-IN0ri5B1mjQdzblTT4wRxI5gezjwim2k7bSxR1ODej1DFNBI3A22H0Z4c5hNSp6bUsRLKQ7l1Wjuv6Yz9kmyAz2al0Fjo0pMxcNbFhL7ZifKpy8ekrIP9cdT3hWMYf52FFR-GqRCo8N4FNjlQM34wN4i5WWugDDpoDUhLCTGBFuvPv0KzgfjRShmjXnK4sjCoZKOfjA==",
  // Vorregistrierung im Play Store, sobald sie in der Play Console aktiv ist:
  // "https://play.google.com/store/apps/details?id=io.getunmapped.app"
  playStore: "",
  // Vorbestellung im App Store, sobald sie in App Store Connect aktiv ist:
  // "https://apps.apple.com/de/app/unmapped/idXXXXXXXXXX"
  appStore: "",
};

document.querySelectorAll("[data-link]").forEach((el) => {
  const url = LINKS[el.dataset.link];
  if (url) {
    el.href = url;
    el.hidden = false;
  }
});

if (!LINKS.warteliste && !LINKS.playStore && !LINKS.appStore) {
  document.querySelectorAll("[data-fallback]").forEach((el) => (el.hidden = false));
}
