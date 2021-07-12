import { html, TemplateResult } from 'lit-html';
import ArenaCursorText from '../interfaces/ArenaCursorText';
import { ArenaFormatings } from '../interfaces/ArenaFormating';
import AbstractNode from './AbstractNode';
import { ArenaSingleInterface } from '../interfaces/Arena';
import { ArenaNodeSingle } from '../interfaces/ArenaNode';

export default class SingleNode
  extends AbstractNode<ArenaSingleInterface>
  implements ArenaNodeSingle {
  readonly hasParent: true = true;

  readonly hasChildren: false = false;

  readonly hasText: false = false;

  readonly inline: false = false;

  readonly single: true = true;

  public getTemplate(): TemplateResult | string {
    const id = this.getGlobalIndex();
    if (this.parent.protected) {
      return this.arena.getTemplate(undefined, id, this.attributes);
    }
    const content = this.arena.getTemplate(undefined, '', this.attributes);
    const removeButton = html`<textarena-remove node-id="${id}">
    <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
    viewBox="0 0 512.001 512.001" xml:space="preserve">
    <g>
      <path d="M294.111,256.001L504.109,46.003c10.523-10.524,10.523-27.586,0-38.109c-10.524-10.524-27.587-10.524-38.11,0L256,217.892
        L46.002,7.894c-10.524-10.524-27.586-10.524-38.109,0s-10.524,27.586,0,38.109l209.998,209.998L7.893,465.999
        c-10.524,10.524-10.524,27.586,0,38.109c10.524,10.524,27.586,10.523,38.109,0L256,294.11l209.997,209.998
        c10.524,10.524,27.587,10.523,38.11,0c10.523-10.524,10.523-27.586,0-38.109L294.111,256.001z" fill="currentColor"/>
    </g>
    </svg>
    </textarena-remove>`;
    return html`
      <textarena-node arena-id="${id}">${removeButton}${content}</textarena-node>
    `;
  }

  public getOutput(type: string, frms: ArenaFormatings): string {
    return this.arena.getOutput(type, undefined, this.attributes, this, frms);
  }

  public getDataHtml(): string {
    return this.arena.getDataHtml('', this.attributes);
  }

  public getPlainText(): string {
    return '';
  }

  public getTextCursor(): ArenaCursorText | undefined {
    return undefined;
  }

  public clone(): ArenaNodeSingle {
    return new SingleNode(
      this.arena,
      this.id,
      this.attributes,
    );
  }
}
