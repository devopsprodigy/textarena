import EventManager from "./EventManager";
import ChangeDataListener from "./interfaces/ChangeHandler";
import { isDescendant } from "./utils";

export const emptyStrs = ['<p><br></p>', '<p><br/></p>', '<p></p>'];

enum SelectionStatus {
  Selected,
  Unselected,
};
export default class Manipulator {
  inputListenerInstance: (() => void);
  mouseUpListenerInstance: (() => void);
  keyUpListenerInstance: ((e: KeyboardEvent) => void);
  keyDownListenerInstance: ((e: KeyboardEvent) => void);
  selectListenerInstance: (() => void);

  lastSelectionStatus: SelectionStatus = SelectionStatus.Unselected;
  lastSelectionRange: Range | undefined;
  lastFocusElement: HTMLElement | undefined;

  constructor (private elem: HTMLElement, private eventManager: EventManager) {
    this.inputListenerInstance = this.inputListener.bind(this);
    this.mouseUpListenerInstance = this.mouseUpListener.bind(this);
    this.keyUpListenerInstance = this.keyUpListener.bind(this);
    this.keyDownListenerInstance = this.keyDownListener.bind(this);
    this.selectListenerInstance = this.selectListener.bind(this);
    this.eventManager.subscribe('turnOn', () => {
      this.elem.addEventListener("input", this.inputListenerInstance, false);
      this.elem.addEventListener("mouseup", this.mouseUpListenerInstance, false);
      this.elem.addEventListener("keyup", this.keyUpListenerInstance, false);
      this.elem.addEventListener("keydown", this.keyDownListenerInstance, false);
      document.addEventListener("selectionchange", this.selectListenerInstance, false);
    });
    this.eventManager.subscribe('turnOff', () => {
      this.elem.removeEventListener('input', this.inputListenerInstance);
      this.elem.removeEventListener('mouseup', this.mouseUpListenerInstance);
      this.elem.removeEventListener("keyup", this.keyUpListenerInstance);
      this.elem.removeEventListener("keydown", this.keyDownListenerInstance);
      document.removeEventListener('selectionchange', this.selectListenerInstance);
    });
  }

  fireSelectionStatus(onlyUnselection = false) {
    const s = window.getSelection();
    if (!s) {
      return false;
    }
    if (s.isCollapsed) {
      const focusNode = s.focusNode;
      if (focusNode) {
        const focusElem = (focusNode.nodeType === 1 ? focusNode : focusNode.parentElement) as HTMLElement
        if (focusElem && this.lastFocusElement !== focusElem) {
          this.eventManager.fire({
            name: 'changeFocusElement',
            target: focusElem,
          });
          this.lastFocusElement = focusElem;
        }
      }
    }
    if (this.lastSelectionStatus === SelectionStatus.Selected
      && s.isCollapsed) {
      this.lastSelectionStatus = SelectionStatus.Unselected;
      this.eventManager.fire('textUnselected');
      this.lastSelectionRange = undefined;
      return true;
    }
    if (onlyUnselection) {
      return false;
    }
    if (this.lastSelectionStatus === SelectionStatus.Unselected
      && !s.isCollapsed
      && s.anchorNode
      && isDescendant(this.elem, s.anchorNode)) {
      this.lastSelectionStatus = SelectionStatus.Selected;
      this.eventManager.fire('textSelected');
      this.lastSelectionRange = s.getRangeAt(0);
      return true;
    }
    return false;
  }

  fireSelectionChange() {
    if (!this.lastSelectionRange) {
      return;
    }
    const s = window.getSelection();
    if (!s) {
      return;
    }
    const newRange = s.getRangeAt(0);
    if (newRange.startContainer !== this.lastSelectionRange.startContainer
      || newRange.startOffset !== this.lastSelectionRange.startOffset
      || newRange.endContainer !== this.lastSelectionRange.endContainer
      || newRange.endOffset !== this.lastSelectionRange.endOffset) {
        this.eventManager.fire('selectionChanged');
        this.lastSelectionRange = newRange;
    }
  }

  inputListener() {
    this.eventManager.fire('textChanged');
  }

  mouseUpListener() {
    this.fireSelectionStatus();
  }

  keyUpListener(e: KeyboardEvent) {
    if (!this.fireSelectionStatus()) {
      this.fireSelectionChange()
    }
  }

  keyDownListener(e: KeyboardEvent) {
  }

  selectListener() {
    this.fireSelectionStatus(true);
  }

  checkFirstLine() {
    console.log(this.elem.innerHTML);
    if (this.elem.innerHTML) {
      const firstChild = this.elem.firstChild;
      if (firstChild && firstChild.nodeName === '#text') {
        const newFirstChild = document.createElement('p');
        newFirstChild.append(firstChild.cloneNode());

        const range = document.createRange();
        range.selectNodeContents(this.elem);
        range.setStartAfter(firstChild)

        const children = range.extractContents();
        children.prepend(newFirstChild);

        this.elem.innerHTML = '';
        this.elem.append(children);
      }
    } else {
      console.log(emptyStrs[0]);
      this.elem.innerHTML = emptyStrs[0];
    }
  }
}