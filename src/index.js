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


  return {
    manipulateOptions(opts, parserOpts) {
      opts.parserOpts = opts.parserOpts || {};
      opts.parserOpts.parser = parse;
      parserOpts.plugins.unshift("lightscript");
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


    },
  };
}
