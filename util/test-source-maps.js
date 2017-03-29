// Use the LSC test suite to test for missing source map information in LSC output.

// XXX: This may not be the ideal way to do this, but I don't want to mess with the
// `babel-helper-plugin-test-runner`.

const fs = require("fs");
const glob = require("glob");
const path = require("path");

const babel = require("babel-core");
const babylon_lightscript = require("babylon-lightscript");
const lightscript = require("babel-plugin-lightscript");
const traverse = require("babel-traverse").default;

const argv = require("yargs")
  .usage("Usage: $0 [--stopOnError] [fileGlob]")
  .boolean("stopOnError")
  .boolean("errorsOnly")
  .argv;

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
  plugins: [lightscript],
};

function createErrorRecord(file, node, path, nodeIndex, problem) {
  const codeFrame = path.buildCodeFrameError("missing source map information");
  let column = "unknown", line = "unknown";
  if (codeFrame.loc && codeFrame.loc.start) {
    line = codeFrame.loc.start.line;
    column = codeFrame.loc.start.column;
  }

  return {
    file, node, line, column, nodeIndex, problem
  };
}

function locate(node) {
  if (node.loc) {
    if (node.loc.start && node.loc.end) {
      return `(loc: ${node.loc.start.line}:${node.loc.start.column}-${node.loc.end.line}:${node.loc.end.column} start: ${node.start} end: ${node.end})`;
    } else if (node.loc.start) {
      return `(loc ${node.loc.start.line}:${node.loc.start.column} start: ${node.start})`;
    }
  }
  return "(UNKNOWN)";
}

function pad(n) {
  return ("00" + n).slice(-3);
}

const fileRecords = [];

const jsFiles = glob.sync( (argv._ && argv._[0]) || "test/fixtures/**/*.js");
for (const jsFile of jsFiles) {
  // Skip expected.js fixtures
  if (/expected\.js$/.test(jsFile)) continue;
  // If there is an expected.js, read it in
  const pathInfo = path.parse(jsFile);
  pathInfo.base = "expected.js";
  const expectedJsPath = path.format(pathInfo);
  let expected = null;
  if (fs.existsSync(expectedJsPath)) {
    expected = fs.readFileSync(expectedJsPath, { encoding: "utf8"});
  }

  const code = fs.readFileSync(jsFile, { encoding: "utf8" });
  let parseTree, ast, transformedCode;
  try {
    parseTree = babylon_lightscript.parse(code, parserOpts);
    let result = babel.transformFromAst(parseTree, code, babelOpts);
    ast = result.ast;
    transformedCode = result.code;
  } catch (err) {
    // Assume babel errors are intentional
    continue;
  }

  const fileRecord = {
    pathName: jsFile,
    code,
    expected,
    transformedCode,
    astNodes: [],
    problems: []
  };

  let indent = 0, nodeIndex = 0;

  traverse(ast, {
    enter(path) {
      const node = path.node;
      let otherNode;
      let errorRecord = null;

      // Look for problems with the node
      if (node) {
        nodeIndex++;

        const problem = (text) => {
          const errorRecord = createErrorRecord(jsFile, node, path, nodeIndex, text);
          fileRecord.problems.push(errorRecord);
        }

        // start or end might be zero
        if ( !node.loc ) {
          problem("node.loc is missing.");
        } else if (node.start == null) {
          problem("node.start is missing");
        } else if (node.end == null) {
          problem("node.end is missing");
        } else {
          if ( (otherNode = path.getPrevSibling().node) ) {
            if (otherNode.start && node.start < otherNode.start) {
              problem("Starts before prevSibling starts.");
            }

            if (otherNode.end && node.start < otherNode.end) {
              problem("Starts before prevSibling ends.");
            }
          }

          if ( path.parentPath && (otherNode = path.parentPath.node) ) {
            if (otherNode.start && node.start < otherNode.start) {
              problem("Starts before parent starts.");
            }

            if (otherNode.start && node.end < otherNode.start) {
              problem("Ends before parent starts.");
            }

            if (otherNode.start && node.start > otherNode.end) {
              problem("Starts after parent ends.");
            }
          }
        }

        fileRecord.astNodes.push(`${pad(nodeIndex)} ${Array((indent * 2) + 1).join(" ")}${node.type}@${locate(node)}\n`);
      }

      // Add error record
      if (errorRecord) {
        fileRecord.problems.push(errorRecord);
      }

      indent++;
    },

    exit() {
      indent--;
    }
  });

  fileRecords.push(fileRecord);
  if (fileRecord.problems.length > 0 && (argv.stopOnError)) break;
}

let hasError = false;
for (const fileRecord of fileRecords) {
  if (fileRecord.problems.length > 0) {
    hasError = true;
  } else if (argv.errorsOnly) {
    continue;
  }

  let msg = `\x1b[33m${fileRecord.pathName}\x1b[0m\n\n`;
  msg += "\x1b[36mSource code:\x1b[0m\n\n";
  msg += fileRecord.code + "\n";
  msg += "\x1b[36mTransformed code:\x1b[0m\n\n";
  msg += fileRecord.transformedCode + "\n\n";
  if (fileRecord.expected) {
    msg += "\x1b[36mExpected fixture:\x1b[0m\n\n";
    msg += fileRecord.expected + "\n";
  }
  msg += "\x1b[36mAST:\x1b[0m\n\n";
  for (const astNode of fileRecord.astNodes) {
    msg += astNode;
  }
  msg += "\n\n";

  if (fileRecord.problems.length > 0) {
    msg += "\x1b[31mERRORS:\x1b[0m\n\n";
    for (const record of fileRecord.problems) {
      msg += `${record.node.type} #${record.nodeIndex} @ ${locate(record.node)}: ${record.problem}`;
      msg += "\n";
    }
  }

  process.stdout.write(msg);
}

if (hasError) {
  process.exit(1);
} else {
  process.exit(0);
}
