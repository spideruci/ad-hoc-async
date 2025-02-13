import type * as monacoNamespace from "monaco-editor";

/**
 * A function to handle the weird behaviour of "getOffsetForColumn" api.
 *
 * - This api works unexpectedly as soon as the first line of the function leaves the viewport.
 * - To handle this, we check if the top line is in view.
 * - If it is in view, calculate the required left position and cache it.
 * - Else just return the cached left position to avoid the unexpected re-calculation.
 *
 * @param editor - the monaco editor
 * @param startLine - start line of the function
 * @param endLine - end line of the function
 * @param scrollLeft - scroll from the left
 * @param cachedLeft - the previously computed left position
 * @param setCachedLeft - function to cache the left position
 * @returns the [cached or computed] dependable left position
 */
export function calculateLeftPosition(
  editor: monacoNamespace.editor.IStandaloneCodeEditor,
  startLine: number,
  endLine: number,
  scrollLeft: number,
  cachedLeft: number | null,
  setCachedLeft: (value: number) => void
): number {
  const { contentLeft, height } = editor.getLayoutInfo();
  const model = editor.getModel();

  if (!model) {
    return cachedLeft ?? contentLeft;
  }

  let minColumn = Infinity;
  let minLine = -1;

  for (let line = startLine; line <= endLine; line++) {
    const col = model.getLineFirstNonWhitespaceColumn(line) || 0;

    if (col && col < minColumn) {
      [minColumn, minLine] = [col, line];
    }
  }

  if (minLine === -1) {
    return cachedLeft ?? contentLeft;
  }

  // Check if the line is in the viewport
  const top = editor.getTopForLineNumber(minLine);
  const isInView =
    top >= editor.getScrollTop() && top <= editor.getScrollTop() + height;

  if (isInView) {
    const left =
      editor.getOffsetForColumn(minLine, minColumn) - scrollLeft + contentLeft;

    setCachedLeft(left);

    return left;
  }

  return cachedLeft ?? contentLeft;
}

export function getMonacoContentWidth(
  editor: monacoNamespace.editor.IStandaloneCodeEditor
): number {
  const editorNode = editor.getDomNode();
  if (!editorNode) {
    return 0;
  }
  const viewLines = editorNode.querySelectorAll(".view-line");
  let totalWidth = 0;

  viewLines.forEach((line) => {
    totalWidth = Math.max(totalWidth, (line as HTMLElement).offsetWidth);
  });
  return totalWidth;
}
