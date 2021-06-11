# Foo

## Before

```js
export class BarButton extends LionButton {
  static get classesFromStylesheets() {
    return {
      'tailwind.css': {
        used: ['mx-3', 'mx-4', 'color-red'],
        mapped: [
          ':host([active])': ['border-green-500']
        ],
      }
    }
  }

  static get styles() {
    return [
      ...super.styles,
      css`
        @inject 'tailwind.css';
      `,
    ];
  }
}
```

## After

```js
export class BarButton extends LionButton {
  static get styles() {
    return [
      ...super.styles,
      css`
        mx-3 { ... }

        mx-4 { ... }

        color-red { ... }

        :host([active]) {
          border-color: green
        }
      `,
    ];
  }
}
```
