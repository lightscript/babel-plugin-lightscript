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
  plugins: [lightscript],
  generatorOpts: {
    retainLines: false,
    compact: false,
    concise: false
  }
};

function createErrorRecord(file, node, path, nodeIndex) {
  // Build code frame
  const codeFrame = path.buildCodeFrameError("missing source map information");
  let column = "unknown", line = "unknown";
  if (codeFrame.loc && codeFrame.loc.start) {
    line = codeFrame.loc.start.line;
    column = codeFrame.loc.start.column;
  }

  return {
    file, node, line, column, nodeIndex
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

const jsFiles = glob.sync(process.argv[2] || "test/fixtures/**/*.js");
for (const jsFile of jsFiles) {
  // Skip expected.js fixtures
  if (/expected\.js$/.test(jsFile)) continue;

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

        // start or end might be zero
        if ( !node.loc ) {
          errorRecord = createErrorRecord(jsFile, node, path, nodeIndex);
          errorRecord.problem = "node.loc is missing.";
        } else if (node.start == null) {
          errorRecord = createErrorRecord(jsFile, node, path, nodeIndex);
          errorRecord.problem = "node.start is missing";
        } else if (node.end == null) {
          errorRecord = createErrorRecord(jsFile, node, path, nodeIndex);
          errorRecord.problem = "node.end is missing";
        } else if ( (otherNode = path.getPrevSibling().node) ) {
          if (otherNode.start && node.start < otherNode.start) {
            errorRecord = createErrorRecord(jsFile, node, path, nodeIndex);
            errorRecord.problem = "Starts before prevSibling starts.";
          }

          if (otherNode.end && node.start < otherNode.end) {
            errorRecord = createErrorRecord(jsFile, node, path, nodeIndex);
            errorRecord.problem = "Starts before prevSibling ends.";
          }
        } else if ( path.parentPath && (otherNode = path.parentPath.node) ) {
          if (otherNode.start && node.start < otherNode.start) {
            errorRecord = createErrorRecord(jsFile, node, path, nodeIndex);
            errorRecord.problem = "Starts before parent starts.";
          }

          if (otherNode.start && node.start > otherNode.end) {
            errorRecord = createErrorRecord(jsFile, node, path, nodeIndex);
            errorRecord.problem = "Starts after parent ends.";
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
}

let hasError = false;
for (const fileRecord of fileRecords) {
  let msg = `\x1b[33m${fileRecord.pathName}\x1b[0m\n\n`;
  msg += "\x1b[36mSource code:\x1b[0m\n\n";
  msg += fileRecord.code + "\n\n";
  msg += "\x1b[36mTransformed code:\x1b[0m\n\n";
  msg += fileRecord.transformedCode + "\n\n";
  msg += "\x1b[36mAST:\x1b[0m\n\n";
  for (const astNode of fileRecord.astNodes) {
    msg += astNode;
  }
  msg += "\n\n";

  if (fileRecord.problems.length > 0) {
    hasError = true;
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
