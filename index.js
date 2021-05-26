import { html, render } from '@lion/core';
import './fixtures/foo-button.js';
import './fixtures/qux-button.js';

render(
  html`
    <foo-button>Click me!</foo-button>
    <qux-button>Click me!</qux-button>
  `,
  document.getElementById('app'),
);
