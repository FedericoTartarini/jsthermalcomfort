Contributions are welcome, and they are greatly appreciated! Every little bit helps, and credit will always be given.

## Bug reports

When [reporting a bug](https://github.com/FedericoTartarini/jsthermalcomfort/issues) please include:

- Your operating system name and version.
- Any details about your local setup that might be helpful in troubleshooting.
- Detailed steps to reproduce the bug.

## Documentation improvements

If you find any issue in our online documentation please open
an [issue](https://github.com/FedericoTartarini/jsthermalcomfort/issues).

jsthermalcomfort could always use more documentation, whether as part of the official jsthermalcomfort docs, in JSDocs,
or even on the web in blog posts, articles, and such.

## Feature requests and feedback

The best way to send feedback is to file an issue
at [https://github.com/FedericoTartarini/jsthermalcomfort/issues](https://github.com/FedericoTartarini/jsthermalcomfort/issues)

If you are proposing a feature:

- Explain in detail how it would work.
- Keep the scope as narrow as possible, to make it easier to implement.
- Remember that this is a volunteer-driven project, and that code contributions are welcome :)

## Local development

To set up jsthermalcomfort for local development:

1. Fork jsthermalcomfort (look for the “Fork” button).
2. Clone your fork locally. Fetch and pull all the updates from the main branch before you do anything:

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

4. When you’re done making changes run all tests using Vitest:
   - Install dependencies

   ```bash
   npm install
   ```

   ```bash
   npm run test
   ```
   - Run prettier to format your code:

   ```bash
   npm run format
   ```
   - Run ESLint over `src/` and `tests/`, less the files `eslint.config.mjs` names in `UNLINTED`:

   ```bash
   npm run lint
   ```
   - Commit your changes:

   ```bash
   git add .
   git commit -m "Your detailed description of your changes."
   ```
   - Check that the docs build:

   ```bash
   npm run docs
   ```
   - Push your branch to GitHub:

   ```bash
   git push origin name-of-your-bugfix-or-feature
   ```

5. Submit a pull request after you have done all your modifications and tested your work. The pull request should
   include a detailed description of your work:
   - What this pull request is about
   - Have you tested your work
   - Will this work affect other component in the product

### Pull Request Guidelines

If you need some code review or feedback while you’re developing the code just make the pull request.

For merging, you should:

- Include passing tests (run `npm run test`).
- Update documentation when there’s new API, functionality etc.

## Documentation

We are using [TSDoc](https://tsdoc.org/) comments and [TypeDoc](https://typedoc.org/) to
automatically build the documentation.

The hand-written pages are the Markdown files in the `docs` folder, and `typedoc.json` lists them.
After updating them, please run the command:

```bash
npm run docs
```

The site is generated into the `_site` folder, which git ignores.

## How to Add a New Thermal Comfort Model

A model follows pythermalcomfort's current release: its logic, values, names and docstring. `src/models/heat_index_rothfusz.ts`, its test and its register are the worked example.

### 1. Create the Model File

Create `src/models/<name>.ts`, with upstream's file and function name. In order, it holds:

1. the imports;
2. `*_INFO`, the single source of truth, `deepFreeze({ … } as const satisfies ModelInfo)`: its `standards` list the standards whose values the model takes (`[]` where upstream names none), its `inputs` hold every keyword argument with its kind (`numeric`, `bool`, `choice` or `instance`), unit, applicability and default, and its `outputs` hold each returned value with its kind (`numeric`, `flag`, `label` or `label_or_numeric`, and `nullable` where upstream can return NaN for it, which the library returns as `null`), unit and classifier, the classifier inline, or upstream's named bins constant under its name at the place upstream keeps it (`HEAT_INDEX_RISK_CATEGORIES` in `src/_internal/validation.ts`, `TSV_CATEGORIES` in each PMV model's file); an output's description is a list item of the function's `@returns` (item 5), not a comment on its key;
3. the inputs type, `InputsOf<typeof MY_NEW_MODEL_INFO>`, named after upstream's input class;
4. the outputs type, `OutputsOf<typeof MY_NEW_MODEL_INFO>`, named after upstream's dataclass, its TSDoc the dataclass docstring's summary; its fields are those of `outputs`, then `warnings`;
5. the TSDoc block and the public function, whose `@returns` lists each output, ``- `key` - text``, with the dataclass's `Attributes` text;
6. the private functions in upstream's order.

A return dataclass that upstream shares between models (`HI`, `SET`, `WorkCapacity`) is declared in the file of the first migrated model that returns it, and the others import it.

### 2. Follow Upstream, and Document With TSDoc

- Validate with `parseInputs(MY_NEW_MODEL_INFO, inputs)` (`src/_internal/define.ts`). Its messages follow `CODING_STANDARDS.md` ("Upstream's words"). Write a fact once and reference it from INFO, never by writing it again. A unit is a `UnitSymbol` (`src/_internal/modelInfo.ts`); a model that needs a new one adds it there.
- The model file holds only upstream's docstrings and code comments, with the why-comments `CODING_STANDARDS.md` ("Only upstream's words in a model file") allows. The docstring is one TSDoc block above the public function, in upstream's order: the summary, `@param inputs` and one `@param inputs.<key>` per Parameters entry with its text verbatim, each `.. note::` as `> [!NOTE]`, `@returns`, and the example as a TypeScript call with upstream's inputs and outputs. A citation `[Key]_` becomes a link to its entry, `[Key](../../docs/references.md#key)`. Upstream's `#` comments are copied verbatim.
- Record every difference from upstream that the whitelist does not cover as a row in `docs/deviations/<name>.md`, in the format `docs/deviations/README.md` gives, its TS site naming the file and the symbol. An error in an upstream docstring or code comment is fixed, given a row, and reported upstream. A note that is not a deviation, such as ADR 0009's on the executed path's arithmetic, goes in the register's Notes section.

### 3. Register the Model

List the function, its `*_INFO` and its types by name in `src/models/index.ts`:

```ts
import { my_new_model, MY_NEW_MODEL_INFO } from "./my_new_model.ts";
export type { MyNewModelInputs, MyNewModel } from "./my_new_model.ts";
```

The type names are upstream's input class and dataclass.

then add `my_new_model` and `MY_NEW_MODEL_INFO` to both the `export { … }` list and the default export there. The package root re-exports the subpath indexes, so nothing else needs editing.

### 4. Test It

- Mirror upstream's `tests/test_<name>.py` in `tests/models/<name>.test.ts`, following the conventions at the top of `tests/models/testUtils.ts`.
- Add the model to the parity suite, as `scripts/parity/README.md` ("Adding a model") describes.

---

## How to Update Documentation

The documentation is generated by TypeDoc from the comments in `src/` and the Markdown pages in `docs/`.

### 1. Edit the Pages

- **Pages**: Edit the Markdown files in `docs/`. A new page is added to `projectDocuments` in `typedoc.json`.
- **Configuration**: Edit `typedoc.json` to change the entry points or the pages.

### 2. Build and Verify Locally

Run the following command to build the documentation to the `_site/` folder:

```bash
npm run docs
```

You can then open `_site/index.html` in your browser to verify the changes.

---

## Developer Workflow

- **Install Dependencies**: `npm ci`
- **Run Tests**: `npm test`
- **Format Code**: `npm run format` (Please run this before committing!)
- **Lint Check**: `npm run check:format`

Please ensure all tests pass and your code is correctly formatted before submitting a Pull Request.

## How to publish a new version of jsthermalcomfort

Releases are published from Git tags by GitHub Actions. Local builds are not required for publishing.

1. Ensure your branch is merged to `main` and CI is green.
2. Bump the package version with npm:
   - Patch release: `npm version patch`
   - Minor release: `npm version minor`
   - Major release: `npm version major`
   - Exact version: `npm version 1.2.3`
3. Push the commit and tags:
   ```bash
   git push && git push --tags
   ```
4. Pushing a `v*` tag (for example `v1.0.3`) triggers the publish workflow.

The publish workflow runs checks (`npm run check:format`, `npm test`, `npm run build`) and then automatically:

- Runs `npm publish` to publish the package to the NPM registry.
- Creates a new GitHub Release with automatically generated release notes based on merged PRs.
