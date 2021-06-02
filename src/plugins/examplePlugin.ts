import {
  html, css, property, TemplateResult,
} from 'lit-element';
import Textarena from '../Textarena';
import ArenaPlugin from '../interfaces/ArenaPlugin';
import ArenaSelection from '../helpers/ArenaSelection';
import { AnyArenaNode } from '../interfaces/ArenaNode';
import { ArenaSingleInterface } from '../interfaces/Arena';
import WebComponent from '../helpers/WebComponent';

export class Recomendation extends WebComponent {
  protected currentPostId = '';

  @property({
    type: String,
    reflect: true,
  })
  set postId(value: string) {
    this.currentPostId = value;
    this.fetchPost(value);
  }

  get postId(): string {
    return this.currentPostId;
  }

  currentContent = '';

  inputValue = '';

  loading = false;

  static styles = css`
    :host {
      background: lightgray;
      border: 1px solid red;
      display: block;
      padding: 1em;
      margin: 0 0 1em;
      user-select: none;
    }`;

  constructor() {
    super();
    if (this.postId) {
      this.fetchPost(this.postId);
    }
  }

  fetchPost(postId: string): void {
    if (!postId) {
      this.loading = false;
      this.currentContent = '';
      this.requestUpdate();
      return;
    }
    // fetch from api
    this.loading = true;
    this.currentContent = '';
    this.requestUpdate();
    setTimeout(() => {
      if (postId === this.postId) {
        this.currentContent = `Статья «${postId}»`;
        this.loading = false;
        this.requestUpdate();
      }
    }, 2000);
  }

  createRenderRoot(): ShadowRoot {
    return this.attachShadow({
      mode: 'closed',
      // delegatesFocus: true,
    });
  }

  handleClick(): void {
    if (this.inputValue) {
      // this.postId = this.inputValue;
      this.fireChangeAttribute({ postid: this.inputValue });
      // this.requestUpdate();
      // this.fetchPost(this.postId);
    }
  }

  handleInput(e: InputEvent): void {
    if (!e.currentTarget) {
      return;
    }
    const { value } = e.currentTarget as HTMLInputElement;
    this.inputValue = value;
  }

  // Render element DOM by returning a `lit-html` template.
  render(): TemplateResult {
    if (this.loading) {
      return html`<div>
        Грузится…
      </div>`;
    }
    let content;
    if (this.postId) {
      content = html`<div>
        <div>Вам рекомендуется почитать:</div>
        ${this.currentContent}
      </div>`;
    } else {
      content = html`<div>
        <input type="text" @input="${this.handleInput}" />
        <input type="button" @click="${this.handleClick}" value="Ок" />
      </div>`;
    }

    return html`<div>
      ${content}
    </div>`;
  }
}

type MarkOptions = {
  tag: string,
  attributes: string[];
};

export type ExampleOptions = {
  name: string,
  tag: string,
  attributes: string[],
  allowedAttributes: string[],
  title: string,
  icon?: string,
  shortcut: string,
  hint: string,
  command: string,
  component: string,
  marks: MarkOptions[],
};

const defaultOptions: ExampleOptions = {
  name: 'exampleRecomendation',
  title: 'Example recomendation',
  tag: 'ARENA-RECOMENDATION',
  attributes: [
  ],
  allowedAttributes: ['postid'],
  shortcut: 'Alt + KeyR',
  hint: 'r',
  command: 'add-recomendation',
  component: 'arena-recomendation',
  marks: [
    {
      tag: 'ARENA-RECOMENDATION',
      attributes: [],
    },
  ],
};

const examplePlugin = (opts?: ExampleOptions): ArenaPlugin => ({
  register: (ta: Textarena) => {
    const {
      name, icon, title, tag, attributes,
      allowedAttributes, shortcut, hint, command, component, marks,
    } = { ...defaultOptions, ...(opts || {}) };
    if (!customElements.get(component)) {
      customElements.define(component, Recomendation);
    }
    const arena = ta.registerArena(
      {
        name,
        tag,
        attributes,
        allowedAttributes,
        single: true,
      },
      marks,
      [ta.getRootArenaName()],
    ) as ArenaSingleInterface;
    ta.registerCommand(
      command,
      (someTa: Textarena, selection: ArenaSelection) => {
        const sel = someTa.insertBeforeSelected(selection, arena);
        return sel;
      },
    );

    ta.registerShortcut(
      shortcut,
      command,
    );
    ta.registerCreator({
      name,
      icon,
      title,
      shortcut,
      hint,
      command,
      canShow: (node: AnyArenaNode) =>
        ta.isAllowedNode(node, arena),
    });
  },
});

export default examplePlugin;
