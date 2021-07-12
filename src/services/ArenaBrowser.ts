/* eslint-disable no-bitwise */
import ArenaKeyboardEvent from '../interfaces/ArenaKeyboardEvent';

import BrowserCommandEvent from '../events/BrowserCommandEvent';
import CommandEvent from '../events/CommandEvent';
import CopyEvent from '../events/CopyEvent';
import CutEvent from '../events/CutEvent';
import ArenaInputEvent from '../events/ArenaInputEvent';
import ModifiersEvent from '../events/ModifiersEvent';
import PasteEvent from '../events/PasteEvent';
import RemoveEvent from '../events/RemoveEvent';
import SelectionEvent from '../events/SelectionEvent';

import ElementHelper from '../helpers/ElementHelper';

import { keyboardKeys, Modifiers } from './ArenaCommandManager';
import ArenaServiceManager from './ArenaServiceManager';
import ArenaSelection from '../helpers/ArenaSelection';
import NodeAttributes from '../interfaces/NodeAttributes';

function isMac(): boolean {
  return window.navigator.platform.includes('Mac');
}

type ArenaChangeAttribute = CustomEvent<{
  attrs: NodeAttributes,
  target: HTMLElement,
}>;

declare global {
  interface GlobalEventHandlersEventMap {
    'arena-change-attribute': ArenaChangeAttribute;
    'beforeinput': InputEvent;
  }
}

const modifiersKeys = {
  Shift: 16,
  Ctrl: 17,
  Alt: 18,
  Meta: 91,
};

const selectionKeys = {
  pageup: 33,
  pagedown: 34,
  end: 35,
  home: 36,

  left: 37,
  up: 38,
  right: 39,
  down: 40,
};

const removeKeys = {
  backspace: 8,
  delete: 46,
};

const specialKeys = {
  escape: 27,
  tab: 9,
  enter: 13,
};

const reservedKeys = {
  scrolllock: 145,
  capslock: 20,
  numlock: 144,

  pause: 19,
  break: 19,

  insert: 45,

  f1: 112,
  f2: 113,
  f3: 114,
  f4: 115,
  f5: 116,
  f6: 117,
  f7: 118,
  f8: 119,
  f9: 120,
  f10: 121,
  f11: 122,
  f12: 123,
};

function invertObject<
  T extends Record<string | number, string | number>
>(obj: T): { [key in T[keyof T]]: keyof T } {
  const result = Object.entries(obj)
    .reduce((prev, [key, value]) => ({ ...prev, [value]: key }), { });
  return result as { [key in T[keyof T]]: keyof T };
}

const modifiersCodes = invertObject(modifiersKeys);

const selectionCodes = invertObject(selectionKeys);

const removeCodes = invertObject(removeKeys);

const specialCodes = invertObject(specialKeys);

const reservedCodes = invertObject(reservedKeys);

function isDescendant(
  parent: HTMLElement | Node | ElementHelper,
  child: HTMLElement | Node,
): boolean {
  const parentNode = parent instanceof ElementHelper ? parent.getElem() : parent;
  let node = child.parentNode;
  while (node !== null) {
    if (node === parentNode) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}

export default class ArenaBrowser {
  protected inputListenerInstance: ((e: Event) => void);

  protected beforeinputListenerInstance: ((e: InputEvent) => void);

  protected mouseUpListenerInstance: ((e: MouseEvent) => void);

  protected keyUpListenerInstance: ((e: KeyboardEvent) => void);

  protected keyPressListenerInstance: ((e: KeyboardEvent) => void);

  protected keyDownListenerInstance: ((e: KeyboardEvent) => void);

  protected selectListenerInstance: ((e: Event) => void);

  protected copyListenerInstance: ((event: ClipboardEvent) => void);

  protected pasteListenerInstance: ((event: ClipboardEvent) => void);

  protected focusListenerInstance: ((event: FocusEvent) => void);

  protected changeAttributeListenerInstance: ((event: ArenaChangeAttribute) => void);

  protected lastSelectionStatus = false;

  protected lastSelectionRange: Range | undefined;

  protected editor: ElementHelper;

  constructor(
    protected asm: ArenaServiceManager,
  ) {
    this.editor = this.asm.textarena.getEditorElement();
    this.inputListenerInstance = this.inputListener.bind(this);
    this.beforeinputListenerInstance = this.beforeinputListener.bind(this);
    this.mouseUpListenerInstance = this.mouseUpListener.bind(this);
    this.keyUpListenerInstance = this.keyUpListener.bind(this);
    this.keyPressListenerInstance = this.keyPressListener.bind(this);
    this.keyDownListenerInstance = this.keyDownListener.bind(this);
    this.selectListenerInstance = this.selectListener.bind(this);
    this.copyListenerInstance = this.copyListener.bind(this);
    this.pasteListenerInstance = this.pasteListener.bind(this);
    this.focusListenerInstance = this.focusListener.bind(this);
    this.changeAttributeListenerInstance = this.changeAttributeListener.bind(this);
    this.asm.eventManager.subscribe('turnOn', () => {
      this.editor.addEventListener('input', this.inputListenerInstance, false);
      this.editor.addEventListener('beforeinput', this.beforeinputListenerInstance, false);
      this.editor.addEventListener('mouseup', this.mouseUpListenerInstance, false);
      this.editor.addEventListener('keyup', this.keyUpListenerInstance, false);
      this.editor.addEventListener('keypress', this.keyPressListenerInstance, false);
      this.editor.addEventListener('keydown', this.keyDownListenerInstance, false);
      this.editor.addEventListener('copy', this.copyListenerInstance, false);
      this.editor.addEventListener('paste', this.pasteListenerInstance, false);
      this.editor.addEventListener('focus', this.focusListenerInstance, false);
      this.editor.addEventListener('arena-change-attribute', this.changeAttributeListenerInstance, false);
      document.addEventListener('selectionchange', this.selectListenerInstance, false);
      this.editor.startObserve(
        () => this.asm.eventManager.fire('editorChanged'),
        {
          attributes: true,
          childList: true,
          subtree: true,
        },
      );
    });
    this.asm.eventManager.subscribe('turnOff', () => {
      this.editor.removeEventListener('input', this.inputListenerInstance);
      this.editor.removeEventListener('mouseup', this.mouseUpListenerInstance);
      this.editor.removeEventListener('keyup', this.keyUpListenerInstance);
      this.editor.removeEventListener('keypress', this.keyPressListenerInstance);
      this.editor.removeEventListener('keydown', this.keyDownListenerInstance);
      this.editor.removeEventListener('copy', this.copyListenerInstance);
      this.editor.removeEventListener('paste', this.pasteListenerInstance);
      this.editor.removeEventListener('focus', this.focusListenerInstance);
      this.editor.removeEventListener('arena-change-attribute', this.changeAttributeListenerInstance);
      document.removeEventListener('selectionchange', this.selectListenerInstance);
      this.editor.stopObserve();
    });
  }

  public getModifiersSum(e: KeyboardEvent): number {
    const {
      shiftKey,
      ctrlKey,
      altKey,
      metaKey,
    } = e;
    const MACOS = isMac();
    const modifiers = {
      Shift: shiftKey,
      Ctrl: MACOS ? metaKey : ctrlKey,
      Alt: altKey,
      Meta: MACOS ? ctrlKey : metaKey,
    };
    return this.asm.commandManager.getModifiersSum(modifiers);
  }

  public isModificationEvent(e: KeyboardEvent): boolean {
    return !!modifiersCodes[e.keyCode];
  }

  protected checkSelection(): void {
    this.asm.view.resetCurrentSelection();
    const s = window.getSelection();
    if (!s || !s.rangeCount) {
      return;
    }
    if (!s.anchorNode || !isDescendant(this.editor, s.anchorNode)) {
      return;
    }

    this.asm.eventManager.fire('moveCursor');

    if (this.lastSelectionStatus && s.isCollapsed) {
      this.lastSelectionStatus = false;
      this.asm.eventManager.fire('textUnselected');
      this.lastSelectionRange = undefined;
      return;
    }
    if (!s.isCollapsed) {
      if (!this.lastSelectionStatus) {
        this.lastSelectionStatus = true;
        this.asm.eventManager.fire('textSelected');
        this.lastSelectionRange = s.getRangeAt(0);
      } else if (this.lastSelectionRange) {
        const newRange = s.getRangeAt(0);
        if (newRange.startContainer !== this.lastSelectionRange.startContainer
          || newRange.startOffset !== this.lastSelectionRange.startOffset
          || newRange.endContainer !== this.lastSelectionRange.endContainer
          || newRange.endOffset !== this.lastSelectionRange.endOffset) {
          this.asm.eventManager.fire('selectionChanged');
          this.lastSelectionRange = newRange;
        }
      }
    }
  }

  protected checkKeyboardEvent(prefix: string, e: KeyboardEvent): ArenaKeyboardEvent | undefined {
    const {
      keyCode,
      code,
    } = e;
    const modifiersSum = this.getModifiersSum(e);
    const character = e.key && e.key.length === 1 ? e.key : undefined;
    if (this.isModificationEvent(e)) {
      return new ModifiersEvent(e, modifiersSum);
    }
    if (reservedCodes[keyCode]) {
      return new BrowserCommandEvent(e);
    }
    // if (code === 'KeyD' && modifiersSum === Modifiers.Ctrl) {
    //   return new BrowserCommandEvent(e);
    // }
    if (code === 'KeyF' && modifiersSum === Modifiers.Ctrl) {
      return new BrowserCommandEvent(e);
    }
    if (code === 'KeyG' && (modifiersSum === Modifiers.Ctrl
      || modifiersSum === (Modifiers.Ctrl | Modifiers.Shift))) {
      return new BrowserCommandEvent(e);
    }
    if (code === 'KeyH' && modifiersSum === Modifiers.Ctrl) {
      return new BrowserCommandEvent(e);
    }
    if (code === 'KeyJ' && modifiersSum === Modifiers.Ctrl) {
      return new BrowserCommandEvent(e);
    }
    if (code === 'KeyO' && modifiersSum === Modifiers.Ctrl) {
      return new BrowserCommandEvent(e);
    }
    // if (code === 'KeyP' && modifiersSum === Modifiers.Ctrl) {
    //   return new BrowserCommandEvent(e);
    // }
    // if (code === 'KeyS' && modifiersSum === Modifiers.Ctrl) {
    //   return new BrowserCommandEvent(e);
    // }
    if (code === 'KeyE' && modifiersSum === Modifiers.Ctrl) {
      return new BrowserCommandEvent(e);
    }
    // if (code === 'KeyK' && modifiersSum === Modifiers.Ctrl) {
    //   return new BrowserCommandEvent(e);
    // }
    if (code === 'Delete' && modifiersSum === (Modifiers.Ctrl | Modifiers.Shift)) {
      return new BrowserCommandEvent(e);
    }
    // if (code === 'KeyF' && modifiersSum === Modifiers.Alt) {
    //   return new BrowserCommandEvent(e);
    // }
    if (code === 'ContextMenu') {
      return new BrowserCommandEvent(e);
    }
    if (/^Digit\d$/.test(code) && modifiersSum === Modifiers.Ctrl) {
      return new BrowserCommandEvent(e);
    }

    if (selectionCodes[keyCode]) {
      return new SelectionEvent(e);
    }
    if (code === 'KeyA' && modifiersSum === Modifiers.Ctrl) {
      return new SelectionEvent(e);
    }
    if (code === 'KeyC' && modifiersSum === Modifiers.Ctrl) {
      return new CopyEvent(e);
    }
    if (code === 'KeyV' && modifiersSum === Modifiers.Ctrl) {
      return new PasteEvent(e);
    }
    if (code === 'KeyV' && modifiersSum === (Modifiers.Ctrl | Modifiers.Shift)) {
      return new PasteEvent(e);
    }
    if (code === 'KeyX' && modifiersSum === Modifiers.Ctrl) {
      return new CutEvent(e);
    }
    if (code === 'ArrowLeft' && modifiersSum === Modifiers.Alt) {
      return new SelectionEvent(e);
    }
    if (code === 'ArrowRight' && modifiersSum === Modifiers.Alt) {
      return new SelectionEvent(e);
    }
    if (removeCodes[keyCode] && modifiersSum <= Modifiers.Shift) {
      return new RemoveEvent(
        e,
        removeCodes[keyCode] === 'delete' ? 'forward' : 'backward',
      );
    }
    if (specialCodes[keyCode] || modifiersSum > Modifiers.Shift) {
      this.asm.logger.info(`${prefix} command ${modifiersSum} + ${code}`, e);
      if (code && keyboardKeys.includes(code.toLowerCase())) {
        return new CommandEvent(e, code, modifiersSum);
      }
      return undefined;
    }
    if (character && code) {
      return new ArenaInputEvent(e, character);
    }
    return undefined;
  }

  protected beforeinputListener(e: InputEvent): void {
    this.asm.logger.log('Beforeinput event', e);
    if (e?.inputType === 'deleteByDrag') {
      const targetSelection = this.asm.view.detectArenaSelection();
      if (targetSelection) {
        this.asm.model.removeSelection(targetSelection, targetSelection.direction);
      }
      e.preventDefault();
    }
    if (e?.inputType === 'insertFromDrop') {
      const data = (e as unknown as { dataTransfer : DataTransfer | null }).dataTransfer;
      if (data) {
        const targetSelection = this.asm.view.detectArenaSelection();
        if (targetSelection) {
          this.insertData(data, targetSelection);
        }
      }
      e.preventDefault();
    }
  }

  protected inputListener(e: Event): void {
    this.asm.logger.log('Input event', e);
  }

  protected mouseUpListener(e: MouseEvent): void {
    this.asm.logger.log('MouseUp event', e);
    const event = e as unknown as { path: ChildNode[] };
    if (e.button === 0 && Array.isArray(event.path)) {
      const { path } = event;
      for (let i = 0; i < path.length; i += 1) {
        const elem = path[i];
        if (elem.nodeType === Node.ELEMENT_NODE
        && (elem as HTMLElement).tagName === 'TEXTARENA-REMOVE') {
          const id = (elem as HTMLElement).getAttribute('node-id');
          if (id) {
            e.preventDefault();
            let sel;
            const cursor = this.asm.model.removeNodeById(id);
            if (cursor) {
              const textCursor = this.asm.model.getTextCursor(cursor.node, cursor.offset);
              sel = new ArenaSelection(
                textCursor.node,
                textCursor.offset,
                textCursor.node,
                textCursor.offset,
                'forward',
              );
            }
            if (!sel) {
              sel = this.asm.view.getCurrentSelection();
            }
            if (sel) {
              this.asm.history.save(sel);
            }
            this.asm.eventManager.fire('modelChanged', sel);
          }
          break;
        }
      }
    }
    this.asm.history.resetTyped();
    // this.checkSelection();
  }

  protected keyUpListener(e: KeyboardEvent): void {
    this.asm.logger.log('KeyUp event', e);
    const modifiersSum = this.getModifiersSum(e);
    this.asm.eventManager.fire('moveCursor');
    this.asm.eventManager.fire('keyUp', modifiersSum);
  }

  protected keyPressListener(e: KeyboardEvent): void {
    this.asm.logger.log('KeyPress event', e);
  }

  public keyDownListener(e: KeyboardEvent): void {
    const event = this.checkKeyboardEvent('keyDown', e);
    this.asm.logger.log('KeyDown event', event, e);
    if (event instanceof BrowserCommandEvent
      || event instanceof CopyEvent
      || event instanceof PasteEvent) {
      // allow
      return;
    }
    if (event instanceof SelectionEvent) {
      this.asm.history.resetTyped();
      this.asm.view.resetCurrentSelection();
      return;
    }
    e.cancelBubble = true;
    e.returnValue = false;
    e.stopPropagation();
    e.preventDefault();
    if (!event) {
      return;
    }
    if (event instanceof ModifiersEvent) {
      this.asm.eventManager.fire('keyDown', event.sum);
      return;
    }
    if (event instanceof CutEvent) {
      document.execCommand('copy');
      const selection = this.asm.view.getCurrentSelection();
      if (selection) {
        const newSelection = this.asm.model.removeSelection(selection, selection.direction);
        this.asm.history.save(newSelection);
        this.asm.eventManager.fire('modelChanged', newSelection);
      }
    }
    if (event instanceof CommandEvent) {
      const { command, modifiersSum } = event;
      const selection = this.asm.view.getCurrentSelection();
      if (selection) {
        this.asm.commandManager.execShortcut(selection, modifiersSum, command);
      }
    }
    if (event instanceof ArenaInputEvent) {
      const selection = this.asm.view.getCurrentSelection();
      if (selection) {
        const newSelection = this.asm.model.insertTextToModel(selection, event.character, true);
        this.asm.history.save(newSelection, /[a-zа-яА-Я0-9]/i.test(event.character));
        const [result, newSel] = this.asm.model.applyMiddlewares(
          newSelection,
          event.character,
        );
        if (result) {
          this.asm.history.save(newSel);
        }
        this.asm.eventManager.fire('modelChanged', newSel);
      }
    }
    if (event instanceof RemoveEvent) {
      const selection = this.asm.view.getCurrentSelection();
      if (selection) {
        const newSelection = this.asm.model.removeSelection(selection, event.direction);
        this.asm.history.save(newSelection);
        this.asm.eventManager.fire('modelChanged', newSelection);
      }
    }
  }

  protected copyListener(e: ClipboardEvent): void {
    this.asm.logger.log('Copy event', e);
    const { clipboardData } = e;
    if (!clipboardData) {
      return;
    }
    const selection = this.asm.view.getCurrentSelection();
    if (!selection) {
      e.preventDefault();
      return;
    }
    const resultHtml = this.asm.model.getDataHtmlOfSelection(selection);
    const resultText = this.asm.model.getPlainTextOfSelection(selection);
    clipboardData.setData('text/html', resultHtml);
    clipboardData.setData('text/plain', resultText);
    e.preventDefault();
  }

  protected pasteListener(e: ClipboardEvent): void {
    this.asm.logger.log('Paste event', e);
    e.preventDefault();
    const { clipboardData } = e;
    if (!clipboardData) {
      return;
    }
    const selection = this.asm.view.getCurrentSelection();
    if (!selection) {
      return;
    }
    this.insertData(clipboardData, selection);
  }

  protected focusListener(e: FocusEvent): void {
    this.asm.logger.log('Focus event', e);
    this.asm.creatorBar.closeList();
  }

  protected insertData(data: DataTransfer, selection: ArenaSelection): void {
    const types: string[] = [...data.types || []];
    if (types.includes('text/html')) {
      let html = data.getData('text/html');
      if (!html) {
        return;
      }
      const matchStart = /<!--StartFragment-->/.exec(html);
      if (matchStart) {
        html = html.slice(matchStart.index + matchStart[0].length);
        html = html.trimLeft();
      }
      const matchEnd = /<!--EndFragment-->/.exec(html);
      if (matchEnd) {
        html = html.slice(0, matchEnd.index);
        html = html.trimRight();
      }
      // html = html.replace(/\u00A0/, ' ');
      this.asm.logger.log(`Insert html: «${html}»`);
      const newSelection = this.asm.model.insertHtml(selection, html);
      this.asm.history.save(newSelection);
      this.asm.eventManager.fire('modelChanged', newSelection);
    } else if (types.includes('text/plain')) {
      const text = data.getData('text/plain');
      if (!text) {
        return;
      }
      this.asm.logger.log(`Insert text: «${text}»`);
      const [result, newSel] = this.asm.model.applyMiddlewares(
        selection,
        text,
      );
      const newSelection = result ? newSel : this.asm.model.insertTextToModel(selection, text);
      this.asm.history.save(newSelection);
      this.asm.eventManager.fire('modelChanged', newSelection);
    }
  }

  protected selectListener(e: Event): void {
    this.asm.logger.log('Select event', e);
    this.checkSelection();
  }

  protected getIdOfTarget(target: HTMLElement): string | undefined {
    const id = target.getAttribute('arena-id');
    if (id) {
      return id;
    }
    if (target.parentElement) {
      return this.getIdOfTarget(target.parentElement);
    }
    return undefined;
  }

  protected changeAttributeListener(e: ArenaChangeAttribute): void {
    const { attrs, target } = e.detail;
    const id = this.getIdOfTarget(target);
    if (id) {
      const node = this.asm.model.getNodeById(id);
      if (node) {
        node.setAttributes(attrs);
        const sel = this.asm.view.getCurrentSelection();
        if (sel) {
          this.asm.history.save(sel);
        }
        this.asm.eventManager.fire('modelChanged', sel);
      }
    }
  }
}
