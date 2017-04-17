# babel-plugin-lightscript

Compiles [LightScript](http://lightscript.org) to JavasScript when used with [Babel](http://babeljs.io).

The plugin only processes files that include `.lsc` or `.lsx` in their filenames.

It converts a "LightScript AST" produced by [babylon-lightscript](https://github.com/lightscript/babylon-lightscript)
into a conventional "Babel AST".

If you are using ES7 features (like `import`), JSX, and Flow, use
[babel-preset-lightscript](https://github.com/lightscript/babel-preset-lightscript)
to target ES6 instead of using the plugin directly.

If you are using `babel-plugin-lightscript` with other plugins, be sure it is the *first* plugin.

### Options

You may disable the standard library:

    {
      "plugins": [
        ["lightscript", { "stdlib": false }]
      ]
    }

Or disable its inclusion of lodash:

    {
      "plugins": [
        ["lightscript", {
          "stdlib": {
            "lodash": false,
          }
        }]
      ]
    }

Or tell it to use `require()` instead of `import`:

    {
      "plugins": [
        ["lightscript", {
          "stdlib": {
            "require": true,
          }
        }]
      ]
    }


### Contributing

You will need to link `babel-plugin-lightscript` to itself:

    cd babel-plugin-lightscript
    npm link
    npm link babel-plugin-lightscript
    npm install
    npm run build
    npm test

Please report issues on [the main lightscript repo](https://github.com/lightscript/lightscript) instead of here.
