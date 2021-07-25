// @ts-check

// @ts-ignore
const { twoslasher } = require("@typescript/twoslash")
const path = require("path")
const fs = require("fs/promises")
const fsOld = require("fs");
const { EOL } = require("os")

let TEST_DIR = path.join(__dirname, "..", "test");
let TEST_FILENAME = "types.twoslash-test.ts";

async function generate (){
  process.stdout.write("generating... ")
  let source = await fs.readFile(path.join(TEST_DIR, TEST_FILENAME), "utf8");
  let GLOBALS = [
    "declare const global: any;",
    "declare const describe: any;",
    "declare const it: any;",
    "declare const expect: any;"
  ].join(EOL) + EOL;

  let twoSlashQueries = minimalTwoSlashQueries(twoslasher
    (GLOBALS + source, "ts", { vfsRoot: TEST_DIR }
  ));

  let { imports, body } = parseSource(source)
  let generatedSource =
    imports + EOL +
    "// @ts-ignore" + EOL +
    "global.twoSlashQueries = getTwoSlashQueries()" + EOL +
    body + EOL +
    `function getTwoSlashQueries() {
      return ${JSON.stringify(twoSlashQueries, null, "  ")}
    }`

  await fs.writeFile(
    path.join(TEST_DIR, TEST_FILENAME.replace("twoslash-", "")),
    generatedSource
  )
  process.stdout.write("done.\n")
}
generate();

/**
 * @type { (result: import("@typescript/twoslash").TwoSlashReturn) =>
 *    { text?: string
 *    , completions?: string[]
 *    }[]
 * }
 */
function minimalTwoSlashQueries(result) {
  return result.queries
    .map(q =>
      q.kind !== "completions" ? q :
      q.completions.some(c => c.name === "globalThis")
        ? { ...q, completions: [] }
        : q
    )
    .map(q => ({
      text: q.text,
      completions:
        q.completions?.map(c => c.name)
    }))
}


/**
 * @param source {string}
 */
function parseSource(source) {
  return source
    .split(EOL)
    .reduce((r, l) =>
      l.startsWith("import") ||
      (r.body === "" && l.startsWith("/*")) // to include eslint comment
        ? { ...r, imports: r.imports + l + EOL }
        : { ...r, body: r.body + l + EOL },
      { imports: "", body: "" }
    )
}
