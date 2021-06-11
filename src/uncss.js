/**
 * Forked from https://github.com/uncss/uncss/blob/master/src/lib.js
 * Except for:
 * - uncss which I adapted to accept array of already known selectors
 * - filterEmptyAtRules which I adapted to filter out nested at rules, which uncss by default does not work well with
 */
import postcss from 'postcss';
import postcssSelectorParser from 'postcss-selector-parser';
import _ from 'lodash';

const dePseudify = (() => {
  const ignoredPseudos = [
      /* link */
      ':link',
      ':visited',
      /* user action */
      ':hover',
      ':active',
      ':focus',
      ':focus-within',
      /* UI element states */
      ':enabled',
      ':disabled',
      ':checked',
      ':indeterminate',
      /* form validation */
      ':required',
      ':invalid',
      ':valid',
      /* pseudo elements */
      '::first-line',
      '::first-letter',
      '::selection',
      '::before',
      '::after',
      /* pseudo classes */
      ':target',
      /* CSS2 pseudo elements */
      ':before',
      ':after',
      /* Vendor-specific pseudo-elements:
       * https://developer.mozilla.org/ja/docs/Glossary/Vendor_Prefix
       */
      '::?-(?:moz|ms|webkit|o)-[a-z0-9-]+',
    ],
    // Actual regex is of the format: /^(:hover|:focus|...)$/i
    pseudosRegex = new RegExp(`^(${ignoredPseudos.join('|')})$`, 'i');

  const transform = (selectors) => {
    selectors.walkPseudos((selector) => {
      if (pseudosRegex.test(selector.value)) {
        selector.remove();
      }
    });
  };

  const processor = postcssSelectorParser(transform);

  return (selector) => processor.processSync(selector);
})();

/**
 * Private function used in filterUnusedRules.
 * @param  {Array} selectors      CSS selectors created by the CSS parser
 * @param  {Array} ignore         List of selectors to be ignored
 * @param  {Array} usedSelectors  List of Selectors found in the jsdom pages
 * @return {Array}                The selectors matched in the DOMs
 */
function filterUnusedSelectors(selectors, ignore, usedSelectors) {
  /* There are some selectors not supported for matching, like
   *   :before, :after
   * They should be removed only if the parent is not found.
   * Example: '.clearfix:before' should be removed only if there
   *          is no '.clearfix'
   */
  return selectors.filter((selector) => {
    selector = dePseudify(selector);
    /* TODO: process @-rules */
    if (selector[0] === '@') {
      return true;
    }
    for (let i = 0, len = ignore.length; i < len; ++i) {
      if (_.isRegExp(ignore[i]) && ignore[i].test(selector)) {
        return true;
      }
      if (/:\w+/.test(ignore[i])) {
        const ignored = dePseudify(ignore[i]);
        if (ignored === selector) {
          return true;
        }
      }
      if (ignore[i] === selector) {
        return true;
      }
    }
    return usedSelectors.indexOf(selector) !== -1;
  });
}

/**
 * Filter @keyframes that are not used
 * @param  {Object} css             The postcss.Root node
 * @param  {Array}  animations
 * @param  {Array}  unusedRules
 * @return {Array}
 */
function filterKeyframes(css, unusedRules) {
  const usedAnimations = [];
  css.walkDecls((decl) => {
    if (_.endsWith(decl.prop, 'animation-name')) {
      /* Multiple animations, separated by comma */
      usedAnimations.push(...postcss.list.comma(decl.value));
    } else if (_.endsWith(decl.prop, 'animation')) {
      /* Support multiple animations */
      postcss.list.comma(decl.value).forEach((anim) => {
        /* If declared as animation, name can be anywhere in the string; so we include all the properties */
        usedAnimations.push(...postcss.list.space(anim));
      });
    }
  });
  const usedAnimationsSet = new Set(usedAnimations);
  css.walkAtRules(/keyframes$/, (atRule) => {
    if (!usedAnimationsSet.has(atRule.params)) {
      unusedRules.push(atRule);
      atRule.remove();
    }
  });
}

/**
 * Filter rules with no selectors remaining
 * @param  {Object} css             The postcss.Root node
 * @return {Array}
 */
function filterEmptyAtRules(css) {
  /* Filter media queries with no remaining rules */
  css.walkAtRules((rule) => {
    let declCount = 0;
    rule.walkDecls(() => {
      declCount++;
    });
    if (declCount === 0) {
      rule.remove();
    }
  });
}

/**
 * Remove css rules not used in the dom
 * @param  {Object} css             The postcss.Root node
 * @param  {Array}  ignore          List of selectors to be ignored
 * @param  {Array}  usedSelectors   List of selectors that are found in {pages}
 * @return {Object}                 A css_parse-compatible stylesheet
 */
function filterUnusedRules(css, ignore, usedSelectors) {
  let ignoreNextRule = false,
    ignoreNextRulesStart = false,
    unusedRuleSelectors,
    usedRuleSelectors;

  const unusedRules = [];

  /* Rule format:
   *  { selectors: [ '...', '...' ],
   *    declarations: [ { property: '...', value: '...' } ]
   *  },.
   * Two steps: filter the unused selectors for each rule,
   *            filter the rules with no selectors
   */
  ignoreNextRule = false;
  css.walk((rule) => {
    if (rule.type === 'comment') {
      if (/^!?\s?uncss:ignore start\s?$/.test(rule.text)) {
        // ignore next rules while using comment `/* uncss:ignore start */`
        ignoreNextRulesStart = true;
      } else if (/^!?\s?uncss:ignore end\s?$/.test(rule.text)) {
        // until `/* uncss:ignore end */` was found
        ignoreNextRulesStart = false;
      } else if (/^!?\s?uncss:ignore\s?$/.test(rule.text)) {
        // ignore next rule while using comment `/* uncss:ignore */`
        ignoreNextRule = true;
      }
    } else if (rule.type === 'rule') {
      if (rule.parent.type === 'atrule' && _.endsWith(rule.parent.name, 'keyframes')) {
        // Don't remove animation keyframes that have selector names of '30%' or 'to'
        return;
      }
      if (ignoreNextRulesStart) {
        ignore = ignore.concat(rule.selectors);
      } else if (ignoreNextRule) {
        ignoreNextRule = false;
        ignore = ignore.concat(rule.selectors);
      }

      usedRuleSelectors = filterUnusedSelectors(rule.selectors, ignore, usedSelectors);

      unusedRuleSelectors = rule.selectors.filter(
        (selector) => usedRuleSelectors.indexOf(selector) < 0,
      );
      if (unusedRuleSelectors && unusedRuleSelectors.length) {
        unusedRules.push({
          type: 'rule',
          selectors: unusedRuleSelectors,
          position: rule.source,
        });
      }
      if (usedRuleSelectors.length === 0) {
        rule.remove();
      } else {
        rule.selectors = usedRuleSelectors;
      }
    }
  });

  /* Filter the @media rules with no rules */
  filterEmptyAtRules(css);

  /* Filter unused @keyframes */
  filterKeyframes(css, unusedRules);

  return css;
}

/**
 * Main exposed function
 * @param  {Object}  css            The postcss.Root node
 * @param  {Array}   ignore         List of selectors to be ignored
 * @param  {Array}   usedSelectors  List of used selectors
 * @return {Promise}
 */
export async function uncss(css, ignore, usedSelectors) {
  const filteredCss = filterUnusedRules(css, ignore, usedSelectors);
  return filteredCss;
}
