// The site's browser script, which `typedoc.json` loads as `customJs`. TypeDoc
// adds it after its own `main.js`, both deferred, so it runs once `main.js`
// has run. Each part below names what it relies on in `main.js` (read from
// TypeDoc 0.28.20) and what a reader sees when that stops working; a part that
// stops working leaves TypeDoc's default page, never a broken one.
//
// The two parts are two of the four places ADR 0020's amendment headed
// "site-design grill" lets the site go beyond TypeDoc's documented API: the
// theme button and the collapsed list. The other two are the templates the
// plugin wraps (`scripts/typedoc-plugin.mjs`), which fail the docs build when
// TypeDoc's markup changes, and the left column's group labels and missing
// kind icons (`docs/custom.css`, section 5), which show as TypeDoc draws them.
// After a TypeDoc upgrade a person looks at the views `docs/contributing.md`
// lists, since the docs build cannot check these.

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
