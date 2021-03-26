# bicep-textmate
Textmate grammar prototype for https://github.com/Azure/bicep

## Changing the grammar
* [`grammar.ts`](./src/grammar/grammar.ts) contains the code to generate the textmate grammar ([`bicep.tmlanguage.json`](./bicep.tmlanguage.json)). Changes should be made to this file.
* To update the textmate grammar, run:
    ```sh
    cd src/grammar
    npm i
    npm run build
    ```

## Tests
* Run the tests with:
    ```sh
    cd src/tests
    npm i
    npm test
    ```
* The tests:
    * Run through all the `.bicep` files in [src/tests/baselines](./src/tests/baselines).
    * Dump the token information to the corresponding `.tokens` files.
    * Compare to see if there are any differences. This makes it easy to iterate quickly and preview changes.

## Previewing with VSCode
* Install dependencies:
    ```sh
    cd src/vscode-biceptm
    npm i
    ```
* In VSCode, select the **Extension Preview** [Run/Debug option](https://code.visualstudio.com/Docs/editor/debugging), and open a `.bicep` file in the new VSCode window that pops up. The [Scope Inspector](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide#scope-inspector) is helpful for debugging scoping rules.