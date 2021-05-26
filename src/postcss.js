import postcss, { Result } from 'postcss';
import comments from 'postcss-discard-comments';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Grab only the 'used rulesets' from a CSS file
 */
export async function fetchCSS(filePath, usedRules) {
  const cssContent = await fs.readFile(path.resolve(filePath)); // <-- use source css file from component stylesheet getter
  const result = await postcss([
    {
      postcssPlugin: 'remove-unused-rules',
      Root(root) {
        root.walkRules((rule) => {
          /**
           * TODO: Implement smarter matching, e.g.
           * - Pseudos should match automatically
           * - Child selectors (lots of different separators, spaces most common) should check whether both classes are present inside usedRules
           * - Combined classes should check whether both classes are present inside usedRules, e.g. `.foo.bar.qux {}`
           * - Other selectors e.g. attribute selectors
           * - Ignore escape characters in stylesheet, as the user will not use them in their classes
           *
           * This... is gonna be a pain in the ass... probably look into uncss or other "remove unused css" utilities
           *
           * In the meantime we should err on the side of including too many rules, and start with a simple .match()
           * Can always make the filtering stricter to filter out more unused CSS
           */
          if (
            !usedRules.map((rule) => `.${rule}`).find((usedRule) => rule.selector.match(usedRule))
          ) {
            rule.remove();
          }
        });
      },
    },
    {
      postcssPlugin: 'remove-empty-at-rules',
      Root(root) {
        root.walkAtRules((rule) => {
          let declCount = 0;
          rule.walkDecls(() => {
            declCount++;
          });
          if (declCount === 0) {
            rule.remove();
          }
        });
      },
    },
    comments,
  ]).process(cssContent, { from: undefined });

  return result.css;
}
