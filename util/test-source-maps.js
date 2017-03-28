// Use the LSC test suite to test for missing source map information in LSC output.

// XXX: This may not be the ideal way to do this, but I don't want to mess with the
// `babel-helper-plugin-test-runner`.

const fs = require("fs");
const glob = require("glob");

const babel = require("babel-core");
const babylon_lightscript = require("babylon-lightscript");
const lightscript = require("babel-plugin-lightscript");
const traverse = require("babel-traverse").default;

const parserOpts = {
  sourceType: "script",
  allowImportExportEverywhere: false,
  allowReturnOutsideFunction: true,
  allowSuperOutsideMethod: true,
  plugins: [
    "lightscript",
    "flow",
    "jsx",
    "asyncFunctions",
    "asyncGenerators",
    "classConstructorCall",
    "classProperties",
    "decorators",
    "doExpressions",
    "exponentiationOperator",
    "exportExtensions",
    "functionBind",
    "functionSent",
    "objectRestSpread",
    "trailingFunctionCommas",
    "dynamicImport"
  ]
};

const babelOpts = {
  plugins: [lightscript]
};

const missingSourceMaps = [];

// XXX: get this from a cli arg or something
let stopAfterErrors = 10;

const jsFiles = glob.sync("test/fixtures/**/*.js");
for (const jsFile of jsFiles) {
  const code = fs.readFileSync(jsFile, { encoding: "utf8" });
  const parseTree = babylon_lightscript.parse(code, parserOpts);
  const { ast } = babel.transformFromAst(parseTree, code, babelOpts);

  traverse(ast, {
    enter(path) {
      const node = path.node;
      // start or end might be zero
      if (node && ( (node.start == null) || (node.end == null) || (!node.loc)) ) {
        const codeFrame = path.buildCodeFrameError("missing source map information");
        let column = "unknown", line = "unknown";
        if (codeFrame.loc) {
          line = codeFrame.loc.start.line;
          column = codeFrame.loc.start.column;
        }
        const missingSourceMapRecord = {
          file: jsFile,
          node,
          line,
          column
        };
        missingSourceMaps.push(missingSourceMapRecord);
      }
    }
  });

  if (missingSourceMaps.length >= stopAfterErrors) break;
}

if (missingSourceMaps.length > 0) {
  let errMsg = "";
  for (const record of missingSourceMaps) {
    errMsg += `${record.file}: (${record.line}:${record.column}) Missing source map for ${record.node.type} node`;
    errMsg += "\n";
  }
  process.stderr.write(errMsg);
  process.exit(1);
} else {
  process.exit(0);
}
