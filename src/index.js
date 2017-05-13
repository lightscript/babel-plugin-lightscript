import { parse } from "babylon-lightscript";
import { defaultImports, lightscriptImports, lodashImports } from "./stdlib";

export default function (babel) {
  const { types: t } = babel;

  // BABEL-TYPES copypasta; see https://github.com/babel/babel/pull/4886
  /* eslint-disable no-unused-vars */

  function getType(val) {
    if (Array.isArray(val)) {
      return "array";
    } else if (val === null) {
      return "null";
    } else if (val === undefined) {
      return "undefined";
    } else {
      return typeof val;
    }
  }

  function assertEach(callback: Function): Function {
    function validator(node, key, val) {
      if (!Array.isArray(val)) return;

      for (let i = 0; i < val.length; i++) {
        callback(node, `${key}[${i}]`, val[i]);
      }
    }
    validator.each = callback;
    return validator;
  }

  function assertOneOf(...vals): Function {
    function validate(node, key, val) {
      if (vals.indexOf(val) < 0) {
        throw new TypeError(
          `Property ${key} expected value to be one of ${JSON.stringify(vals)} but got ${JSON.stringify(val)}`
        );
      }
    }

    validate.oneOf = vals;

    return validate;
  }

  function assertNodeType(...types: Array<string>): Function {
    function validate(node, key, val) {
      let valid = false;

      for (const type of types) {
        if (t.is(type, val)) {
          valid = true;
          break;
        }
      }

      if (!valid) {
        throw new TypeError(
          `Property ${key} of ${node.type} expected node to be of a type ${JSON.stringify(types)} ` +
          `but instead got ${JSON.stringify(val && val.type)}`
        );
      }
    }

    validate.oneOfNodeTypes = types;

    return validate;
  }

  function assertNodeOrValueType(...types: Array<string>): Function {
    function validate(node, key, val) {
      let valid = false;

      for (const type of types) {
        if (getType(val) === type || t.is(type, val)) {
          valid = true;
          break;
        }
      }

      if (!valid) {
        throw new TypeError(
          `Property ${key} of ${node.type} expected node to be of a type ${JSON.stringify(types)} ` +
          `but instead got ${JSON.stringify(val && val.type)}`
        );
      }
    }

    validate.oneOfNodeOrValueTypes = types;

    return validate;
  }

  function assertValueType(type: string): Function {
    function validate(node, key, val) {
      const valid = getType(val) === type;

      if (!valid) {
        throw new TypeError(`Property ${key} expected type of ${type} but got ${getType(val)}`);
      }
    }

    validate.type = type;

    return validate;
  }

  function chain(...fns: Array<Function>): Function {
    function validate(...args) {
      for (const fn of fns) {
        fn(...args);
      }
    }
    validate.chainOf = fns;
    return validate;
  }

  /* eslint-enable no-unused-vars */

  function definePluginType(
    type: string,
    opts: {
      fields?: Object;
      visitor?: Array<string>;
      aliases?: Array<string>;
      builder?: Array<string>;
      inherits?: string;
      deprecatedAlias?: string;
    } = {},
  ) {
    const inherits = {};
    if (opts.inherits) {
      inherits.visitor = t.VISITOR_KEYS[opts.inherits];
      inherits.builder = t.BUILDER_KEYS[opts.inherits];
      inherits.fields = t.NODE_FIELDS[opts.inherits];
      inherits.aliases = t.ALIAS_KEYS[opts.inherits];
    }

    opts.fields  = opts.fields || inherits.fields || {};
    opts.visitor = opts.visitor || inherits.visitor || [];
    opts.aliases = opts.aliases || inherits.aliases || [];
    opts.builder = opts.builder || inherits.builder || opts.visitor || [];

    if (opts.deprecatedAlias) {
      t.DEPRECATED_KEYS[opts.deprecatedAlias] = type;
    }

    // ensure all field keys are represented in `fields`
    for (const key of (opts.visitor.concat(opts.builder): Array<string>)) {
      opts.fields[key] = opts.fields[key] || {};
    }

    for (const key in opts.fields) {
      const field = opts.fields[key];

      if (opts.builder.indexOf(key) === -1) {
        field.optional = true;
      }
      if (field.default === undefined) {
        field.default = null;
      } else if (!field.validate) {
        field.validate = assertValueType(getType(field.default));
      }
    }

    t.VISITOR_KEYS[type] = opts.visitor;
    t.BUILDER_KEYS[type] = opts.builder;
    t.NODE_FIELDS[type]  = opts.fields;
    t.ALIAS_KEYS[type]   = opts.aliases;

    // the below should not be necessary; see https://github.com/babel/babel/pull/4886
    t.TYPES.push(type);

    opts.aliases.forEach((alias) => {
      t.FLIPPED_ALIAS_KEYS[alias] = t.FLIPPED_ALIAS_KEYS[alias] || [alias];
      t.FLIPPED_ALIAS_KEYS[alias].push(type);

      if (!t.TYPES[alias]) t.TYPES.push(alias);
    });
  }


  // HELPER FUNCTIONS
  function isFunctionDeclaration(node) {
    return node && (t.is("FunctionDeclaration", node) || node.type === "NamedArrowDeclaration");
  }

  function transformTails(path, allowLoops, getNewNode) {
    path.resync();

    const tailPaths = getTailExpressions(path.get("body"), allowLoops);
    for (const tailPath of tailPaths) {
      if (!tailPath) continue;

      if (tailPath.isExpressionStatement()) {
        tailPath.replaceWith(getNewNode(tailPath.node.expression, tailPath));
      } else if (tailPath.isVariableDeclaration()) {
        // TODO: handle declarations.length > 1
        // TODO: add linting to discourage
        tailPath.insertAfter(getNewNode(tailPath.node.declarations[0].id, tailPath));
      } else if (isFunctionDeclaration(tailPath.node)) {
        // Need to transform exprs to statements since this is block context.
        const nextNode = getNewNode(tailPath.node.id, tailPath);
        if (t.isExpression(nextNode)) {
          tailPath.insertAfter(t.expressionStatement(nextNode));
        } else {
          tailPath.insertAfter(nextNode);
        }
      }
    }
  }

  function validateComprehensionLoopBody(loopBodyPath) {
    loopBodyPath.traverse({
      AwaitExpression(awaitPath) {
        throw awaitPath.buildCodeFrameError(
          "`await` is not allowed within Comprehensions; " +
          "instead, await the Comprehension (eg; `y <- [for x of xs: x]`)."
        );
      },
      YieldExpression(yieldPath) {
        throw yieldPath.buildCodeFrameError("`yield` is not allowed within Comprehensions.");
      },
      ReturnStatement(returnPath) {
        throw returnPath.buildCodeFrameError("`return` is not allowed within Comprehensions.");
      },
    });
  }

  function wrapComprehensionInIife(bodyVarId, bodyVarInitializer, loopBody) {
    const fn = t.arrowFunctionExpression([], t.blockStatement([
      t.variableDeclaration(
        "const",
        [t.variableDeclarator(bodyVarId, bodyVarInitializer)]
      ),
      loopBody,
      t.returnStatement(bodyVarId),
    ]));

    return t.callExpression(fn, []);
  }

  function toBlockStatement(body) {
    if (!t.isBlockStatement(body)) {
      if (!t.isStatement(body)) {
        body = t.expressionStatement(body);
      }
      body = t.blockStatement([body]);
    }
    return body;
  }

  function ensureBlockBody(path) {
    if (!t.isBlockStatement(path.node.body)) {
      path.get("body").replaceWith(t.blockStatement([path.node.body]));
    }
  }

  function toPlainFunction(node) {
    let { id, params, body, generator, async } = node;

    body = toBlockStatement(body);

    const fn = t.isStatement(node)
      ? t.functionDeclaration(id, params, body, generator, async)
      : t.functionExpression(id, params, body, generator, async);

    if (node.returnType) fn.returnType = node.returnType;
    if (node.typeParameters) fn.typeParameters = node.typeParameters;
    return fn;
  }

  function replaceWithPlainFunction(path) {
    path.replaceWith(toPlainFunction(path.node));
  }

  function toArrowFunction(node) {
    let { id, params, body, async } = node;

    if (t.isStatement(node)) {
      let fn = t.arrowFunctionExpression(params, body, async);
      if (node.returnType) fn.returnType = node.returnType;
      if (node.typeParameters) fn.typeParameters = node.typeParameters;
      return t.variableDeclaration("const", [t.variableDeclarator(id, fn)]);
    } else {
      // just throw away the id for now...
      // TODO: think of a way to use it? or outlaw named fat-arrow expressions?
      let fn = t.arrowFunctionExpression(params, body, async);
      if (node.returnType) fn.returnType = node.returnType;
      if (node.typeParameters) fn.typeParameters = node.typeParameters;
      return fn;
    }
  }

  function replaceWithArrowFunction(path) {
    const id = path.get("id");
    path.replaceWith(toArrowFunction(path.node));
    path.scope.registerBinding("const", id);
  }

  function replaceWithBoundFunction(path) {
    const isStatement = t.isStatement(path.node);

    if (isStatement) {
      replaceWithPlainFunction(path);

      const bound = t.callExpression(
        t.memberExpression(path.node.id, t.identifier("bind")),
        [t.thisExpression()]
      );
      const assignToBound = t.expressionStatement(t.assignmentExpression("=",
        path.node.id,
        bound
      ));

      path.insertAfter(assignToBound);
    } else {
      const unbound = toPlainFunction(path.node);
      const bound = t.callExpression(
        t.memberExpression(unbound, t.identifier("bind")),
        [t.thisExpression()]
      );
      path.replaceWith(bound);
    }
  }

  function isNamedArrowFunction(node) {
    return (typeof node.skinny === "boolean");
  }

  // c/p babel-traverse/src/path/family.js getCompletionRecords
  function getTailExpressions(path, allowLoops) {
    let paths = [];

    const add = function add(_path) {
      if (_path) paths = paths.concat(getTailExpressions(_path, allowLoops));
    };

    if (path.isIfStatement()) {
      add(path.get("consequent"));
      add(path.get("alternate"));
    } else if (path.isDoExpression()) {
      add(path.get("body"));
    } else if (allowLoops && (path.isFor() || path.isWhile())) {
      add(path.get("body"));
    } else if (path.isProgram() || path.isBlockStatement()) {
      add(path.get("body").pop());
    } else if (path.isTryStatement()) {
      add(path.get("block"));
      add(path.get("handler"));
      add(path.get("finalizer"));
    } else {
      paths.push(path);
    }

    return paths;
  }

  // c/p from replaceExpressionWithStatements

  function addImplicitReturns(path) {
    transformTails(path, false, (expr) => t.returnStatement(expr));
  }

  function containsSuperCall(path) {
    let hasSuper = false;
    path.traverse({
      Super(superPath) {
        if (superPath.parentPath.isCallExpression()) {
          hasSuper = true;
          superPath.stop();
        }
      }
    });
    return hasSuper;
  }

  function ensureConstructorWithSuper(path, constructorPath) {
    path.resync(); // uhh, just in case?
    let { node } = path;

    // add empty constructor if it wasn't there
    if (!constructorPath) {
      let emptyConstructor = t.classMethod("constructor", t.identifier("constructor"),
        [], t.blockStatement([]));
      emptyConstructor.skinny = true; // mark for super insertion
      path.get("body").unshiftContainer("body", emptyConstructor);
      constructorPath = path.get("body.body.0.body");
    }

    // add super if it wasn't there (unless defined with curly braces)
    if (node.superClass && constructorPath.parentPath.node.skinny && !containsSuperCall(constructorPath)) {
      let superCall;
      if (constructorPath.parentPath.node.params.length) {
        const params = constructorPath.parentPath.node.params;
        superCall = t.expressionStatement(t.callExpression(t.super(), params));
      } else {
        let argsUid = path.scope.generateUidIdentifier("args");
        let params = [t.restElement(argsUid)];
        superCall = t.expressionStatement(t.callExpression(t.super(), [t.spreadElement(argsUid)]));
        constructorPath.parentPath.node.params = params;
      }
      constructorPath.unshiftContainer("body", superCall);
    }

    return constructorPath;
  }

  function bindMethodsInConstructor(path, constructorPath, methodIds) {
    path.resync(); // uhh, just in case?
    let { node } = path;

    // `this.method = this.method.bind(this);`
    let assignments = methodIds.map((methodId) => {
      assertOneOf(methodId, ["Identifier", "Expression"]);

      let isComputed = !t.isIdentifier(methodId);
      let thisDotMethod = t.memberExpression(t.thisExpression(), methodId, isComputed);
      let bind = t.callExpression(
        t.memberExpression(thisDotMethod, t.identifier("bind")),
        [t.thisExpression()]
      );
      return t.expressionStatement(t.assignmentExpression("=", thisDotMethod, bind));
    });

    // directly after each instance of super(), insert the thingies there.
    if (node.superClass) {
      constructorPath.traverse({
        Super(superPath) {
          if (!superPath.parentPath.isCallExpression()) return;
          let superStatementPath = superPath.getStatementParent();

          // things get super weird when you return super();
          // TODO: consider trying to handle it
          let enclosingReturn = superPath
            .findParent((p) => p.isReturnStatement() && p.getFunctionParent() === constructorPath.parentPath);
          if (enclosingReturn) throw new Error("Can't use => with `return super()`; try removing `return`.");

          superStatementPath.insertAfter(assignments);
        }
      });
    } else {
      constructorPath.unshiftContainer("body", assignments);
    }
  }

  function bindMethods(path, methodIds) {
    let assignId, inExpression = false;
    if (path.isClassDeclaration()) {
      assignId = path.node.id;
    } else if (
      path.parentPath.isAssignmentExpression() &&
      path.parentPath.parentPath.isExpressionStatement()
    ) {
      assignId = path.parentPath.node.left;
    } else if (path.parentPath.isVariableDeclarator()) {
      assignId = path.parentPath.node.id;
    } else {
      let id = path.isClass() ? "class" : "obj";
      assignId = path.getStatementParent().scope.generateDeclaredUidIdentifier(id);
      inExpression = true;
    }
    assertOneOf(assignId, ["Identifier", "MemberExpression"]);

    let assignments = methodIds.map((methodId) => {
      // could be computed, eg `['blah']() => {}`
      assertOneOf(methodId, ["Identifier", "Expression"]);
      let isComputed = !t.isIdentifier(methodId);
      let objDotMethod = t.memberExpression(assignId, methodId, isComputed);
      let bind = t.callExpression(
        t.memberExpression(objDotMethod, t.identifier("bind")),
        [assignId]
      );
      return t.assignmentExpression("=", objDotMethod, bind);
    });

    if (inExpression) {
      path.replaceWith(t.sequenceExpression([
        t.assignmentExpression("=", assignId, path.node),
        ...assignments,
        assignId
      ]));
    } else {
      path.getStatementParent().insertAfter(
        assignments.map((a) => t.expressionStatement(a))
      );
    }
  }

  function blockToExpression(path, key) {
    if (t.isBlockStatement(path.node[key])) {
      path.get(key).canSwapBetweenExpressionAndStatement = () => true;
      path.get(key).replaceExpressionWithStatements(path.node[key].body);
    }
  }

  function checkVariableNotShadowed(path) {
    // ignore top-level; same-level will throw a different error.
    if (!path.scope.parent) return;

    for (const id in path.get("declarations.0").getBindingIdentifiers()) {
      if (path.scope.parent.hasBinding(id)) {
        throw path.buildCodeFrameError(
          `\`${id}\` is shadowed from a higher scope. ` +
          `If you want to reassign the variable, use \`now ${id} = ...\`. ` +
          "If you want to declare a new shadowed \`const\` variable, " +
          `you must use \`const ${id} = ...\` explicitly.`
        );
      }
    }
  }

  function shouldParseAsLightScript(file) {
    if (!file || !file.opts || !file.opts.filename) return true;
    const { filename } = file.opts;
    // HACK: for lightscript-eslint, and possibly others
    if (filename === "unknown") return true;

    // TODO: consider "peeking" at the first line for a shebang or 'use lightscript' directive.
    return (
      // HACK: allow parsing .js test files in this repo.
      // TODO: modify `babel-helper-plugin-test-runner` or something instead
      filename.includes("test/fixtures") ||
      filename.includes(".lsc") ||
      filename.includes(".lsx")
    );
  }

  // eg; 'react', 'lodash/fp', './actions'
  type ImportPath = string;

  // eg; "React", "PropTypes"
  type Specifier = string;

  type Imports = {
    [key: ImportPath]: Array<Specifier>,
  };

  type Stdlib = false | {
    [key: Specifier]: ImportPath,
  };

  function initializeStdlib(opts): Stdlib {
    if (opts.stdlib === false) return false;

    if (typeof opts.stdlib === "object") {
      return Object.assign({},
        opts.stdlib.lodash === false ? {} : lodashImports,
        opts.stdlib.lightscript === false ? {} : lightscriptImports,
      );
    }

    return defaultImports;
  }

  function collectStdlibImport(stdlib: Stdlib, imports: Imports, specifier: Specifier) {
    if (!stdlib) return;

    const importPath = stdlib[specifier];

    if (!imports[importPath]) {
      imports[importPath] = [];
    }

    if (imports[importPath].indexOf(specifier) < 0) {
      imports[importPath].push(specifier);
    }
  }

  function makeInlineStdlibFn(inlineFnName) {
    const fnId = t.identifier(inlineFnName);
    const aParam = t.identifier("a");
    const bParam = t.identifier("b");
    const op = {
      "looseEq": "==",
      "looseNotEq": "!=",
      "bitwiseNot": "~",
      "bitwiseAnd": "&",
      "bitwiseOr": "|",
      "bitwiseXor": "^",
      "bitwiseLeftShift": "<<",
      "bitwiseRightShift": ">>",
      "bitwiseZeroFillRightShift": ">>>",
    }[inlineFnName];

    // bitwiseNot is the only unary fn; rest are binary.
    if (inlineFnName === "bitwiseNot") {
      return t.functionDeclaration(fnId, [aParam], t.blockStatement([
        t.returnStatement(t.unaryExpression(op, aParam)),
      ]));
    }

    return t.functionDeclaration(fnId, [aParam, bParam], t.blockStatement([
      t.returnStatement(t.binaryExpression(op, aParam, bParam)),
    ]));
  }

  function insertStdlibImports(path, imports: Imports, useRequire) {
    const declarations = [];
    const inlines = [];
    for (const importPath in imports) {
      if (importPath === "inline") {
        inlines.push(...imports[importPath]);
        continue;
      }

      const specifierNames = imports[importPath];
      const specifiers = [];

      if (useRequire) {
        // eg; `const { map, uniq } = require('lodash');`
        for (const specifierName of specifierNames) {
          const importIdentifier = t.identifier(specifierName);
          specifiers.push(t.objectProperty(importIdentifier, importIdentifier, false, true));
        }
        const requirePattern = t.objectPattern(specifiers);
        const requireCall = t.callExpression(t.identifier("require"), [
          t.stringLiteral(importPath)
        ]);
        const requireStmt = t.variableDeclaration("const", [
          t.variableDeclarator(requirePattern, requireCall),
        ]);
        declarations.push(requireStmt);
      } else {
        // eg; `import { map, uniq } from 'lodash';`
        for (const specifierName of specifierNames) {
          const importIdentifier = t.identifier(specifierName);
          specifiers.push(t.importSpecifier(importIdentifier, importIdentifier));
        }
        const importDeclaration = t.importDeclaration(specifiers, t.stringLiteral(importPath));
        declarations.push(importDeclaration);
      }
    }
    path.unshiftContainer("body", declarations);

    if (inlines.length) {
      const inlineDeclarations = [];
      for (const inlineFnName of inlines) {
        inlineDeclarations.push(makeInlineStdlibFn(inlineFnName));
      }
      // insert inline fns before the first statement which isn't an import statement
      for (const p of path.get("body")) {
        if (!p.isImportDeclaration()) {
          p.insertBefore(inlineDeclarations);
          break;
        }
      }
    }
  }

  function generateForInIterator (path, type: "array" | "object") {
    const idx = path.node.idx || path.scope.generateUidIdentifier("i");
    const len = path.scope.generateUidIdentifier("len");

    const initDeclarations = [
      t.variableDeclarator(idx, t.numericLiteral(0))
    ];

    let refId;
    if (path.get(type).isIdentifier()) {
      refId = path.node[type];
    } else {
      // if the target of iteration is a complex expression,
      // create a reference so it only evaluates once
      const refName = type === "object" ? "obj" : "arr";
      refId = path.scope.generateUidIdentifier(refName);
      initDeclarations.unshift(
        t.variableDeclarator(
          refId,
          path.node[type]
        )
      );
    }

    let keys;
    if (type === "object") {
      keys = path.scope.generateUidIdentifier("keys");
      initDeclarations.push(
        t.variableDeclarator(keys,
          t.callExpression(
            t.memberExpression(
              t.identifier("Object"),
              t.identifier("keys")),
            [refId]
          )
        )
      );
    }

    initDeclarations.push(
      t.variableDeclarator(
        len,
        t.memberExpression(
          type === "object" ? keys : refId,
          t.identifier("length")
        )
      )
    );

    const init = t.variableDeclaration("let", initDeclarations);
    // _i < _len
    const test = t.binaryExpression("<", idx, len);
    // _i++
    const update = t.updateExpression("++", idx);

    ensureBlockBody(path);
    const innerDeclarations = [];
    if (type === "object") {
      const key = path.node.key || path.scope.generateUidIdentifier("k");
      innerDeclarations.push(
        t.variableDeclaration("const", [
          t.variableDeclarator(key, t.memberExpression(keys, idx, true))
        ])
      );

      if (path.node.val) {
        innerDeclarations.push(
          t.variableDeclaration("const", [
            t.variableDeclarator(
              path.node.val,
              t.memberExpression(refId, key, true)
            )
          ])
        );
      }
    } else {
      if (path.node.elem) {
        innerDeclarations.push(
          t.variableDeclaration("const", [
            t.variableDeclarator(
              path.node.elem,
              t.memberExpression(refId, idx, true)
            )
          ])
        );
      }
    }

    if (innerDeclarations.length > 0) {
      path.get("body").unshiftContainer("body", innerDeclarations);
    }

    return t.forStatement(init, test, update, path.node.body);
  }

  // TYPE DEFINITIONS
  definePluginType("ForInArrayStatement", {
    visitor: ["idx", "elem", "array", "body"],
    aliases: ["Scopable", "Statement", "For", "BlockParent", "Loop", "ForXStatement", "ForIn"],
    fields: {
      elem: {
        validate: assertNodeType("Identifier"),
        optional: true,
      },
      idx: {
        validate: assertNodeType("Identifier"),
        optional: true,
      },
      array: {
        validate: assertNodeType("Expression"),
      },
      body: {
        validate: assertNodeType("Statement"),
      },
    },
  });

  definePluginType("ForInObjectStatement", {
    visitor: ["key", "val", "object", "body"],
    aliases: ["Scopable", "Statement", "For", "BlockParent", "Loop", "ForXStatement", "ForIn"],
    fields: {
      key: {
        validate: assertNodeType("Identifier"),
        optional: true,
      },
      val: {
        validate: assertNodeType("Identifier"),
        optional: true,
      },
      object: {
        validate: assertNodeType("Expression"),
      },
      body: {
        validate: assertNodeType("Statement"),
      },
    },
  });

  definePluginType("ArrayComprehension", {
    visitor: ["loop"],
    aliases: ["ArrayExpression", "Expression"],
    fields: {
      loop: {
        validate: assertNodeType("ForStatement"),
      },
    },
  });

  definePluginType("ObjectComprehension", {
    visitor: ["loop"],
    aliases: ["ObjectExpression", "Expression"],
    fields: {
      loop: {
        validate: assertNodeType("ForStatement"),
      },
    },
  });

  definePluginType("TildeCallExpression", {
    visitor: ["left", "right", "arguments"],
    aliases: ["CallExpression", "Expression"],
    fields: {
      left: {
        validate: assertNodeType("Expression"),
      },
      right: {
        validate: assertOneOf("Identifier", "MemberExpression"),
      },
      arguments: {
        validate: chain(
          assertValueType("array"),
          assertEach(assertNodeType("Expression", "SpreadElement"))
        ),
      },
    },
  });

  definePluginType("NamedArrowDeclaration", {
    builder: ["id", "params", "body", "skinny", "async", "generator"],
    visitor: ["id", "params", "body", "returnType", "typeParameters"],
    aliases: [
      "Scopable",
      "Function",
      "BlockParent",
      "FunctionParent",
      "Statement",
      "Pureish",
      "Declaration",
      "FunctionDeclaration",
      "NamedArrowFunction",
    ],
    fields: {  // DUP in NamedArrowMemberExpression
      id: {
        validate: assertNodeType("Identifier"),
      },
      params: {
        validate: chain(
          assertValueType("array"),
          assertEach(assertNodeType("LVal"))
        ),
      },
      body: {
        validate: assertNodeType("BlockStatement", "Expression"),
      },
      skinny: {
        validate: assertValueType("boolean")
      },
      generator: {
        default: false,
        validate: assertValueType("boolean")
      },
      async: {
        default: false,
        validate: assertValueType("boolean")
      },
    },
  });

  definePluginType("NamedArrowExpression", {
    inherits: "NamedArrowDeclaration",
    aliases: [
      "Scopable",
      "Function",
      "FunctionExpression",
      "BlockParent",
      "FunctionParent",
      "Expression",
      "Pureish",
      "NamedArrowFunction",
    ],
  });

  definePluginType("NamedArrowMemberExpression", {
    inherits: "NamedArrowExpression",
    fields: {  // c/p from NamedArrowExpression except for `object`
      id: {
        validate: assertNodeType("Identifier"),
      },
      object: {
        validate: assertNodeType("Identifier", "MemberExpression"),
      },
      params: {
        validate: chain(
          assertValueType("array"),
          assertEach(assertNodeType("LVal"))
        ),
      },
      body: {
        validate: assertNodeType("BlockStatement", "Expression"),
      },
      skinny: {
        validate: assertValueType("boolean")
      },
      generator: {
        default: false,
        validate: assertValueType("boolean")
      },
      async: {
        default: false,
        validate: assertValueType("boolean")
      },
    },
  });

  definePluginType("IfExpression", {
    visitor: ["test", "consequent", "alternate"],
    aliases: ["Expression", "Conditional"],
    fields: {
      test: {
        validate: assertNodeType("Expression")
      },
      consequent: {
        validate: assertNodeType("Expression", "BlockStatement")
      },
      alternate: {
        optional: true,
        validate: assertNodeType("Expression", "BlockStatement")
      }
    }
  });

  definePluginType("SafeAwaitExpression", {
    builder: ["argument"],
    visitor: ["argument"],
    aliases: ["AwaitExpression", "Expression", "Terminatorless"],
    fields: {
      argument: {
        validate: assertNodeType("Expression"),
      }
    }
  });

  definePluginType("SafeMemberExpression", {
    inherits: "MemberExpression",
    aliases: ["MemberExpression", "Expression", "LVal"],
  });

  // traverse as top-level item so as to run before other babel plugins
  // (and avoid traversing any of their output)
  function Program(path, state) {
    if (!shouldParseAsLightScript(state.file)) return;

    const stdlib: Stdlib = initializeStdlib(state.opts);
    const useRequire = state.opts.stdlib && state.opts.stdlib.require === true;
    const imports: Imports = {};

    path.traverse({

      ForInArrayStatement(path) {
        path.replaceWith(generateForInIterator(path, "array"));
      },

      ForInObjectStatement(path) {
        path.replaceWith(generateForInIterator(path, "object"));
      },

      ArrayComprehension(path) {
        validateComprehensionLoopBody(path.get("loop.body"));

        const id = path.scope.generateUidIdentifier("arr");
        transformTails(path.get("loop"), true, (expr) =>
          t.callExpression(
            t.memberExpression(id, t.identifier("push")),
            [expr]
          )
        );

        path.replaceWith(wrapComprehensionInIife(id, t.arrayExpression(), path.node.loop));
      },

      ObjectComprehension(path) {
        validateComprehensionLoopBody(path.get("loop.body"));

        const id = path.scope.generateUidIdentifier("obj");
        transformTails(path.get("loop"), true, function(seqExpr, tailPath) {
          // Only SeqExprs of length 2 are valid.
          if (
            (seqExpr.type !== "SequenceExpression") ||
            (seqExpr.expressions.length !== 2)
          ) {
            throw tailPath.buildCodeFrameError("Object comprehensions must end" +
            " with a (key, value) pair.");
          }

          const keyExpr = seqExpr.expressions[0];
          const valExpr = seqExpr.expressions[1];

          return t.assignmentExpression(
            "=",
            t.memberExpression(id, keyExpr, true),
            valExpr
          );
        });

        path.replaceWith(wrapComprehensionInIife(id, t.objectExpression([]), path.node.loop));
      },

      TildeCallExpression: {
        // run on exit instead of enter so that SafeMemberExpression
        // can process differently from a wrapping CallExpression
        // eg; `a?.b~c()` -> `a == null ? null : c(a.b)`
        exit(path) {
          const callExpr = t.callExpression(path.node.right, [
            path.node.left,
            ...path.node.arguments,
          ]);
          path.replaceWith(callExpr);
        },
      },

      NamedArrowFunction(path) {
        if (path.node.skinny) {
          replaceWithPlainFunction(path);
        } else if (path.node.generator) {
          // there are no arrow-generators in ES6, so can't compile to arrow
          replaceWithBoundFunction(path);
        } else {
          replaceWithArrowFunction(path);
        }
      },

      NamedArrowMemberExpression(path) {
        let object = path.node.object;
        let node = path.node;
        delete node.object;
        node.type = "NamedArrowExpression";

        if (!node.skinny) {
          node.skinny = true;  // binding here, don't turn into arrow
          node = t.callExpression(
            t.memberExpression(node, t.identifier("bind")),
            [object]
          );
        }

        path.replaceWith(t.assignmentExpression("=",
          t.memberExpression(object, path.node.id),
          node,
        ));
      },

      ArrowFunctionExpression(path) {
        if (path.node.skinny) {
          replaceWithPlainFunction(path);
        } else if (path.node.generator) {
          replaceWithBoundFunction(path);
        }
      },

      Method(path) {
        if (isNamedArrowFunction(path.node)) {
          path.node.body = toBlockStatement(path.node.body);
        }
      },

      ClassBody(path) {
        let fatArrows = [], fatStaticArrows = [], constructorPath;
        path.node.body.forEach((method, i) => {
          if (!t.isMethod(method)) return;

          if (method.kind === "constructor") {
            constructorPath = path.get(`body.${i}.body`);
          } else if (method.static && method.skinny === false) {
            fatStaticArrows.push(method.key);
            method.skinny = true; // prevent infinite recursion
          } else if (method.skinny === false) {
            fatArrows.push(method.key);
            method.skinny = true; // prevent infinite recursion
          }
        });

        let maybeAddSuper = path.parentPath.node.superClass && constructorPath;
        if (fatArrows.length || maybeAddSuper) {
          constructorPath = ensureConstructorWithSuper(path.parentPath, constructorPath);
        }

        if (fatArrows.length) {
          bindMethodsInConstructor(path.parentPath, constructorPath, fatArrows);
        }

        if (fatStaticArrows.length) {
          bindMethods(path.parentPath, fatStaticArrows);
        }
      },

      ObjectExpression(path) {
        let fatArrows = [];
        path.node.properties.forEach((prop) => {
          if (t.isMethod(prop) && prop.skinny === false) {
            fatArrows.push(prop.key);
            // bit ugly, but need a way to ensure we don't double-recurse...
            prop.skinny = true;
          }
        });

        if (fatArrows.length) {
          bindMethods(path, fatArrows);
        }
      },

      Function: {
        exit(path) {
          if (path.node.kind === "constructor" || path.node.kind === "set") return;

          const isVoid = path.node.returnType &&
            t.isVoidTypeAnnotation(path.node.returnType.typeAnnotation);

          if (!isVoid) {
            addImplicitReturns(path);
          }

          // As this is an exit visitor, other LSC transforms have reduced
          // arrows to plain FunctionDeclarations by this point.
          if (path.node.type === "FunctionDeclaration") {
            // somehow this wasn't being done... may signal deeper issues...
            path.getFunctionParent().scope.registerDeclaration(path);
          }
        }
      },

      IfExpression(path) {
        blockToExpression(path, "consequent");

        if (path.node.alternate) {
          blockToExpression(path, "alternate");
        } else {
          path.get("alternate").replaceWith(t.nullLiteral());
        }

        path.replaceWith(t.conditionalExpression(path.node.test, path.node.consequent, path.node.alternate));
      },

      AssignmentExpression(path) {
        if (path.node.operator === "<-" || path.node.operator === "<!-") {
          path.node.operator = "=";
        }

        // TODO: consider enforcing `now` for MemberExpression too
        if (t.isMemberExpression(path.node.left)) return;

        if (path.node.isNowAssign === false) {
          throw path.buildCodeFrameError(
            "Incorrect assignment: to reassign, use `now`; to assign as `const`, put on its own line."
          );
        }
      },

      SafeAwaitExpression(path) {
        const errId = path.scope.generateUidIdentifier("err");

        const tryCatch = t.tryStatement(
          t.blockStatement([
            t.returnStatement(t.awaitExpression(path.node.argument))
          ]),
          t.catchClause(errId, t.blockStatement([
            t.returnStatement(errId)
          ])),
        );
        const fn = t.arrowFunctionExpression([], t.blockStatement([tryCatch]), true);
        // TODO: returntype annotation
        const iife = t.callExpression(fn, []);
        const awaitExpr = t.awaitExpression(iife);
        path.replaceWith(awaitExpr);
      },

      SafeMemberExpression(path) {
        // x?.y -> x == null ? x : x.y
        // x?[y] -> x == null ? x : x[y]
        const { node } = path;
        const { object } = node;

        let left;
        if (object.type === "Identifier" || object.type === "SafeMemberExpression") {
          left = object;
        } else {
          const ref = path.scope.generateDeclaredUidIdentifier("ref");
          node.object = ref;
          left = t.assignmentExpression("=", ref, object);
        }

        const nullCheck = t.binaryExpression("==", left, t.nullLiteral());
        node.type = "MemberExpression";
        path.replaceWith(node);

        // Gather trailing subscripts/calls, which are parent nodes:
        // eg; in `o?.x.y()`, group trailing `.x.y()` into the ternary
        let tail = path;
        while (tail.parentPath) {
          const parent = tail.parentPath;
          const hasChainedParent = (
            parent.isMemberExpression() ||
            (parent.isCallExpression() && parent.get("callee") === tail) ||
            (parent.node.type === "TildeCallExpression" && parent.get("left") === tail)
          );

          if (hasChainedParent) {
            tail = tail.parentPath;
          } else {
            break;
          }
        }

        const ternary = t.conditionalExpression(nullCheck, t.nullLiteral(), tail.node);
        tail.replaceWith(ternary);
      },

      AwaitExpression(path) {
        if (path.get("argument").isArrayExpression() || path.node.argument.type === "ArrayComprehension") {
          const promiseDotAllCall = t.callExpression(
            t.memberExpression(t.identifier("Promise"), t.identifier("all")),
            [path.node.argument],
          );
          path.get("argument").replaceWith(promiseDotAllCall);
        }
      },

      VariableDeclaration(path) {
        // Error on auto-const when shadowing variable
        if (path.node.kind === "const") {
          if (path.node.extra && path.node.extra.implicit === true) {
            checkVariableNotShadowed(path);
          }
        }
      },

      // collect functions to be imported for the stdlib
      ReferencedIdentifier(path) {
        if (stdlib === false) return;

        const { node, scope } = path;
        if (stdlib[node.name] && !scope.hasBinding(node.name)) {
          collectStdlibImport(stdlib, imports, node.name);
        }
      },


    });

    insertStdlibImports(path, imports, useRequire);
  }

  return {
    manipulateOptions(opts, parserOpts, file) {
      if (!shouldParseAsLightScript(file)) return;

      opts.parserOpts = opts.parserOpts || {};
      opts.parserOpts.parser = parse;
      parserOpts.plugins.unshift("lightscript");
      // TODO: allow configuration options to disable these, as they slow down parsing
      parserOpts.plugins.push("jsx", "flow");
    },

    visitor: {
      Program,
    },

  };
}
