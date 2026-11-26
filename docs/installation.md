---
title: Installation
---

# Installation

```bash
npm install jsthermalcomfort
```

Import functions by name, from the package root or from a subpath: `jsthermalcomfort/models`, `jsthermalcomfort/environment`, `jsthermalcomfort/clothing`, `jsthermalcomfort/psychrometrics` or `jsthermalcomfort/utilities`.

```javascript
import { pmv_ppd_iso } from "jsthermalcomfort";
import { utci } from "jsthermalcomfort/models";

const { pmv, ppd } = pmv_ppd_iso({
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
});
console.log(pmv, ppd); // 0.08 5.1

const result = utci({ tdb: 25, tr: 25, v: 1, rh: 50 });
console.log(result.utci, result.stress_category); // 24.6 no thermal stress
```

In a browser without a bundler, import from jsDelivr in a module script:

```html
<script type="module">
  import { pmv_ppd_iso } from "https://cdn.jsdelivr.net/npm/jsthermalcomfort@2/+esm";

  const { pmv, ppd } = pmv_ppd_iso({
    tdb: 25,
    tr: 25,
    vr: 0.1,
    rh: 50,
    met: 1.2,
    clo: 0.5,
  });
  console.log(pmv, ppd); // 0.08 5.1
</script>
```
