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

  // Source mapping tools
  function locateAt(newNode, sourceNode) {
    if (sourceNode) {
      newNode.loc = sourceNode.loc;
      newNode.start = sourceNode.start;
      newNode.end = sourceNode.end;
    }
    return newNode;
  }

  function locateBefore(newNode, sourceNode) {
    if (sourceNode) {
      newNode.loc = Object.assign({}, sourceNode.loc);
      newNode.loc.end = newNode.loc.start;
      newNode.start = sourceNode.start;
      newNode.end = sourceNode.start;
    }
    return newNode;
  }

  function locateAfter(newNode, sourceNode) {
    if (sourceNode) {
      newNode.loc = Object.assign({}, sourceNode.loc);
      newNode.loc.start = newNode.loc.end;
      newNode.start = sourceNode.end;
      newNode.end = sourceNode.end;
    }
    return newNode;
  }

  function nodeAt(sourceNode, type, ...args) {
    const newNode = t[type](...args);
    return locateAt(newNode, sourceNode);
  }

  function nodeBefore(sourceNode, type, ...args) {
    const newNode = t[type](...args);
    return locateBefore(newNode, sourceNode);
  }

  function nodeAfter(sourceNode, type, ...args) {
    const newNode = t[type](...args);
    return locateAfter(newNode, sourceNode);
  }

  function cloneAt(sourceNode, node) {
    if (!node) return node; // undef/null
    const newNode = t.clone(node);
    return locateAt(newNode, sourceNode);
  }

  function cloneBefore(sourceNode, node) {
    if (!node) return node; // undef/null
    const newNode = t.clone(node);
    return locateBefore(newNode, sourceNode);
  }

  function cloneAfter(sourceNode, node) {
    if (!node) return node; // undef/null
    const newNode = t.clone(node);
    return locateAfter(newNode, sourceNode);
  }

  // Traverse node structures that are not yet attached to the AST body
  // Algorithm from babel-types/src/index.js#286
  function traverseNodes(rootNode, visitor) {
    visitor(rootNode);
    for (const key in rootNode) {
      if (key[0] === "_") continue;
      let val = rootNode[key];
      if (val) {
        if (val.type) {
          traverseNodes(val, visitor);
        } else if (Array.isArray(val)) {
          val.forEach( (x) => traverseNodes(x, visitor) );
        }
      }
    }
  }

  function isFunctionDeclaration(node) {
    return node && (t.is("FunctionDeclaration", node) || node.type === "NamedArrowDeclaration");
  }

  function transformTails(path, allowLoops, getNewNode) {
    path.resync();

    const tailPaths = getTailExpressions(path.get("body"), allowLoops);
    for (const tailPath of tailPaths) {
      if (!tailPath) continue;

      if (tailPath.isExpressionStatement()) {
        // TODO: add linting to discourage
        if (tailPath.get("expression").isAssignmentExpression()) {
          tailPath.insertAfter(getNewNode(tailPath.node.expression.left, tailPath));
        } else {
          tailPath.replaceWith(getNewNode(tailPath.node.expression, tailPath));
        }
      } else if (tailPath.isVariableDeclaration()) {
        // TODO: handle declarations.length > 1
        // TODO: add linting to discourage
        tailPath.insertAfter(getNewNode(tailPath.node.declarations[0].id, tailPath));
      } else if (isFunctionDeclaration(tailPath.node)) {
        // Need to transform exprs to statements since this is block context.
        const nextNode = getNewNode(tailPath.node.id, tailPath);
        if (t.isExpression(nextNode)) {
          tailPath.insertAfter(
            nodeAt(nextNode, "expressionStatement", nextNode)
          );
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
    const nb = (...args) => nodeBefore(loopBody, ...args);
    const n = (...args) => nodeAt(loopBody, ...args);
    const na = (...args) => nodeAfter(loopBody, ...args);

    const fn = n("arrowFunctionExpression",
      [],
      n("blockStatement", [
        nb("variableDeclaration",
          "const",
          [nb("variableDeclarator", bodyVarId, bodyVarInitializer)]
        ),
        loopBody,
        na("returnStatement", bodyVarId)
      ])
    );

    return nodeAt(loopBody, "callExpression", fn, []);
  }

  function toBlockStatement(body) {
    if (!t.isBlockStatement(body)) {
      if (!t.isStatement(body)) {
        body = nodeAt(body, "expressionStatement", body);
      }
      body = nodeAt(body, "blockStatement", [body]);
    }
    return body;
  }

  function ensureBlockBody(path) {
    const body = path.node.body;
    if (!t.isBlockStatement(body)) {
      path.get("body").replaceWith(nodeAt(body, "blockStatement", [body]));
    }
  }

  function toPlainFunction(node) {
    let { id, params, body, generator, async } = node;
    const n = (...args) => nodeAt(node, ...args);

    body = toBlockStatement(body);

    const fn = t.isStatement(node)
      ? n("functionDeclaration", id, params, body, generator, async)
      : n("functionExpression", id, params, body, generator, async);

    if (node.returnType) fn.returnType = node.returnType;
    if (node.typeParameters) fn.typeParameters = node.typeParameters;
    return fn;
  }

  function replaceWithPlainFunction(path) {
    path.replaceWith(toPlainFunction(path.node));
  }

  function toArrowFunction(node) {
    let { id, params, body, async } = node;
    const n = (...args) => nodeAt(node, ...args);

    if (t.isStatement(node)) {
      let fn = n("arrowFunctionExpression", params, body, async);
      if (node.returnType) fn.returnType = node.returnType;
      if (node.typeParameters) fn.typeParameters = node.typeParameters;
      return n("variableDeclaration", "const", [n("variableDeclarator", id, fn)]);
    } else {
      // just throw away the id for now...
      // TODO: think of a way to use it? or outlaw named fat-arrow expressions?
      let fn = n("arrowFunctionExpression", params, body, async);
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
    const node = path.node;
    const isStatement = t.isStatement(node);
    const n = (...args) => nodeAt(node, ...args);
    const na = (...args) => nodeAfter(node, ...args);

    if (isStatement) {
      replaceWithPlainFunction(path);

      const bound = na("callExpression",
        na("memberExpression", path.node.id, na("identifier", "bind")),
        [na("thisExpression")]
      );
      const assignToBound = na("expressionStatement", na("assignmentExpression", "=",
        path.node.id,
        bound
      ));

      path.insertAfter(assignToBound);
    } else {
      const unbound = toPlainFunction(path.node);
      const bound = n("callExpression",
        n("memberExpression", unbound, na("identifier", "bind")),
        [na("thisExpression")]
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

  function addImplicitReturns(path) {
    transformTails(path, false, (expr, tailPath) => {
      return nodeBefore(tailPath.node, "returnStatement", expr);
    });
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

  function ensureConstructorWithSuper(classDeclarationPath, constructorPath) {
    classDeclarationPath.resync(); // uhh, just in case?
    let { node } = classDeclarationPath;

    const classBodyPath = classDeclarationPath.get("body");
    const classBodyNode = classBodyPath.node;

    // add empty constructor if it wasn't there
    if (!constructorPath) {
      // constructor goes before class body in sourcemap
      const n = (...args) => nodeBefore(classBodyNode, ...args);
      let emptyConstructor = n(
        "classMethod", "constructor",
        n("identifier", "constructor"),
        [],
        n("blockStatement", [])
      );
      emptyConstructor.skinny = true; // mark for super insertion
      classBodyPath.unshiftContainer("body", emptyConstructor);
      constructorPath = classBodyPath.get("body.0.body");
    }

    // add super if it wasn't there (unless defined with curly braces)
    if (node.superClass && constructorPath.parentPath.node.skinny && !containsSuperCall(constructorPath)) {
      // All this stuff is going to be at the beginning of the constructor...
      const constructorNode = constructorPath.node;
      const n = (...args) => nodeBefore(constructorNode, ...args);

      let superCall;
      if (constructorPath.parentPath.node.params.length) {
        const params = constructorPath.parentPath.node.params;
        superCall = n("expressionStatement", n("callExpression", n("super"), params));
      } else {
        let argsUid = locateBefore(classDeclarationPath.scope.generateUidIdentifier("args"), constructorNode);
        let params = [n("restElement", argsUid)];
        superCall = n("expressionStatement",
          n("callExpression", n("super"), [n("spreadElement", argsUid)])
        );
        constructorPath.parentPath.node.params = params;
      }
      constructorPath.unshiftContainer("body", superCall);
    }

    return constructorPath;
  }

  // XXX: source mapping issues.
  function bindMethodsInConstructor(classDeclarationPath, constructorPath, methodIds) {
    classDeclarationPath.resync(); // uhh, just in case?
    let { node } = classDeclarationPath;

    // XXX: Source mapping: we have to make different nodes for each insertion
    // we do because they will appear in different source positions.
    const emplacedAssignments = (n) => {
      return methodIds.map((methodId) => {
        assertOneOf(methodId, ["Identifier", "Expression"]);

        let isComputed = !t.isIdentifier(methodId);
        let thisDotMethod = n("memberExpression", n("thisExpression"), methodId, isComputed);
        let bind = n("callExpression",
          n("memberExpression", thisDotMethod, n("identifier", "bind")),
          [n("thisExpression")]
        );
        return n("expressionStatement", n("assignmentExpression", "=", thisDotMethod, bind));
      });
    };

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

          // `this.method = this.method.bind(this);`
          const targetNode = superStatementPath.node;
          const n = (...args) => nodeAfter(targetNode, ...args);
          superStatementPath.insertAfter(emplacedAssignments(n));
        }
      });
    } else {
      const targetNode = constructorPath.node; // XXX: is this right?
      const n = (...args) => nodeBefore(targetNode, ...args);
      constructorPath.unshiftContainer("body", emplacedAssignments(n));
    }
  }

  // XXX: source mapping issues
  function bindMethods(path, methodIds) {
    let assignId, inExpression = false;
    let parentNode = path.getStatementParent().node;

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
      parentNode = path.node;
      assignId = path.getStatementParent().scope.generateDeclaredUidIdentifier(id);
      // source maps: this var points at the object in the code, so locate
      // it there.
      locateAt(assignId, parentNode);
      inExpression = true;
    }
    assertOneOf(assignId, ["Identifier", "MemberExpression"]);

    // XXX: source mapping. if in expression, this will be replacedWith,
    // otherwise, insertedAfter.
    let n;
    if (inExpression) {
      n = (...args) => nodeAt(parentNode, ...args);
    } else {
      n = (...args) => nodeAfter(parentNode, ...args);
    }

    let assignments = methodIds.map((methodId) => {
      // could be computed, eg `['blah']() => {}`
      assertOneOf(methodId, ["Identifier", "Expression"]);
      let isComputed = !t.isIdentifier(methodId);
      let objDotMethod = n("memberExpression", assignId, methodId, isComputed);
      let bind = n("callExpression",
        n("memberExpression", objDotMethod, n("identifier", "bind")),
        [assignId]
      );
      return n("assignmentExpression", "=", objDotMethod, bind);
    });

    if (inExpression) {
      // XXX: sourcemap: this could be wrong. we have to pick one expression
      // (the first one, maybe) to emplace at the node, then the rest
      // should be emplaced before/after
      path.replaceWith(n("sequenceExpression", [
        n("assignmentExpression", "=", assignId, path.node),
        ...assignments,
        assignId
      ]));
    } else {
      // XXX: sourcemap: this one is ok I think, since n = parent.nodeAfter and they
      // are all being insertedAfter.
      path.getStatementParent().insertAfter(
        assignments.map((a) => n("expressionStatement", a))
      );
    }
  }

  function blockToExpression(path, key) {
    if (t.isBlockStatement(path.node[key])) {
      // Grab the original node, with good sourcemap data, before babel
      // clobbers it...
      const parentNode = path.node[key];
      path.get(key).canSwapBetweenExpressionAndStatement = () => true;
      path.get(key).replaceExpressionWithStatements(path.node[key].body);
      // XXX: this is definitely imperfect, but the only alternative would seem to be
      // copying/rewriting replaceExpressionWithStatements...
      // any errors coming from the nodes the user wrote should map fine, but
      // any errors coming from the gunk that babel generates here will just
      // appear as though they are coming from inside the entirety of the
      // corresponding if/elif block...
      traverseNodes(path.node[key], (node) => {
        if (!node.loc) locateAt(node, parentNode);
      });
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

  function insertStdlibImports(path, imports: Imports, useRequire) {
    const node = path.node;
    const n = (...args) => nodeBefore(node, ...args);

    const declarations = [];
    for (const importPath in imports) {
      const specifierNames = imports[importPath];
      const specifiers = [];

      if (useRequire) {
        // eg; `const { map, uniq } = require('lodash');`
        for (const specifierName of specifierNames) {
          const importIdentifier = n("identifier", specifierName);
          specifiers.push(n("objectProperty", importIdentifier, importIdentifier, false, true));
        }
        const requirePattern = n("objectPattern", specifiers);
        const requireCall = n("callExpression", n("identifier", "require"), [
          n("stringLiteral", importPath)
        ]);
        const requireStmt = n("variableDeclaration", "const", [
          n("variableDeclarator", requirePattern, requireCall),
        ]);
        declarations.push(requireStmt);
      } else {
        // eg; `import { map, uniq } from 'lodash';`
        for (const specifierName of specifierNames) {
          const importIdentifier = n("identifier", specifierName);
          specifiers.push(n("importSpecifier", importIdentifier, importIdentifier));
        }
        const importDeclaration = n("importDeclaration", specifiers, n("stringLiteral", importPath));
        declarations.push(importDeclaration);
      }
    }
    path.unshiftContainer("body", declarations);
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
        // Source mapping: nb is for generated code outside the loop, n is for
        // nodes that enclose the loop, nbb is for generated code inside the loop
        // at the top of the body.
        const node = path.node;
        const nb = (...args) => nodeBefore(node, ...args);
        const n = (...args) => nodeAt(node, ...args);

        ensureBlockBody(path);
        const bodyNode = path.get("body").node;
        const nbb = (...args) => nodeBefore(bodyNode, ...args);

        // If array is a complex expression, generate: const _arr = expr
        let refId;
        if (!path.get("array").isIdentifier()) {
          refId = locateBefore(path.scope.generateUidIdentifier("arr"), node);
          path.insertBefore(
            nb("variableDeclaration", "const", [ nb("variableDeclarator", refId, path.node.array )])
          );
        } else {
          refId = path.node.array;
        }

        // let _i = 0, _len = array.length
        let idx = path.node.idx || locateBefore(path.scope.generateUidIdentifier("i"), node);
        let len = locateBefore(path.scope.generateUidIdentifier("len"), node);
        let declarations = [
          nb("variableDeclarator", idx, nb("numericLiteral", 0)),
          nb("variableDeclarator",
            len,
            nb("memberExpression", refId, nb("identifier", "length"))
          )
        ];
        let init = nb("variableDeclaration", "let", declarations);
        // _i < _len
        let test = nb("binaryExpression", "<", idx, len);
        // _i++
        let update = nb("updateExpression", "++", idx);

        // Element initializer: const elem = _array[_i]
        let assignElemStmt = null;
        if (path.node.elem) {
          // TODO: note that destructuring takes place here for when we add that to the parser.
          // can probably just pass the destructuring thing to the LHS of the declarator.
          assignElemStmt = nbb("variableDeclaration", "const", [
            nbb("variableDeclarator", path.node.elem, nbb("memberExpression", refId, idx, true))
          ]);
        }

        ensureBlockBody(path);
        if (assignElemStmt) path.get("body").unshiftContainer("body", assignElemStmt);

        let forNode = n("forStatement", init, test, update, path.node.body);
        path.replaceWith(forNode);
      },

      ForInObjectStatement(path) {
        // Source mapping: nb is for generated code outside the loop, n is for
        // nodes that enclose the loop, nbb is for generated code inside the loop
        // at the top of the body.
        const node = path.node;
        const nb = (...args) => nodeBefore(node, ...args);
        const n = (...args) => nodeAt(node, ...args);

        ensureBlockBody(path);
        const bodyNode = path.get("body").node;
        const nbb = (...args) => nodeBefore(bodyNode, ...args);

        // If object is a complex expression, generate: const _obj = expr
        let refId;
        if (!path.get("object").isIdentifier()) {
          refId = locateBefore(path.scope.generateUidIdentifier("obj"), node);
          path.insertBefore(
            nb("variableDeclaration", "const", [ nb("variableDeclarator", refId, path.node.object )])
          );
        } else {
          refId = path.node.object;
        }

        // Loop initializer: const _k
        let key = path.node.key || locateBefore(path.scope.generateUidIdentifier("k"), node);
        let init = nb("variableDeclaration", "const", [ nb("variableDeclarator", key, null) ]);

        // if(!_obj.hasOwnProperty(_k)) continue
        const hasOwnPropertyStmt = nbb("ifStatement",
          nbb("unaryExpression",
            "!",
            nbb("callExpression",
              nbb("memberExpression", refId, nbb("identifier", "hasOwnProperty")),
              [ key ]
            )
          ),
          nbb("continueStatement")
        );

        // Element initializer: const val = _obj[_k]
        let assignValStmt = null;
        if (path.node.val) {
          // TODO: note that destructuring takes place here for when we add that to the parser.
          // can probably just pass the destructuring thing to the LHS of the declarator.
          assignValStmt = nbb("variableDeclaration", "const", [
            nbb("variableDeclarator", path.node.val, nbb("memberExpression", refId, key, true))
          ]);
        }

        // Add hasOwnProperty, followed by element initializer, to loop body
        if (assignValStmt) path.get("body").unshiftContainer("body", assignValStmt);
        path.get("body").unshiftContainer("body", hasOwnPropertyStmt);

        let forNode = n("forInStatement", init, refId, path.node.body);
        path.replaceWith(forNode);
      },

      ArrayComprehension(path) {
        validateComprehensionLoopBody(path.get("loop.body"));

        const id = locateBefore(path.scope.generateUidIdentifier("arr"), path.node);

        transformTails(path.get("loop"), true, (expr, tailPath) => {
          const node = tailPath.node;
          const n = (...args) => nodeAt(node, ...args);
          const nb = (...args) => nodeBefore(node, ...args);

          return n("callExpression",
            nb("memberExpression", id, nb("identifier", "push")),
            [expr]
          );
        });

        path.replaceWith(
          wrapComprehensionInIife(
            id,
            nodeBefore(path.node, "arrayExpression"),
            path.node.loop
          )
        );
      },

      ObjectComprehension(path) {
        validateComprehensionLoopBody(path.get("loop.body"));

        const id = locateBefore(path.scope.generateUidIdentifier("obj"), path.node);

        transformTails(path.get("loop"), true, function(seqExpr, tailPath) {
          // Only SeqExprs of length 2 are valid.
          if (
            (seqExpr.type !== "SequenceExpression") ||
            (seqExpr.expressions.length !== 2)
          ) {
            throw tailPath.buildCodeFrameError("Object comprehensions must end" +
            " with a (key, value) pair.");
          }

          const node = tailPath.node;
          const n = (...args) => nodeAt(node, ...args);

          const keyExpr = seqExpr.expressions[0];
          const valExpr = seqExpr.expressions[1];

          return n("assignmentExpression",
            "=",
            n("memberExpression", id, keyExpr, true),
            valExpr
          );
        });

        path.replaceWith(
          wrapComprehensionInIife(
            id,
            nodeBefore(path.node, "objectExpression", []),
            path.node.loop
          )
        );
      },

      TildeCallExpression: {
        // run on exit instead of enter so that SafeMemberExpression
        // can process differently from a wrapping CallExpression
        // eg; `a?.b~c()` -> `a == null ? null : c(a.b)`
        exit(path) {
          // XXX: this might be breaking source maps because it makes impossible
          // ordering, right appears after left in original source but before
          // in transpiled source...
          const callExpr = nodeAt(path.node, "callExpression",
            path.node.right,
            [path.node.left, ...path.node.arguments]
          );
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
        // XXX: direct node mutation, perhaps clone first?
        let node = path.node;
        const n = (...args) => nodeAt(node, ...args);
        delete node.object;
        node.type = "NamedArrowExpression";

        if (!node.skinny) {
          node.skinny = true;  // binding here, don't turn into arrow
          node = n("callExpression",
            n("memberExpression", node, n("identifier", "bind")),
            [object]
          );
        }

        path.replaceWith(n("assignmentExpression", "=",
          n("memberExpression", object, path.node.id),
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

          // somehow this wasn't being done... may signal deeper issues...
          path.getFunctionParent().scope.registerDeclaration(path);
        }
      },

      IfExpression(path) {
        blockToExpression(path, "consequent");

        if (path.node.alternate) {
          blockToExpression(path, "alternate");
        } else {
          // source map: implicit null else goes after the consequent
          path.get("alternate").replaceWith(locateAfter(t.nullLiteral(), path.node.consequent));
        }

        path.replaceWith(nodeAt(
          path.node, "conditionalExpression",
          path.node.test, path.node.consequent, path.node.alternate
        ));
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
        const node = path.node;
        const n = (...args) => nodeAt(node, ...args);
        const nb = (...args) => nodeBefore(node, ...args);
        const na = (...args) => nodeAfter(node, ...args);

        // source map: place err declaration before
        const errId = locateBefore(path.scope.generateUidIdentifier("err"), node);

        const tryCatch = n("tryStatement",
          n("blockStatement", [
            nb("returnStatement", n("awaitExpression", path.node.argument))
          ]),
          na("catchClause", errId, na("blockStatement", [
            na("returnStatement", errId)
          ])),
        );
        const fn = n("arrowFunctionExpression", [], n("blockStatement", [tryCatch]), true);
        // TODO: returntype annotation
        const iife = n("callExpression", fn, []);
        const awaitExpr = n("awaitExpression", iife);
        path.replaceWith(awaitExpr);
      },

      // XXX: source mapping issues here.
      SafeMemberExpression(path) {
        // x?.y -> x == null ? x : x.y
        // x?[y] -> x == null ? x : x[y]
        const { node } = path;
        const { object } = node;

        // Convert to ordinary member expression
        node.type = "MemberExpression";
        path.replaceWith(node);

        // Generate null check
        // XXX: sourcemap - treating this all as implicit code that comes before
        // the member expr. possibly wrong, if the null check crashes maybe that
        // should point at the node.object?
        const nb = (...args) => nodeBefore(node, ...args);
        let left;
        if (object.type === "Identifier" || object.type === "SafeMemberExpression") {
          left = object;
        } else {
          const ref = locateBefore(path.scope.generateDeclaredUidIdentifier("ref"), node);
          node.object = ref;
          left = nb("assignmentExpression", "=", ref, object);
        }
        const nullCheck = nb("binaryExpression", "==", left, nb("nullLiteral"));

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

        // XXX: source map - treating this as all coming from the tail node.
        // again possibly wrong, difficult to see the possibilities
        const ternary = nodeAt(tail.node, "conditionalExpression",
          nullCheck,
          nodeBefore(tail.node, "nullLiteral"),
          tail.node
        );
        tail.replaceWith(ternary);
      },

      AwaitExpression(path) {
        if (path.get("argument").isArrayExpression() || path.node.argument.type === "ArrayComprehension") {
          const node = path.node;
          const nb = (...args) => nodeBefore(node, ...args);

          const promiseDotAllCall = nodeAt(path.node, "callExpression",
            nb("memberExpression", nb("identifier", "Promise"), nb("identifier", "all")),
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
