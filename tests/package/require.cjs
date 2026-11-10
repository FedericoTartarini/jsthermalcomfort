// A CommonJS consumer of the packed package, run by CI on the minimum Node in
// `engines`. It must sit in a directory where "jsthermalcomfort" resolves to
// the installed tarball: inside this repository the name resolves to the
// working tree instead. attw's esm-only profile ignores CJS resolution, so
// this is the check that require() of the ESM-only package works.
"use strict";

const assert = require("node:assert/strict");

// Node 22.12 loads an ES module through require() with an ExperimentalWarning;
// from 22.13 it must load without one.
process.on("warning", (warning) => {
  console.error(warning);
  process.exitCode = 1;
});

const root = require("jsthermalcomfort");
assert.equal(typeof root.utci, "function");
assert.equal(typeof root.default.models.utci, "function");

for (const subpath of [
  "models",
  "environment",
  "psychrometrics",
  "utilities",
]) {
  const entry = require(`jsthermalcomfort/${subpath}`);
  assert.equal(entry.default, root.default[subpath], subpath);
}

// The exports map seals every file behind the entries.
assert.throws(() => require("jsthermalcomfort/lib/esm/models/utci.js"), {
  code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
});
