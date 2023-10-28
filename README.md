# Overview

|        docs         | [![docs](https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/test_docs.yml/badge.svg)][docs_link]                                                                 |
| :-----------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|      **build**      | [![build](https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/build.yml/badge.svg)][build_link]                                                                   |
|      **tests**      | [![test](https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/test.yml/badge.svg)][test_link]                                                                      |
| **page deployment** | [![page deployment](https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/pages/pages-build-deployment/badge.svg)][deploy_link]                                     |
|  **snyk security**  | [![synk](https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/snyk.yml/badge.svg)][synk_link]                                                                      |
|     **license**     | [![license](https://custom-icon-badges.demolab.com/github/license/denvercoder1/custom-icon-badges?logo=law)](https://github.com/FedericoTartarini/jsthermalcomfort/blob/main/LICENSE) |
|   **npm version**   | [![npm](https://img.shields.io/npm/v/jsthermalcomfort?style=plastic&logo=npm&logoColor=rgb)][npm_link]                                                                                |

Package to calculate several thermal comfort indices (e.g. PMV, PPD, SET, adaptive) and convert physical variables.

Please cite us if you use this package: [Tartarini, F., Schiavon, S., 2020. pythermalcomfort: A Python package for thermal comfort research. SoftwareX 12, 100578. https://doi.org/10.1016/j.softx.2020.100578](https://www.sciencedirect.com/science/article/pii/S2352711020302910)

- Free software: MIT license
- Authors: [Omar Jesus Acuache Briceno](https://www.linkedin.com/in/omar-acuache), [Ruoshui Chen](https://github.com/ChristinChen233), [Jingyu Lu](https://github.com/Lu-Whale), [Yuchen Mu](https://github.com/YuchenMu), [Jordan Ocokoljic](https://github.com/JordanOcokoljic), [Santiago Zaldivar del Alba​](https://github.com/szaldivar)

[docs_link]: https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/test_docs.yml
[build_link]: https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/build.yml
[test_link]: https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/test.yml
[deploy_link]: https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/pages/pages-build-deployment
[synk_link]: https://github.com/FedericoTartarini/jsthermalcomfort/actions/workflows/snyk.yml
[npm_link]: https://www.npmjs.com/package/jsthermalcomfort

# Installation

```bash
npm install jsthermalcomfort
```

if you want to use jsthermalcomfort package without installing it on your local machine, you can import with:

[`https://cdn.jsdelivr.net/gh/FedericoTartarini/jsthermalcomfort/lib/esm/`](https://cdn.jsdelivr.net/gh/FedericoTartarini/jsthermalcomfort/lib/esm/)

Example:

```javascript
import {
  models,
  utilities,
  pschymetrics,
} from "https://cdn.jsdelivr.net/gh/FedericoTartarini/jsthermalcomfort/lib/esm/index.js";
```

You can also import it in the website directly, and caution that you need to mark the script as module:

```html
<script type="module">
  import {
    models,
    utilities,
    pschymetrics,
  } from "https://cdn.jsdelivr.net/gh/FedericoTartarini/jsthermalcomfort/lib/esm/index.js";
</script>
```

# Examples and Tutorials

## [Examples](https://github.com/FedericoTartarini/jsthermalcomfort/tree/main/docs/examples) files on how to use some of the functions

Here is a list of examples running in the browser:

- [PHS](/jsthermalcomfort/examples/phs.html)

# Contributing

Contributions are welcome, and they are greatly appreciated! Every little bit helps, and credit will always be given.

## Bug reports

When [reporting a bug](https://github.com/FedericoTartarini/jsthermalcomfort/issues) please include:

- Your operating system name and version.
- Any details about your local setup that might be helpful in troubleshooting.
- Detailed steps to reproduce the bug.

## Documentation improvements

jsthermalcomfort could always use more documentation, whether as part of the official jsthermalcomfort docs, in JSDocs, or even on the web in blog posts, articles, and such.

## Feature requests and feedback

The best way to send feedback is to file an issue at [https://github.com/FedericoTartarini/jsthermalcomfort/issues](https://github.com/FedericoTartarini/jsthermalcomfort/issues)

If you are proposing a feature:

- Explain in detail how it would work.
- Keep the scope as narrow as possible, to make it easier to implement.
- Remember that this is a volunteer-driven project, and that code contributions are welcome :)

## Development

To set up jsthermalcomfort for local development:

1. Fork jsthermalcomfort (look for the “Fork” button).
2. Clone your fork locally. Fetch and pull all the updates from the master branch before you do anything:

   ```bash
   git clone git@github.com:FedericoTartarini/jsthermalcomfort.git
   ```

3. Create a branch for local development. The naming rule for new branch are, as follows:

   - If this update is for a new feature Feature/feature_name_here
   - If this update is for bug fix Fix/bug_name_here
   - If this update is for documentation Documentation/doc_name_here

   You can create a branch locally using the following command. Make sure you only push updates to this new branch only:

   ```bash
   git checkout -b name-of-your-bugfix-or-feature
   ```

   Now you can make your changes locally.

4. When you’re done making changes run all tests using Jest:

   ```bash
   npm run test
   ```

   - Run prettier to format your code:

   ```bash
   npm run format
   ```

   - Commit your changes:

   ```bash
   git add .
   git commit -m "Your detailed description of your changes."
   ```

   - Update the docs:

   ```bash
   npm run docs
   ```

   - Commit your documentation changes:

   ```bash
   git add .
   git commit -m "Your detailed description of your changes."
   ```

   - Push your branch to GitHub:

   ```bash
   git push origin name-of-your-bugfix-or-feature
   ```

5. Submit a pull request after you have done all your modifications and tested your work. The pull request should include a detailed description of your work:
   - What this pull request is about
   - Have you tested your work
   - Will this work affect other component in the product

### Pull Request Guidelines

If you need some code review or feedback while you’re developing the code just make the pull request.

For merging, you should:

- Include passing tests (run `npm run test`).
- Update documentation when there’s new API, functionality etc.

### Documentation

We are using [JSDoc](https://jsdoc.app/) and [documentation.js](https://github.com/documentationjs/documentation) to automatically build the documentation.

### To add a function

1. Add a file under `src/models/` with the name of the function/model and document it.
2. Add any related functions that are used by your function either in `src/utilities/utilities.js` or `src/psychrometrics/`. See existing code as example.
   - In order to add a new function/API to the library you should mark that function as `@public`, add it to its corresponding category, for example for models you should do `@memberof models`, and lastly you should give it a proper name for the documentation with `@docname`, for example: `@docname Clothing prediction`. It is important to note that you should also add the `@public` tag to any types the function exposes/uses.
3. Test your function by writing a test in `tests/models/<name_of_model>.test.js`.

### Tips

To run a subset of tests you can do the following:

```bash
npm run test -- '<path_to_test_file>' -t '<test_pattern/name>'
```

If you are using VSCode you can use the [Jest Runner extension](https://marketplace.visualstudio.com/items?itemName=firsttris.vscode-jest-runner) to easily run subset of tests.

### Releases

To create a new release do the following:

1. Update the `package.json` version to the new version (we use the semantic release system for versioning)
2. Run `npm run build` to update the `lib` directory (output with types of the library that gets published to NPM) and commit the updates
3. In GitHub go to Releases -> click `Draft a new release`
4. Click `Choose a tag` and type the new version, for example `v0.1,1`
5. Write the title and description and click `Publish release`
6. This will trigger a GitHub action that will publish the new version to NPM
