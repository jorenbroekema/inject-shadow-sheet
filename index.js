import { html, render } from "@lion/core";
import "./foo-button";
import "./qux-button";

render(
  html`
    <foo-button>Click me!</foo-button>
    <qux-button>Click me!</qux-button>
  `,
  document.getElementById("app")
);
