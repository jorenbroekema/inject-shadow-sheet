import { startDevServer } from '@web/dev-server';
import { chromium } from 'playwright-chromium';
import postcss, { Result } from 'postcss';
import { promises as fs } from 'fs';
import comments from 'postcss-discard-comments';
import prettier from 'prettier';

let server;
let browser;
let page;

async function start() {
  server = await startDevServer({
    config: {
      nodeResolve: true,
    },
    logStartMessage: false,
  });
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.goto('http://localhost:8000');
}

async function stop() {
  await page.close();
  await browser.close();
  await server.stop();
}

async function getUsedFromGlobalStylesheets(filePaths, page) {
  return await Promise.all(
    filePaths.map((filePath) => {
      return page.evaluate(async (filePath) => {
        const exps = await import(filePath);
        const obj = { filePath };
        Object.keys(exps)
          .filter((key) => typeof exps[key].usedFromGlobalStylesheets === 'object')
          .forEach((key) => {
            obj[key] = exps[key].usedFromGlobalStylesheets;
          });
        return obj;
      }, filePath);
    }),
  );
}

async function transformCSS() {
  const cssContent = await fs.readFile('tailwind.css'); // <-- use source css file from component stylesheet getter
  const result = await postcss([
    {
      postcssPlugin: 'remove-unused-rules',
      Root(root) {
        root.walkRules((rule) => {
          if (rule.selector !== '.mr-60') {
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

  // Instead of writing to new file, inline it into the CSS tagged literals that contain `@inject`
  await fs.writeFile('tailwind-for-qux-button.css', prettier.format(result.css, { parser: 'css' }));
}

async function main() {
  await start();

  const globalStylesheetConfigs = await getUsedFromGlobalStylesheets(['./qux-button.js'], page);

  console.log(globalStylesheetConfigs[0].QuxButton);
  await transformCSS();

  await stop();
}
main();
