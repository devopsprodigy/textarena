import MediatorNode from './MediatorNode';
import TextNode from './TextNode';
import RootNode from './RootNode';
import SingleNode from './SingleNode';
import {
  ArenaInlineInterface, ArenaRootInterface, ChildArena,
} from '../interfaces/Arena';
import {
  ArenaNodeInline, ArenaNodeRoot, ChildArenaNode,
} from '../interfaces/ArenaNode';
import InlineNode from './InlineNode';
import NodeRegistry from '../helpers/NodeRegistry';
import NodeAttributes from '../interfaces/NodeAttributes';

export default class NodeFactory {
  static createRootNode(arena: ArenaRootInterface): ArenaNodeRoot {
    return new RootNode(arena);
  }

  static createChildNode(
    arena: ChildArena,
    registry: NodeRegistry,
    isNew = false,
    content?: string,
  ): ChildArenaNode {
    if (arena.hasChildren) {
      let children = [];
      if (arena.protected) {
        children = arena.protectedChildren.map((item) => {
          let childArena;
          let attributes: NodeAttributes = {};
          let childContent: string | undefined;
          if (Array.isArray(item)) {
            [childArena, attributes, childContent] = item;
          } else {
            childArena = item;
          }
          const node = this.createChildNode(childArena, registry, isNew, childContent);
          node.setAttributes(attributes);

          return node;
        });
      } else if (isNew && content !== undefined && arena.arenaForText) {
        const node = this.createChildNode(arena.arenaForText, registry, isNew, content);
        children.push(node);
      }
      const id = registry.generateId();
      const node = new MediatorNode(arena, id, children);
      registry.set(id, node);
      return node;
    }
    if (arena.hasText) {
      const id = registry.generateId();
      const node = new TextNode(arena, id, {}, isNew ? content : undefined);
      registry.set(id, node);
      return node;
    }
    if (arena.single) {
      const id = registry.generateId();
      const node = new SingleNode(arena, id);
      registry.set(id, node);
      return node;
    }
    throw new Error('Cant create Node');
  }

  static createInlineNode(
    arena: ArenaInlineInterface,
  ): ArenaNodeInline {
    return new InlineNode(arena);
  }
}
