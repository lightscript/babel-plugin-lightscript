import { parse } from "babylon-lightscript";


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

  function transformTerminalExpressionsIntoArrPush(path, arrId) {
    path.resync(); // not sure if this is necessary... c/p from addImplicitReturns

    let completionRecords = path.get("body").getCompletionRecords();
    for (let targetPath of completionRecords) {
      if (!targetPath.isExpressionStatement()) continue;

      let arrPush = t.callExpression(
        t.memberExpression(arrId, t.identifier("push")),
        [targetPath.node.expression]
      );
      targetPath.replaceWith(arrPush);
    }
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

  // c/p from replaceExpressionWithStatements

  function addImplicitReturns(path) {
    path.resync();

    let retUid, completionRecords = path.get("body").getCompletionRecords();
    for (let targetPath of completionRecords) {
      if (!targetPath.isExpressionStatement()) continue;

      // TODO: fix loop detection, don't impliclitly return if terminal value is in loop
      let loop = targetPath.findParent((p) => p.isLoop());
      if (loop) {
        if (!retUid) {
          retUid = path.scope.generateDeclaredUidIdentifier("ret");
          path.get("body").pushContainer("body", t.returnStatement(retUid));
        }

        targetPath.get("expression").replaceWith(
          t.assignmentExpression("=", retUid, targetPath.node.expression)
        );
      } else {
        if (targetPath.get("expression").isAssignmentExpression()) {
          if (!targetPath.get("expression.left").isMemberExpression()) {
            // TODO: replace with linter error
            return;
          }
        }

        targetPath.replaceWith(t.returnStatement(targetPath.node.expression));
      }
    }
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
        superCall = t.expressionStatement(t.callExpression(t.super(), [t.identifier("arguments")]));
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
    const { filename } = file.opts;
    if (!filename) return true;
    // TODO: consider "peeking" at the first line for a shebang or 'use lightscript' directive.
    return (
      // HACK: allow parsing .js test files in this repo.
      // TODO: modify `babel-helper-plugin-test-runner` or something instead
      filename.includes("babel-plugin-lightscript/test/fixtures") ||
      filename.includes(".lsc") ||
      filename.includes(".lsx")
    );
  }

  // TYPE DEFINITIONS

  definePluginType("ForFromArrayStatement", {
    visitor: ["id", "elem", "array", "body"],
    aliases: ["Scopable", "Statement", "For", "BlockParent", "Loop", "ForXStatement", "ForFrom"],
    fields: {
      id: {
        validate: assertNodeType("Identifier"),
      },
      elem: {
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

  definePluginType("ForFromRangeStatement", {
    visitor: ["id", "rangeStart", "rangeEnd", "inclusive", "body"],
    aliases: ["Scopable", "Statement", "For", "BlockParent", "Loop", "ForXStatement"],
    fields: {
      id: {
        validate: assertNodeType("Identifier"),
        optional: true,
      },
      rangeStart: {
        validate: assertNodeType("Expression"),
      },
      rangeEnd: {
        validate: assertNodeType("Expression"),
      },
      inclusive: {
        validate: assertValueType("boolean"),
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
    path.traverse({

      ForFromArrayStatement(path) {
        let init, test, update;

        let id = path.node.id;
        init = t.variableDeclaration("let", [
          t.variableDeclarator(id, t.numericLiteral(0))
        ]);

        test = t.binaryExpression("<", id,
          t.memberExpression(path.node.array, t.identifier("length")));
        update = t.updateExpression("++", id);

        if (path.node.elem) {
          // generate `const x = arr[i];`
          let idPath = path.get("id");
          let elemDecl = t.variableDeclaration("const", [
            t.variableDeclarator(path.node.elem, t.memberExpression(
              path.node.array, id, true
            ))
          ]);

          if (t.isBlockStatement(path.node.body)) {
            path.get("body").unshiftContainer("body", elemDecl);
          } else {
            path.get("body").replaceWith(t.blockStatement([
              elemDecl,
              path.node.body,
            ]));
          }
          // may not be necessary?
          path.get("body").scope.registerBinding("const", idPath);
        }

        let forNode = t.forStatement(init, test, update, path.node.body);
        path.replaceWith(forNode);
      },

      ForFromRangeStatement(path) {
        let id, init, test, update;

        if (path.node.id) {
          // for i from 0 til 10
          id = path.node.id;
          init = t.variableDeclaration("let", [
            t.variableDeclarator(id, path.node.rangeStart)
          ]);
        } else {
          // for 0 til 10
          id = path.scope.generateUidIdentifier("i");
          init = t.variableDeclaration("let", [
            t.variableDeclarator(id, path.node.rangeStart)
          ]);
        }

        let op = path.node.inclusive ? "<=" : "<";
        test = t.binaryExpression(op, id, path.node.rangeEnd);
        update = t.updateExpression("++", id);

        let forNode = t.forStatement(init, test, update, path.node.body);
        path.replaceWith(forNode);
      },

      // `for x in` --> `for const x in`
      // `for x of` --> `for const x of`
      "ForInStatement|ForOfStatement"(path) {
        if (!t.isVariableDeclaration(path.node.left)) {
          path.node.left = t.variableDeclaration("const", [t.variableDeclarator(path.node.left)]);
        }
      },

      ArrayComprehension(path) {
        // disallow Yield and Return
        path.get("loop.body").traverse({
          YieldExpression(yieldPath) {
            throw yieldPath.buildCodeFrameError("`yield` is not allowed within Comprehensions.");
          },
          ReturnStatement(returnPath) {
            throw returnPath.buildCodeFrameError("`return` is not allowed within Comprehensions.");
          },
        });

        const arrId = path.scope.generateUidIdentifier("arr");

        transformTerminalExpressionsIntoArrPush(path.get("loop"), arrId);

        const fn = t.arrowFunctionExpression([], t.blockStatement([
          t.variableDeclaration("const", [t.variableDeclarator(arrId, t.arrayExpression())]),
          path.node.loop,
          t.returnStatement(arrId),
        ]));

        // allow `await` inside async functions
        if (path.getFunctionParent().node.async) {
          fn.async = true;
        }

        const iife = t.callExpression(fn, []);
        path.replaceWith(iife);
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

      Function(path) {
        if (path.node.kind === "constructor" || path.node.kind === "set") return;

        const isVoid = path.node.returnType &&
          t.isVoidTypeAnnotation(path.node.returnType.typeAnnotation);

        if (!isVoid) {
          addImplicitReturns(path);
        }

        // somehow this wasn't being done... may signal deeper issues...
        path.getFunctionParent().scope.registerDeclaration(path);
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


    });
  }

  return {
    manipulateOptions(opts, parserOpts, file) {
      if (!shouldParseAsLightScript(file)) return;

      opts.lightscriptEnabled = true;
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
