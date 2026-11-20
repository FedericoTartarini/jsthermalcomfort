// The site's browser script, which `typedoc.json` loads as `customJs`. TypeDoc
// adds it after its own `main.js`, both deferred, so it runs once `main.js`
// has run. Each part below names what it relies on in `main.js` (read from
// TypeDoc 0.28.20) and what a reader sees when that stops working; a part that
// stops working leaves TypeDoc's default page, never a broken one.

// The theme button in the header cycles system, light and dark, starting at
// system, through TypeDoc's own theme control, the hidden select `#tsd-theme`
// with the values "os", "light" and "dark", which the docs plugin moved there
// from the "Settings" panel.
//
// It relies on `main.js` finding that select by its id, setting its value
// from the `localStorage` key `tsd-theme` on load, and, on its `change`
// event, storing the value under that key and setting it as `data-theme` on
// the root element. The stored value keeps the choice on the next page and
// after a reload.
//
// When the select is not found, or a change does not set `data-theme`, the
// button stays hidden or is hidden again, and the page follows the system
// theme.
(function () {
  "use strict";
  var NEXT = { os: "light", light: "dark", dark: "os" };
  var NAMES = { os: "system", light: "light", dark: "dark" };
  var root = document.documentElement;

  function followSystem(button) {
    if (button) button.hidden = true;
    root.dataset.theme = "os";
  }

  function show(button, value) {
    var label = "Theme: " + NAMES[value] + ". Change theme";
    button.dataset.theme = value;
    button.title = label;
    button.setAttribute("aria-label", label);
  }

  var control = document.getElementById("tsd-theme");
  var button = document.querySelector(".site-theme-button");
  if (!(control instanceof HTMLSelectElement) || !button) {
    followSystem(button);
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(NEXT, control.value)) {
    followSystem(button);
    return;
  }
  show(button, control.value);
  button.hidden = false;
  button.addEventListener("click", function () {
    var value = NEXT[control.value] || "os";
    control.value = value;
    control.dispatchEvent(new Event("change"));
    if (root.dataset.theme !== value) {
      followSystem(button);
      return;
    }
    show(button, value);
  });
})();
