import { transformSync } from '@babel/core';
import * as BabelTypes from '@babel/types';

/** @param {{ types: BabelTypes }} opts */
export function injectCSSPlugin({ types: t }) {
  const taggedCSSVisitor = {
    TaggedTemplateExpression(path) {
      // static get styles
      if (path.node.tag.name === 'css') {
        const quasis = path.node.quasi.quasis;

        // Find all quasis indexes that have at least one @inject statement
        const quasiIndexes = quasis
          .map((q, i) => (q.value.raw.match(new RegExp("@inject '(.+)';", 'gm')) ? i : ''))
          .filter(String);

        // For each quasi
        quasiIndexes.forEach((index) => {
          const rawVal = quasis[index].value.raw;
          let newVal = rawVal;
          let replaced = false;

          /**
           * TODO: Instead of Regex matching and replacing, try with PostCSS, might be easier?
           * 1) for each match on the raw value
           * 2) Check whether the matched stylesheet maps to a key in the usedFromGlobalStylesheets config
           * 3) If so, fetch the CSS we're supposed to inject from the config
           * 4) Replace the `@inject` statement with the CSS by replacing the quasi with a new one with the CSS as raw value
           */
          const pattern = /@inject '(?<stylesheet>.+)';/g;
          let match;
          while ((match = pattern.exec(rawVal))) {
            if (
              match &&
              match.groups &&
              match.groups.stylesheet &&
              this.cfg[match.groups.stylesheet]
            ) {
              const cssToInject = this.cfg[match.groups.stylesheet].fetchedCSS;
              newVal = newVal.replace(match[0], cssToInject);
              replaced = true;
            }
          }
          if (replaced) {
            path.node.quasi.quasis[index] = t.templateElement({ raw: newVal });
          }
        });
      }
    },
  };

  const methodVisitor = {
    ClassMethod(path) {
      // static get styles
      if (path.node.static && path.node.kind === 'get' && path.node.key.name === 'styles') {
        path.traverse(taggedCSSVisitor, { types: t, cfg: this.cfg });
      }
    },
  };

  return {
    visitor: {
      ClassDeclaration(path, state) {
        if (state.opts.cfg[path.node.id.name]) {
          path.traverse(methodVisitor, {
            types: t,
            cfg: state.opts.cfg[path.node.id.name],
          });
        }
      },
    },
  };
}

/** @param {{ types: BabelTypes }} opts */
export function removeGetterPlugin({ types: t }) {
  const methodVisitor = {
    ClassMethod(path) {
      // static get styles
      if (
        path.node.static &&
        path.node.kind === 'get' &&
        path.node.key.name === 'usedFromGlobalStylesheets'
      ) {
        path.remove();
      }
    },
  };

  return {
    visitor: {
      ClassDeclaration(path, state) {
        path.traverse(methodVisitor, { types: t, cfg: state.opts.cfg });
      },
    },
  };
}

export function transformCode(code, cfg) {
  const newCode = transformSync(code, {
    plugins: [[injectCSSPlugin, { cfg }], [removeGetterPlugin]],
  })?.code;
  return newCode;
}
