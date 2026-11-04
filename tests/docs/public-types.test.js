import { expect, test } from "@jest/globals";
import { spawnSync } from "node:child_process";

test("public API documentation builds with unique scalar/array type aliases", () => {
  // Run the real theme in a separate process: missing or duplicate public types
  // terminate the process. Direct import also avoids documentation.js's Windows
  // absolute-path dynamic-import bug without changing the production CLI.
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    import { build } from 'documentation';
    import mergeConfig from './node_modules/documentation/src/merge_config.js';
    import theme from './docs_theme/index.js';
    const config = await mergeConfig({
      config: 'documentation.yml', access: ['public'],
      output: 'tmp/docs-public-types-test'
    });
    const comments = await build(['src/index.js'], config);
    const names = comments.filter(c => c.kind === 'typedef').map(c => c.name);
    assert.equal(new Set(names).size, names.length, 'Public typedef names must be unique');
    for (const name of ['WbgtNumericInput', 'HothapsWbgtInput', 'HothapsCapacity']) {
      assert.ok(names.includes(name), name + ' must be public');
    }
    await theme(comments, config);
    console.log('PUBLIC_DOCS_BUILD_OK');
  `,
    ],
    { encoding: "utf8", timeout: 30000 },
  );
  expect({
    status: result.status,
    error: result.error?.message,
    stderr: result.status === 0 ? undefined : result.stderr,
  }).toEqual({
    status: 0,
    error: undefined,
    stderr: undefined,
  });
  expect(result.stdout).toContain("PUBLIC_DOCS_BUILD_OK");
}, 35000);
