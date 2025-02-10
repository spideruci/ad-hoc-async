import type * as monacoNamespace from "monaco-editor";
import { useEffect, useState } from "react";

interface FunctionOverlayProps {
  startLine: number;
  endLine: number;
  editor: monacoNamespace.editor.IStandaloneCodeEditor;
}

const FunctionOverlay: React.FC<FunctionOverlayProps> = ({ startLine, endLine, editor }): React.ReactElement => {
  const [scrollTop, setScrollTop] = useState<number>(editor.getScrollTop());
  const [scrollLeft, setScrollLeft] = useState<number>(editor.getScrollLeft());
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [hoverProvider, setHoverProvider] = useState<monacoNamespace.IDisposable | null>(null);
  function getMonacoContentWidth(editor: monacoNamespace.editor.IStandaloneCodeEditor): number {
    const editorNode = editor.getDomNode();
    if (!editorNode) { return 0; }
  
    // Select all visible .view-line elements
    const viewLines = editorNode.querySelectorAll(".view-line");
    let totalWidth = 0;
  
    viewLines.forEach(line => {
      totalWidth = Math.max(totalWidth, (line as HTMLElement).offsetWidth);
    });
  
    return totalWidth;
  }
  useEffect(() => {
    const handleScroll = (): void => {
      setScrollTop(editor.getScrollTop()); // Update scroll position
      setScrollLeft(editor.getScrollLeft()); // Update scroll position
    };

    const disposable = editor.onDidScrollChange(handleScroll); // Listen for scroll changes

    return (): void => disposable.dispose(); // Cleanup on unmount
  }, [editor]);

  useEffect(() => {
    const calculateOverlayStyle = (): void => {
      const layoutInfo = editor.getLayoutInfo();
      const lineNumberGutterWidth = layoutInfo.contentLeft;

      const top = editor.getTopForLineNumber(startLine) - scrollTop; // Adjust position
      const height = editor.getBottomForLineNumber(endLine) - editor.getTopForLineNumber(startLine);

      let minColumn = Infinity;
      let minLineNumber = -1;
      for (let line = startLine; line <= endLine; line++) {
        const firstNonWhitespaceColumn = editor.getModel()?.getLineFirstNonWhitespaceColumn(line) || 0;
        if (firstNonWhitespaceColumn < minColumn && firstNonWhitespaceColumn !== 0) {
          minColumn = firstNonWhitespaceColumn;
          minLineNumber = line;
        }
      }

      const left = editor.getOffsetForColumn(minLineNumber, minColumn) - scrollLeft + lineNumberGutterWidth;
      const width = getMonacoContentWidth(editor) - left;

      setOverlayStyle({
        position: "absolute",
        border: "2px solid rgba(255, 255, 255, 0.5)", // Make white border slightly transparent
        pointerEvents: "none",
        width: `${width}px`,
        height: `${height}px`,
        top: `${top}px`,
        left: `${left}px`,
      });
    };

    calculateOverlayStyle();
  }, [startLine, endLine, editor, scrollTop, scrollLeft]);

  useEffect(() => {
    if (hoverProvider) {
      hoverProvider.dispose();
    }

    // Mouse move event listener
    const handleMouseMove = (e: monacoNamespace.editor.IEditorMouseEvent) => {
      const position = e.target.position;
      if (position && position.lineNumber >= startLine && position.lineNumber <= endLine) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    const newHoverProvider = editor.onMouseMove(handleMouseMove);
    setHoverProvider(newHoverProvider);

    return (): void => {
      newHoverProvider.dispose();
    };
  }, [editor, startLine, endLine]);

  return (
    <div className="overlay-box" style={overlayStyle}>
      <div
        className="overlay-tab"
        style={{
          display: isHovered ? "block" : "none", // Show only when hovered;
          position: "absolute",
          top: "-30px", /* Adjust this value to position the tab above the box */
          left: 0,
          backgroundColor: "white",
          border: "1px solid black",
          padding: "5px",
          pointerEvents: "auto",
        }}
      >
        Tab Content
      </div>
    </div>
  );
};

export default FunctionOverlay;
