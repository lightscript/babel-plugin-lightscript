// XXX: This may not be the ideal way to do this, but I don't want to mess with the
// `babel-helper-plugin-test-runner`.

const fs = require("fs");

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

// XXX: will eventually change this to iterate fixtures
const code = fs.readFileSync("test/fixtures/source-maps/fixture.js", { encoding: "utf8" });
const parseTree = babylon_lightscript.parse(code, parserOpts);
const { ast } = babel.transformFromAst(parseTree, null, { plugins: [lightscript] });

const missingSourceMaps = [];

traverse(ast, {
  enter(path) {
    const node = path.node;
    // start or end might be zero
    if (node && ( (node.start == null) || (node.end == null) || (!node.loc)) ) {
      const codeFrame = path.buildCodeFrameError("missing source map information");
      const missingSourceMapRecord = { node: node, line: codeFrame.loc.start.line, column: codeFrame.loc.start.column };
      missingSourceMaps.push(missingSourceMapRecord);
    }
  }
});

if (missingSourceMaps.length > 0) {
  let errMsg = "";
  for (const record of missingSourceMaps) {
    errMsg += `(${record.line}:${record.column}) Missing source map for ${record.node.type} node`;
    errMsg += "\n";
  }
  process.stderr.write(errMsg);
  process.exit(1);
} else {
  process.exit(0);
}
