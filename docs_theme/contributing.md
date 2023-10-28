
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
