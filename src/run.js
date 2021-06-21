import { promises as fs } from 'fs';
import path from 'path';

import prettier from 'prettier';

import { fetchCSS } from './postcss.js';
import { injectCSS } from './babel/injectCSS.js';
import { readClassesGetter } from './babel/readClassesGetter.js';

/**
 * Create a data structure that is an array of objects which contain a filepath
 * and all the classes with classesFromStylesheets static getters and its return
 * values.
 *
 * 1) Read files from file paths
 * 2) For each file, find class definitions with a classesFromStylesheets getter
 * 3) Read the source char locations of the return statement value
 * 4) Create a temporary file with this return statement value + make it default export
 * 5) Read out the export with NodeJS dynamic import
 * 6) Store the JavaScript value on the object using the className as the key
 *
 * TODO: See where we can avoid awaiting in loops to make things run in parallel
 *       Note that we will need to use dynamic file names for the temp file then
 *       to prevent writing to the same file simultaneously.
 */
async function getclassesFromStylesheets(filePaths) {
  const classesFromStylesheetsPerFile = [];

  for (const filePath of filePaths) {
    const code = await fs.readFile(path.resolve(filePath), 'utf8');
    const codeLocations = readClassesGetter(code);
    const obj = { filePath };
    for (const loc of codeLocations) {
      const fileString = `export default ${code.slice(loc.start, loc.end)}`;
      await fs.writeFile(path.resolve('__temp-code.js'), fileString, 'utf8');
      const { default: def } = await import(path.resolve('__temp-code.js'));
      await fs.unlink(path.resolve('__temp-code.js'));
      obj[loc.className] = def;
    }

    classesFromStylesheetsPerFile.push(obj);
  }
  return classesFromStylesheetsPerFile;
}

async function injectCSSInFiles(cfg, outputDir) {
  for (const cfgValue of cfg.values()) {
    const { filePath } = cfgValue;
    delete cfgValue.filePath;
    const code = await fs.readFile(path.resolve(filePath), 'utf8');
    const newCode = prettier.format(injectCSS(code, cfgValue), { parser: 'babel' });
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
async function addCSSInConfigs(globalStylesheetConfigs) {
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

  // Analyze inputPaths for classes with methods static get usedFromGlobalStylesheet and store in memory
  let globalStylesheetConfigs = await getclassesFromStylesheets(inputPaths);

  // Fetch CSS from the configured stylesheets and store in memory
  globalStylesheetConfigs = await addCSSInConfigs(globalStylesheetConfigs);

  // Inject CSS in the classes, clean up and spit out as new files in outputDir, keeping folder structure intact
  await injectCSSInFiles(globalStylesheetConfigs, outputDir);
}
main();
