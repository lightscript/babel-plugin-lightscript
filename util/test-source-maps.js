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
  .usage("Usage: $0 [fileGlob]")
  .boolean("stopOnError")
  .boolean("errorsOnly")
  .boolean("errorOnMismatch")
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

function describe(node) {
  if (node.type === "Identifier") {
    return `\`${node.name}\``;
  } else if (node.type === "StringLiteral") {
    return `"${node.value}"`;
  } else if (node.type === "NumericLiteral") {
    return `#${node.value}#`;
  } else {
    return node.type;
  }
}

function formatAstNode(nodeIndex, indent, node) {
  const indentation = Array((indent * 2) + 1).join(" ");
  return `${pad(nodeIndex)} ${indentation}${describe(node)}@${locate(node)}\n`;
}

const fileRecords = [];
let errors = 0;

const jsFiles = glob.sync( (argv._ && argv._[0]) || "test/fixtures/**/*.js");
for (const jsFile of jsFiles) {
  // Skip expected.js fixtures
  if (/expected\.js$/.test(jsFile)) continue;

  // Read JS
  const code = fs.readFileSync(jsFile, { encoding: "utf8" });

  // If I am an actual.js...
  let expected = null;
  if (/actual\.js$/.test(jsFile)) {
    // If there is an expected.js, read it in
    const pathInfo = path.parse(jsFile);
    pathInfo.base = "expected.js";
    const expectedJsPath = path.format(pathInfo);
    if (fs.existsSync(expectedJsPath)) {
      expected = fs.readFileSync(expectedJsPath, { encoding: "utf8"});
    }
  }

  let parseTree, ast, transformedCode;
  try {
    parseTree = babylon_lightscript.parse(code, parserOpts);
    let result = babel.transformFromAst(parseTree, code, babelOpts);
    ast = result.ast;
    transformedCode = result.code;
  } catch (err) {
    // If compiling multiple files, Assume babel errors are intentional
    if (jsFiles.length === 1) {
      throw (err);
    } else {
      continue;
    }
  }

  const fileRecord = {
    pathName: jsFile,
    code,
    expected,
    matchesExpected: expected && (expected.trim() === transformedCode.trim()),
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

        const problem = (type, text) => {
          const errorRecord = createErrorRecord(jsFile, node, path, nodeIndex, text);
          errorRecord.type = type;
          if (type === "error") errors++;
          fileRecord.problems.push(errorRecord);
        };

        // start or end might be zero
        if ( !node.loc ) {
          problem("error", "node.loc is missing.");
        } else if (node.start == null) {
          problem("error", "node.start is missing");
        } else if (node.end == null) {
          problem("error", "node.end is missing");
        } else {
          if ( (otherNode = path.getPrevSibling().node) ) {
            if (otherNode.start && node.start < otherNode.start) {
              problem("order", "Starts before prevSibling starts.");
            }

            if (otherNode.end && node.start < otherNode.end) {
              problem("order", "Starts before prevSibling ends.");
            }
          }

          if ( path.parentPath && (otherNode = path.parentPath.node) ) {
            if (otherNode.start && node.start < otherNode.start) {
              // If parent is a MemberExpression, this is okay, because
              // babylon makes member expressions point at the ".y"
              // part of "x.y"
              if (otherNode.type !== "MemberExpression") {
                problem("order", "Starts before parent starts.");
              }
            }

            if (otherNode.start && node.end < otherNode.start) {
              problem("order", "Ends before parent starts.");
            }

            if (otherNode.end && node.start > otherNode.end) {
              problem("order", "Starts after parent ends.");
            }

            if (otherNode.end && node.end > otherNode.end) {
              // ReturnStatements come before the expr they return.
              if (otherNode.type !== "ReturnStatement") {
                problem("order", "Ends after parent ends.");
              }
            }
          }
        }

        fileRecord.astNodes.push(formatAstNode(nodeIndex, indent, node));
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

  if (argv.errorOnMismatch && fileRecord.expected && !fileRecord.matchesExpected) {
    fileRecord.problems.push({
      type: "error",
      msg: "Test fixture output mismatch."
    });
    errors++;
  }

  fileRecords.push(fileRecord);
  if (errors > 0 && (argv.stopOnError)) break;
}

for (const fileRecord of fileRecords) {
  if (
    argv.errorsOnly && !fileRecord.problems.find( (x) => x.type === "error" )
  ) {
    continue;
  }

  let msg = `\n\x1b[33m------\n${fileRecord.pathName}\n------\x1b[0m\n\n`;
  msg += "\x1b[36mSource code:\x1b[0m\n\n";
  msg += fileRecord.code + "\n";
  msg += "\x1b[36mTransformed code:\x1b[0m\n\n";
  msg += fileRecord.transformedCode + "\n\n";
  if (fileRecord.expected) {
    msg += "\x1b[36mExpected fixture:\x1b[0m\n\n";
    msg += fileRecord.expected + "\n";
    if (fileRecord.matchesExpected) {
      msg += "\x1b[32mMATCH\x1b[0m\n\n";
    } else {
      msg += "\x1b[41mMISMATCH\x1b[0m\n\n";
    }
  }
  msg += "\x1b[36mAST:\x1b[0m\n\n";
  for (const astNode of fileRecord.astNodes) {
    msg += astNode;
  }
  msg += "\n\n";

  if (fileRecord.problems.length > 0) {
    msg += "\x1b[31mPROBLEMS:\x1b[0m\n\n";
    for (const record of fileRecord.problems) {
      if (record.msg) {
        msg += `${record.type}: ${record.msg}\n`;
      } else {
        msg += `${record.type}: ${describe(record.node)} #${record.nodeIndex} @ ${locate(record.node)}: ${record.problem}`;
        msg += "\n";
      }
    }
  }

  process.stdout.write(msg);
}

process.exit(errors);
