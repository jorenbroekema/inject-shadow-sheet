import { transformSync } from '@babel/core';

export function readClassesGetterPlugin({ types: t }) {
  const returnStatementVisitor = {
    ReturnStatement(path) {
      // static get styles
      if (path.type === 'ReturnStatement') {
        this.codeLocations.push({
          className: this.className,
          start: path.node.argument.start,
          end: path.node.argument.end,
        });
      }
    },
  };

  const methodVisitor = {
    ClassMethod(path) {
      // static get styles
      if (
        path.node.static &&
        path.node.kind === 'get' &&
        path.node.key.name === 'classesFromStylesheets'
      ) {
        path.traverse(returnStatementVisitor, {
          types: t,
          codeLocations: this.codeLocations,
          className: this.className,
        });
      }
    },
  };

  return {
    visitor: {
      ClassDeclaration(path, state) {
        const className = path.node.id.name;
        path.traverse(methodVisitor, {
          types: t,
          codeLocations: state.opts.codeLocations,
          className,
        });
      },
    },
  };
}

export function readClassesGetter(code) {
  const codeLocations = [];
  transformSync(code, {
    plugins: [[readClassesGetterPlugin, { codeLocations }]],
  });
  return codeLocations;
}
