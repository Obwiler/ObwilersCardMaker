/**
 * undoStore — 命令模式 undo/redo 栈
 * 栈深度限制 50，用于 Editor 页面
 */

export interface CardSnapshot {
  name: string;
  tags: string[];
  text: string;
}

interface UndoState {
  undoStack: CardSnapshot[];
  redoStack: CardSnapshot[];
  maxDepth: number;
  push: (snapshot: CardSnapshot) => void;
  undo: (current: CardSnapshot) => CardSnapshot | null;
  redo: (current: CardSnapshot) => CardSnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export function createUndoManager(): UndoState {
  const undoStack: CardSnapshot[] = [];
  const redoStack: CardSnapshot[] = [];
  const maxDepth = 50;

  return {
    undoStack,
    redoStack,
    maxDepth,

    push(snapshot) {
      undoStack.push(snapshot);
      redoStack.length = 0; // 新操作清空 redo
      if (undoStack.length > maxDepth) {
        undoStack.shift();
      }
    },

    undo(current) {
      if (undoStack.length === 0) return null;
      redoStack.push(current);
      return undoStack.pop()!;
    },

    redo(current) {
      if (redoStack.length === 0) return null;
      undoStack.push(current);
      return redoStack.pop()!;
    },

    canUndo() {
      return undoStack.length > 0;
    },

    canRedo() {
      return redoStack.length > 0;
    },

    clear() {
      undoStack.length = 0;
      redoStack.length = 0;
    },
  };
}
