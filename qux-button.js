import { css, html } from "@lion/core";
import { LionButton } from "@lion/button";

export class QuxButton extends LionButton {
  static get usedFromGlobalStylesheets() {
    return {
      "tailwind.css": {
        used: ["p-10"],
        selectors: {
          ":host([active])": ["border-green-500"],
        },
      },
    };
  }

  static get styles() {
    return [
      ...super.styles,
      css`
        @inject 'tailwind.css';
      `,
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
      ${this._beforeTemplate()}
      <div class="button-content p-10" id="${this._buttonId}">
        <slot></slot>
      </div>
      ${this._afterTemplate()}
      <slot name="_button"></slot>
    `;
  }
}
customElements.define("qux-button", QuxButton);

// Should not be limited to only 1 export with this getter
export class adewaButton extends LionButton {
  static get usedFromGlobalStylesheets() {
    return {
      "tailwind.css": {
        used: ["p-10"],
        selectors: {
          ":host([active])": ["border-green-500"],
        },
      },
    };
  }
}

// Should ignore because misspelled getter
export class saddsad extends LionButton {
  static get ussedFromGlobalStylesheets() {
    return {
      "tailwind.css": {
        used: ["p-10"],
        selectors: {
          ":host([active])": ["border-green-500"],
        },
      },
    };
  }
}
