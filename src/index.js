import { parse } from "babylon-lightscript";


export default function (babel) {
  const { types: t } = babel;

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


  return {
    manipulateOptions(opts, parserOpts) {
      opts.parserOpts = opts.parserOpts || {};
      opts.parserOpts.parser = parse;
      parserOpts.plugins.unshift("lightscript");
    },

    visitor: {


    },
  };
}
