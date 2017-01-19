import { parse } from "babylon-lightscript";


export default function (babel) {
  const { types: t } = babel;


  // HELPER FUNCTIONS

  function reallyDefineType(name, opts) {
    t.defineType(name, opts);

    // the below should not be necessary; see https://github.com/babel/babel/pull/4886
    t.TYPES.push(name);

    opts.aliases.forEach((alias) => {
      t.FLIPPED_ALIAS_KEYS[alias] = t.FLIPPED_ALIAS_KEYS[alias] || [];
      t.FLIPPED_ALIAS_KEYS[alias].push(name);

      if (!t.TYPES[alias]) t.TYPES.push(alias);
    });
  }

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
            // TODO: consider lifting this restriction, or giving a warning instead.
            throw targetPath.buildCodeFrameError(
              "Assignments are not implicitly returned. " +
              "Annotate your function with `void` or return a value."
            );
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
      t.assertOneOf(methodId, ["Identifier", "Expression"]);

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
    t.assertOneOf(assignId, ["Identifier", "MemberExpression"]);

    let assignments = methodIds.map((methodId) => {
      // could be computed, eg `['blah']() => {}`
      t.assertOneOf(methodId, ["Identifier", "Expression"]);
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

  function replaceWithConst(path, id, init) {
    path.replaceWith(t.variableDeclaration("const", [
      t.variableDeclarator(id, init)
    ]));
    path.scope.registerBinding("const", path.get("declarations.0.id"));
  }

  // TYPE DEFINITIONS

  reallyDefineType("ForFromArrayStatement", {
    visitor: ["id", "elem", "array", "body"],
    aliases: ["Scopable", "Statement", "For", "BlockParent", "Loop", "ForXStatement", "ForFrom"],
    fields: {
      id: {
        validate: t.assertNodeType("Identifier"),
      },
      elem: {
        validate: t.assertNodeType("Identifier"),
        optional: true,
      },
      array: {
        validate: t.assertNodeType("Expression"),
      },
      body: {
        validate: t.assertNodeType("Statement"),
      },
    },
  });

  reallyDefineType("ForFromRangeStatement", {
    visitor: ["id", "rangeStart", "rangeEnd", "inclusive", "body"],
    aliases: ["Scopable", "Statement", "For", "BlockParent", "Loop", "ForXStatement"],
    fields: {
      id: {
        validate: t.assertNodeType("Identifier"),
        optional: true,
      },
      rangeStart: {
        validate: t.assertNodeType("Expression"),
      },
      rangeEnd: {
        validate: t.assertNodeType("Expression"),
      },
      inclusive: {
        validate: t.assertValueType("boolean"),
      },
      body: {
        validate: t.assertNodeType("Statement"),
      },
    },
  });

  reallyDefineType("ArrayComprehension", {
    visitor: ["loop"],
    aliases: ["ArrayExpression", "Expression"],
    fields: {
      loop: {
        validate: t.assertNodeType("ForStatement"),
      },
    },
  });

  reallyDefineType("TildeCallExpression", {
    visitor: ["left", "right", "arguments"],
    aliases: ["CallExpression", "Expression"],
    fields: {
      left: {
        validate: t.assertNodeType("Expression"),
      },
      right: {
        validate: t.assertOneOf("Identifier", "MemberExpression"),
      },
      arguments: {
        validate: t.chain(
          t.assertValueType("array"),
          t.assertEach(t.assertNodeType("Expression", "SpreadElement"))
        ),
      },
    },
  });

  reallyDefineType("NamedArrowDeclaration", {
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
        validate: t.assertNodeType("Identifier"),
      },
      params: {
        validate: t.chain(
          t.assertValueType("array"),
          t.assertEach(t.assertNodeType("LVal"))
        ),
      },
      body: {
        validate: t.assertNodeType("BlockStatement", "Expression"),
      },
      skinny: {
        validate: t.assertValueType("boolean")
      },
      generator: {
        default: false,
        validate: t.assertValueType("boolean")
      },
      async: {
        default: false,
        validate: t.assertValueType("boolean")
      },
    },
  });

  reallyDefineType("NamedArrowExpression", {
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

  reallyDefineType("NamedArrowMemberExpression", {
    inherits: "NamedArrowExpression",
    fields: {  // c/p from NamedArrowExpression except for `object`
      id: {
        validate: t.assertNodeType("Identifier"),
      },
      object: {
        validate: t.assertNodeType("Identifier", "MemberExpression"),
      },
      params: {
        validate: t.chain(
          t.assertValueType("array"),
          t.assertEach(t.assertNodeType("LVal"))
        ),
      },
      body: {
        validate: t.assertNodeType("BlockStatement", "Expression"),
      },
      skinny: {
        validate: t.assertValueType("boolean")
      },
      generator: {
        default: false,
        validate: t.assertValueType("boolean")
      },
      async: {
        default: false,
        validate: t.assertValueType("boolean")
      },
    },
  });

  reallyDefineType("IfExpression", {
    visitor: ["test", "consequent", "alternate"],
    aliases: ["Expression", "Conditional"],
    fields: {
      test: {
        validate: t.assertNodeType("Expression")
      },
      consequent: {
        validate: t.assertNodeType("Expression", "BlockStatement")
      },
      alternate: {
        optional: true,
        validate: t.assertNodeType("Expression", "BlockStatement")
      }
    }
  });

  reallyDefineType("SafeAwaitExpression", {
    builder: ["argument"],
    visitor: ["argument"],
    aliases: ["AwaitExpression", "Expression", "Terminatorless"],
    fields: {
      argument: {
        validate: t.assertNodeType("Expression"),
      }
    }
  });


  return {
    manipulateOptions(opts, parserOpts) {
      opts.parserOpts = opts.parserOpts || {};
      opts.parserOpts.parser = parse;
      parserOpts.plugins.unshift("lightscript");
      // TODO: allow configuration options to disable these, as they slow down parsing
      parserOpts.plugins.push("jsx", "flow");
    },

    visitor: {

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
        const arrId = path.scope.generateUidIdentifier("arr");

        transformTerminalExpressionsIntoArrPush(path.get("loop"), arrId);

        const fn = t.arrowFunctionExpression([], t.blockStatement([
          t.variableDeclaration("const", [t.variableDeclarator(arrId, t.arrayExpression())]),
          path.node.loop,
          t.returnStatement(arrId),
        ]));
        const iife = t.callExpression(fn, []);
        path.replaceWith(iife);
      },

      TildeCallExpression(path) {
        const callExpr = t.callExpression(path.node.right, [
          path.node.left,
          ...path.node.arguments,
        ]);
        path.replaceWith(callExpr);
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
        let node = path.node;
        if (node.operator === "<-" || node.operator === "<!-") {
          // if we leave as AssignmentExpression, turn into =
          node.operator = "=";
          if (!path.parentPath.isExpressionStatement()) return;
          if (path.get("left").isMemberExpression()) return;

          // wrap in const
          return replaceWithConst(path.parentPath, node.left, node.right);
        } else if (node.operator === "=") {
          if (t.isMemberExpression(path.node.left)) return;

          // Ensure variables are declared
          for (const id in path.getBindingIdentifiers()) {
            const binding = path.scope.getBinding(id);
            if (!binding) {
              const allBindings = Object.keys(path.scope.getAllBindings());
              throw path.buildCodeFrameError(
                `Cannot assign to undeclared variable in LightScript.
                 Bindings currently in scope: [${allBindings.join(", ")}].
                `);
            } else if (binding.kind === "const") {
              throw path.buildCodeFrameError("Assignment to constant variable.");
            }
          }
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
        path.replaceWith(iife);
      },


    },
  };
}
