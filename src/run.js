import { startDevServer } from '@web/dev-server';
import { chromium } from 'playwright-chromium';
import { promises as fs } from 'fs';
import path from 'path';

import prettier from 'prettier';

import { fetchCSS } from './postcss.js';
import { transformCode } from './babel.js';

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

async function getclassesFromStylesheets(filePaths, page) {
  return await Promise.all(
    filePaths.map((filePath) => {
      return page.evaluate(async (filePath) => {
        const exps = await import(filePath);
        const obj = { filePath };
        Object.keys(exps)
          .filter((key) => typeof exps[key].classesFromStylesheets === 'object')
          .forEach((key) => {
            obj[key] = exps[key].classesFromStylesheets;
          });
        return obj;
      }, filePath);
    }),
  );
}

async function injectCSSInFiles(cfg, outputDir) {
  for (const cfgValue of cfg.values()) {
    const { filePath } = cfgValue;
    delete cfgValue.filePath;
    const code = await fs.readFile(path.resolve(filePath), 'utf8');
    const newCode = prettier.format(transformCode(code, cfgValue), { parser: 'babel' });
    const outputPath = path.resolve(path.join(outputDir, filePath));
    const outputPathDir = path.dirname(outputPath);
    try {
      const outputDirAccess = await fs.access(outputPathDir);
      if (!outputDirAccess) {
        throw new Error();
      }
    } catch (e) {
      await fs.mkdir(outputPathDir, { recursive: true });
    }
    await fs.writeFile(outputPath, newCode, 'utf8');
  }
}

/**
 * 1) Go through files that contain "classesFromStylesheets" static getters
 * 2) Fetch CSS from the stylesheets based on the configs
 * 3) Insert this CSS as string in the configs object and return
 */
async function injectCSSInConfigs(globalStylesheetConfigs) {
  for (const [index, obj] of globalStylesheetConfigs.entries()) {
    for (const fileEntry of Object.entries(obj)) {
      if (fileEntry[0] !== 'filePath') {
        for (const styleEntry of Object.entries(fileEntry[1])) {
          const cssToInject = await fetchCSS(styleEntry[0], styleEntry[1].used);
          globalStylesheetConfigs[index][fileEntry[0]][styleEntry[0]].fetchedCSS = cssToInject;
        }
      }
    }
  }
  return globalStylesheetConfigs;
}

async function main() {
  // TODO: make configurable, for input use array of glob pattern + globby
  const outputDir = './dist';
  const inputPaths = ['./fixtures/qux-button.js'];
  await start();

  // Analyze inputPaths for classes with methods static get usedFromGlobalStylesheet and store in memory
  let globalStylesheetConfigs = await getclassesFromStylesheets(inputPaths, page);

  // Fetch CSS from the configured stylesheets and store in memory
  globalStylesheetConfigs = await injectCSSInConfigs(globalStylesheetConfigs);

  // Inject CSS in the classes, clean up and spit out as new files in outputDir, keeping folder structure intact
  await injectCSSInFiles(globalStylesheetConfigs, outputDir);

  await stop();
}
main();
