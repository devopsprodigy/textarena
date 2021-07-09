import Textarena from '../Textarena';
import ArenaPlugin from '../interfaces/ArenaPlugin';
import ArenaSelection from '../helpers/ArenaSelection';

const typings = [
  {
    shortcut: 'Alt + Minus',
    text: '—',
  },
  {
    shortcut: 'Alt + Shift + Minus',
    text: '–',
  },
  {
    shortcut: 'Alt + Equal',
    text: '≠',
  },
  {
    shortcut: 'Alt + Shift + Equal',
    text: '±',
  },
  {
    shortcut: 'Alt + Shift + Slash',
    text: '́',
  },
  {
    shortcut: 'Alt + KeyE',
    text: '€',
  },
  {
    shortcut: 'Alt + KeyR',
    text: '®',
  },
  {
    shortcut: 'Alt + KeyT',
    text: '™',
  },
  {
    shortcut: 'Alt + KeyY',
    text: 'ѣ',
  },
  {
    shortcut: 'Alt + KeyA',
    text: '≈',
  },
  {
    shortcut: 'Alt + Shift + KeyA',
    text: '⌘',
  },
  {
    shortcut: 'Alt + KeyS',
    text: '§',
  },
  {
    shortcut: 'Alt + KeyD',
    text: '°',
  },
  {
    shortcut: 'Alt + KeyF',
    text: '£',
  },
  {
    shortcut: 'Alt + KeyH',
    text: '₽',
  },
  {
    shortcut: 'Alt + KeyX',
    text: '×',
  },
  {
    shortcut: 'Alt + KeyC',
    text: '©',
  },
  {
    shortcut: 'Alt + KeyM',
    text: '−',
  },
  {
    shortcut: 'Alt + Shift + KeyM',
    text: '•',
  },
  {
    shortcut: 'Alt + Comma',
    text: '«',
  },
  {
    shortcut: 'Alt + Shift + Comma',
    text: '„',
  },
  {
    shortcut: 'Alt + Period',
    text: '»',
  },
  {
    shortcut: 'Alt + Shift + Period',
    text: '“',
  },
  {
    shortcut: 'Ctrl + Space',
    text: '\xa0',
  },
];

const typoSugarPlugin = (): ArenaPlugin => ({
  register(textarena: Textarena): void {
    const arenas = textarena.getArenas();
    arenas.forEach((arena) => {
      if (arena.hasText) {
        arena.registerMiddleware((ta: Textarena, sel: ArenaSelection, text: string) => {
          if (sel.isCollapsed() && text === '-') {
            const { node, offset } = sel.getCursor();
            if (node.hasText && node.getRawText().slice(offset - 2, offset) === '--') {
              const newSel = sel.clone();
              node.cutText(offset - 2, offset);
              node.insertText('—', offset - 2);
              newSel.setBoth(node, offset - 1);
              return [true, newSel];
            }
          }
          return [false, sel];
        });
      }
    });
    typings.forEach(({ shortcut, text }) => {
      const command = `insert${text}`;
      textarena.registerCommand(
        command,
        (ta: Textarena, selection: ArenaSelection) => {
          if (selection.isCollapsed() && selection.startNode.hasText) {
            const cursor = selection.startNode.insertText(text, selection.startOffset);
            selection.setCursor(cursor);
          }
          return selection;
        },
      );
      textarena.registerShortcut(
        shortcut,
        command,
      );
    });
  },
});

export default typoSugarPlugin;
