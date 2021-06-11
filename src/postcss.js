import postcss, { Result } from 'postcss';
import comments from 'postcss-discard-comments';
import { promises as fs } from 'fs';
import path from 'path';
import { uncss } from './uncss.js';

/**
 * Grab only the 'used rulesets' from a CSS file
 */
export async function fetchCSS(filePath, usedRules) {
  const cssContent = await fs.readFile(path.resolve(filePath)); // <-- use source css file from component stylesheet getter
  const result = await postcss([
    {
      postcssPlugin: 'uncss',
      Root(root) {
        uncss(
          root,
          [],
          usedRules
            // Rules can have . or : in classname, e.g. in tailwind
            // We should escape those to match the CSS selectors in the stylesheet
            .map((rule) => rule.replace('.', '\\.').replace(':', '\\:'))
            // Prefix our used classes with a .
            .map((rule) => `.${rule}`),
        );
      },
    },
    comments,
  ]).process(cssContent, { from: undefined });
  return result.css;
}
