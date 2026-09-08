# Overview

|        docs         | [![docs](https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/test_docs.yml/badge.svg)][docs_link]                                                                 |
| :-----------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|      **build**      | [![build](https://img.shields.io/github/actions/workflow/status/FedericoTartarini/jsthermalcomfort/ci.yml?branch=main&label=build)][build_link]                                       |
|      **tests**      | [![test](https://img.shields.io/github/actions/workflow/status/FedericoTartarini/jsthermalcomfort/ci.yml?branch=main&label=tests)][test_link]                                         |
| **page deployment** | [![page deployment](https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/deploy-docs.yml/badge.svg)][deploy_link]                                                  |
|  **snyk security**  | [![snyk](https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/snyk.yml/badge.svg)][snyk_link]                                                                      |
|     **license**     | [![license](https://custom-icon-badges.demolab.com/github/license/denvercoder1/custom-icon-badges?logo=law)](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/LICENSE) |
|   **npm version**   | [![npm](https://img.shields.io/npm/v/jsthermalcomfort?style=plastic&logo=npm&logoColor=rgb)][npm_link]                                                                                |

Package to calculate thermophysiological, thermal comfort, thermal stress indices, in JavaScript.

Please cite us if you use this package: [Tartarini, F., Schiavon, S., 2020. pythermalcomfort: A Python package for thermal comfort research. SoftwareX 12, 100578. https://doi.org/10.1016/j.softx.2020.100578](https://www.sciencedirect.com/science/article/pii/S2352711020302910)

- Free software: MIT license
- Authors: [Federico Tartarini](https://www.linkedin.com/in/federico-tartarini/), [Omar Jesus Acuache Briceno](https://www.linkedin.com/in/omar-acuache), [Ruoshui Chen](https://github.com/ChristinChen233), [Jingyu Lu](https://github.com/Lu-Whale), [Yuchen Mu](https://github.com/YuchenMu), [Jordan Ocokoljic](https://github.com/JordanOcokoljic), [Santiago Zaldivar del Alba​](https://github.com/szaldivar), [Stefano Schiavon](https://www.linkedin.com/in/stefanoschiavon/), [Ollie Jay](https://www.linkedin.com/in/ollie-jay-793a1b11/)

[docs_link]: https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/test_docs.yml
[build_link]: https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/ci.yml
[test_link]: https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/ci.yml
[deploy_link]: https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/deploy-docs.yml
[snyk_link]: https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/snyk.yml
[npm_link]: https://www.npmjs.com/package/jsthermalcomfort

# Official Documentation Website

[https://federicotartarini.github.io/jsthermalcomfort/](https://federicotartarini.github.io/jsthermalcomfort/)

# Installation

```bash
npm install jsthermalcomfort
```

If you want to use jsthermalcomfort package without installing it on your local machine, you can import with:

[`https://cdn.jsdelivr.net/npm/jsthermalcomfort/lib/esm/`](https://cdn.jsdelivr.net/npm/jsthermalcomfort/lib/esm/)

Example:

```javascript
import {
  models,
  utilities,
  psychrometrics,
} from "https://cdn.jsdelivr.net/npm/jsthermalcomfort/lib/esm/index.js";
```

You can also import it in the website directly, and caution that you need to mark the script as module:

```html
<script type="module">
  import {
    models,
    utilities,
    psychrometrics,
  } from "https://cdn.jsdelivr.net/npm/jsthermalcomfort/lib/esm/index.js";
</script>
```

# Examples and Tutorials

We developed a few [examples](https://github.com/FedericoTartarini/jsthermalcomfort/tree/main/docs/examples) files on how to use some of the functions.

Here is a list of examples running in the browser:

- [PHS](/docs/examples/phs.html)

# Contributing

Contributions are welcome.

- Contributor guide: [`docs_theme/contributing.md`](docs_theme/contributing.md)
- Online docs version: [Contributing](https://federicotartarini.github.io/jsthermalcomfort/contributing.html)
- Bug reports and feature requests: [GitHub Issues](https://github.com/FedericoTartarini/jsthermalcomfort/issues)

## Local development (quick start)

```bash
npm ci
npm test
npm run check:format
npm run build
```

## Releasing

Releases are triggered by pushing a git tag. There is no automatic publish on
merge — nothing reaches npm until someone tags deliberately.

```bash
# 1. set the version in package.json (it must match the tag exactly,
#    the workflow fails the build otherwise)
npm version 2.0.0 --no-git-tag-version

# 2. commit and push the version bump
git commit -am "2.0.0" && git push

# 3. tag and push the tag — this is what publishes
git tag v2.0.0 && git push origin v2.0.0
```

### Prereleases

A tag containing a hyphen is treated as a semver prerelease and published under
the **`next`** dist-tag instead of `latest`:

```bash
npm version 2.0.0-next.1 --no-git-tag-version
git commit -am "2.0.0-next.1" && git push
git tag v2.0.0-next.1 && git push origin v2.0.0-next.1
```

Consumers then opt in explicitly, and nobody on `^1.x` is affected:

```bash
npm install jsthermalcomfort@next
```

This is how work on `dev-v2` gets into the hands of front ends before the major
release, so packaging problems surface before they reach everyone. Publishing a
prerelease without a dist-tag would set `latest` and hand every existing user a
preview, which is why the workflow derives the tag from the version rather than
leaving it to whoever runs the release.

Validation datasets for model tests are fetched from
`FedericoTartarini/validation-data-comfort-models` on GitHub (no submodule needed).
By default tests use the `main` branch. To pin tests to a specific ref (tag/branch/commit), set
`VALIDATION_DATA_REF` when running tests:

```bash
VALIDATION_DATA_REF=main npm test
```
