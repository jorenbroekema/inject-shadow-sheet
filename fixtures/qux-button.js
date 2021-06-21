import { css, html } from '@lion/core';
import { LionButton } from '@lion/button';

export class QuxButton extends LionButton {
  static get classesFromStylesheets() {
    return {
      'tailwind.css': {
        used: ['p-10', 'border-green-500', 'm-5', 'xl:container'],
        mapped: {
          ':host([active])': ['border-green-500'],
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
      <div class="button-content p-10 border-green-500 m5" id="${this._buttonId}">
        <slot></slot>
      </div>
      ${this._afterTemplate()}
      <slot name="_button"></slot>
    `;
  }
}
customElements.define('qux-button', QuxButton);

// Should not be limited to only 1 export with this getter, though without a styles getter + @inject, nothing will be injected
export class adewaButton extends LionButton {
  static get classesFromStylesheets() {
    return {
      'tailwind.css': {
        used: ['p-9'],
        mapped: {
          ':host([active])': ['border-green-500'],
        },
      },
    };
  }
}

// Should ignore because misspelled getter
export class saddsad extends LionButton {
  static get classessFromStylesheets() {
    return {
      'tailwind.css': {
        used: ['p-8'],
        mapped: {
          ':host([active])': ['border-green-500'],
        },
      },
    };
  }
}
