import ArenaSelection from '../helpers/ArenaSelection';
import { ArenaMediatorInterface, ArenaTextInterface } from '../interfaces/Arena';
import { AnyArenaNode } from '../interfaces/ArenaNode';
import ArenaPlugin, { DefaulPluginOptions } from '../interfaces/ArenaPlugin';
import Textarena from '../Textarena';

const defaultOptions: DefaulPluginOptions = {
  name: 'two-columns',
  title: 'Две колонки',
  tag: 'DIV',
  attributes: { class: 'arena-two-columns-container' },
  shortcut: 'Shift + Alt + Digit2',
  hint: '2',
  command: 'add-two-columns',
  marks: [
    {
      tag: 'DIV',
      attributes: ['class="arena-two-columns-container"'],
    },
  ],
};

const columnsPlugin = (opts?: Partial<DefaulPluginOptions>): ArenaPlugin => ({
  register(textarena: Textarena): void {
    const {
      name, icon, title, tag, attributes, shortcut, hint, command,
      marks, output,
    } = { ...defaultOptions, ...(opts || {}) };
    const paragraph = textarena.getDefaultTextArena() as ArenaTextInterface;
    if (!paragraph) {
      throw new Error('Default Arena for text not found');
    }
    const allowedArenas = textarena.getSimpleArenas();
    const calloutBodyContainer = textarena.registerArena(
      {
        name: 'arena-column',
        tag: 'DIV',
        attributes: { class: 'arena-column' },
        hasChildren: true,
        allowedArenas,
        arenaForText: paragraph,
      },
      [
        {
          tag: 'DIV',
          attributes: ['class=arena-column'],
        },
      ],
      [],
    ) as ArenaMediatorInterface;
    const arena = textarena.registerArena(
      {
        name,
        tag,
        attributes,
        protectedChildren: [
          [calloutBodyContainer, { class: 'arena-column' }, ''],
          [calloutBodyContainer, { class: 'arena-column' }, ''],
        ],
        arenaForText: calloutBodyContainer,
        output,
      },
      marks,
      [textarena.getRootArenaName()],
    ) as ArenaMediatorInterface;
    if (command) {
      textarena.registerCommand(
        command,
        (ta: Textarena, selection: ArenaSelection) => {
          const sel = ta.insertBeforeSelected(selection, arena);
          return sel;
        },
      );
      if (shortcut) {
        textarena.registerShortcut(
          shortcut,
          command,
        );
      }
      textarena.registerCreator({
        name,
        icon,
        title,
        shortcut,
        hint,
        command,
        canShow: (node: AnyArenaNode) =>
          textarena.isAllowedNode(node, arena),
      });
    }
  },
});

export default columnsPlugin;
