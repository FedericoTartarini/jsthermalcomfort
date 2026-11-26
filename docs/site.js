// The site's browser script, which `typedoc.json` loads as `customJs`, after
// TypeDoc's `main.js`. Its two parts rely on `main.js` beyond TypeDoc's API
// (read from TypeDoc 0.28.20); each names what it relies on, and when that
// stops working the part leaves TypeDoc's default look. The top of
// `docs/custom.css` lists every place the site relies on TypeDoc beyond its
// API.

// The header's theme button cycles system, light and dark through TypeDoc's
// theme control `#tsd-theme` (values "os", "light" and "dark"), which stays
// in TypeDoc's "Settings" panel, hidden with the panel by the docs plugin.
// It relies on `main.js` setting the control from the `localStorage` key
// `tsd-theme` and, on its `change` event, storing the value there and setting
// it as `data-theme` on the root element.
//
// When the control is missing, its value is unknown or differs from
// `data-theme`, or a change sets no `data-theme`, the button is hidden and
// the "Settings" panel shown, with the theme TypeDoc set from the stored
// choice.
(function () {
  "use strict";
  var NEXT = { os: "light", light: "dark", dark: "os" };
  var NAMES = { os: "system", light: "light", dark: "dark" };
  var root = document.documentElement;
  var control = document.getElementById("tsd-theme");
  var button = document.querySelector(".site-theme-button");
  var settings = document.querySelector(".site-settings");

  function fallBack() {
    if (button) button.hidden = true;
    if (settings) settings.hidden = false;
  }

  function show(value) {
    var label = "Theme: " + NAMES[value] + ". Change theme";
    button.dataset.theme = value;
    button.title = label;
    button.setAttribute("aria-label", label);
  }

  if (
    !(control instanceof HTMLSelectElement) ||
    !button ||
    !Object.prototype.hasOwnProperty.call(NEXT, control.value) ||
    root.dataset.theme !== control.value
  ) {
    fallBack();
    return;
  }
  show(control.value);
  button.hidden = false;
  button.addEventListener("click", function () {
    var before = control.value;
    var value = NEXT[before];
    control.value = value;
    control.dispatchEvent(new Event("change"));
    if (root.dataset.theme !== value) {
      control.value = before;
      fallBack();
      return;
    }
    show(value);
  });
})();

// The left column keeps a module's list of functions collapsed, except the
// module of the function page shown: on a module's own page, a document or
// the home page every module is collapsed.
//
// It relies on `main.js` drawing the left column from `navigation.js` into
// `#tsd-nav-container`, after this script may have run, with each module as a
// `details` element whose `summary` holds the module's link, and the link of
// the page shown having the class `current`; and on `main.js` having opened
// the details around that link and those it remembers as opened before it
// adds them, so that the open state set here is the last one.
//
// When the column has no `details`, or a `details` has no `summary`, nothing
// changes: the left column shows TypeDoc's default list, with the modules
// that `main.js` opens.
(function () {
  "use strict";
  var column = document.getElementById("tsd-nav-container");
  if (!column) return;

  function collapse() {
    var modules = column.querySelectorAll("details");
    var current = column.querySelector("a.current");
    for (var i = 0; i < modules.length; i++)
      if (!modules[i].querySelector(":scope > summary")) return;
    for (var j = 0; j < modules.length; j++) {
      var summary = modules[j].querySelector(":scope > summary");
      modules[j].open =
        current !== null &&
        modules[j].contains(current) &&
        !summary.contains(current);
    }
  }

  if (column.querySelector("details")) {
    collapse();
    return;
  }
  var observer = new MutationObserver(function () {
    if (!column.querySelector("details")) return;
    observer.disconnect();
    collapse();
  });
  observer.observe(column, { childList: true, subtree: true });
})();
