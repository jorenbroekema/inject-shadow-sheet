import { css, html } from "@lion/core";
import { LionButton } from "@lion/button";

class FooButton extends LionButton {
  static get styles() {
    return [
      ...super.styles,
      css`
        :host {
          background: red;
          color: white;
        }

        :host(:hover) {
          background: darkred;
        }
      `,
    ];
  }

  render() {
    return html`
      <style>
        @import "tailwind.css";
      </style>
      ${this._beforeTemplate()}
      <div class="button-content p-10" id="${this._buttonId}">
        <slot></slot>
      </div>
      ${this._afterTemplate()}
      <slot name="_button"></slot>
    `;
  }
}
customElements.define("foo-button", FooButton);
