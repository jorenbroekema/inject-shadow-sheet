# InjectShadowSheet

Some POCs using Global Stylesheets in Web Components with Shadow Roots.

Using Lion button and Tailwind for exploration.

I try to generalize for other CSS frameworks that leverage global stylesheets as well (like Bootstrap)

The point here is to try to avoid forking CSS files from these frameworks which is a lot of work on the maintainer and styles easily go out of sync.

## @import

Using CSS `@import` in `<style>` tags in lit render() --> [foo-button](./foo-button.js)

Pros:

- Works in browsers
- Markup agnostic

Cons:

- Doesn't work inside CSSResults so you need to create `<style>` tag in lit render method
- Doesn't provide a way to add Tailwind classes to the host element, user is forced to do smth like `<foo-button class="foo-btn">` where author exports foo-btn which applies the tailwind classes (requires some PostCSS or similar build-step to automate)
- Not performant, as you'll be doing these `@imports` in all your components and likely in combination with `<link>` for your HTML entrypoints. Also considered an anti-pattern because of this.

## @inject

Use `@inject` to specify from which stylesheets we should extract and inline CSS rules.
Allow to add CSS selectors and inline stylesheet classes inside of existing selectors (to support `:host` styles for example)

Pros:

- Flexible
- Only inlines the styles that are actually used in template
- Supports putting class-rules on :host

Cons:

- Build-step
- ~~Complexity, as you have to traverse nested templates to collect class names~~ No need to traverse templates right now, but user has to manually document which classes they use in component templates. In the future we could even try using the Typescript compiler API to introspect the templates, bit tricky to get the conditional classes and classMaps too though..
- More complexity, as you have to traverse CSS file and extract + inline the necessary CSS classes + rules, PostCSS makes it relatively easy though..

### How it works

- Pass a glob of files to transform
- Finds exported classes with classesFromStylesheets static getter
- Spins up web server + playwright crawler to read out these getters (NodeJS cannot import as ESM since non-ESM imports are used, @lion/core + @lion/button are not "type":"module"....)
- Based on the configs from these getters, read the global stylesheets and extract only the rules of which the selectors are used, using PostCSS
- Use JS AST to inline these CSS contents into the css literals that have `@inject` atrules.
- Write the new files to destination output directory (e.g. /src/ --> /pre-dist/)
- Run other build-steps on /pre-dist/ --> /dist/

Later: make it watchable so it reruns transforms on files that match the glob and have changed.

See also the before / after code snippets in [snippets](./snippets.md)
