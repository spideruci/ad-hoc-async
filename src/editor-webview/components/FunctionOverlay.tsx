import type * as monacoNamespace from "monaco-editor";
import { useEffect, useState, useRef } from "react";
import type { Log } from "../../types/message";
import Timeline from "./Timeline";
import { calculateLeftPosition, getMonacoContentWidth } from "../editor-utils";
import { useOverlayWidth } from "../context-providers/OverlayWidthProvider";

interface FunctionOverlayProps {
  startLine: number;
  endLine: number;
  editor: monacoNamespace.editor.IStandaloneCodeEditor;
  logs: Log[];
}

const FunctionOverlay: React.FC<FunctionOverlayProps> = (
  props: FunctionOverlayProps
): React.ReactElement => {
  const { startLine, endLine, editor, logs } = props;
  const [scrollTop, setScrollTop] = useState<number>(editor.getScrollTop());
  const [scrollLeft, setScrollLeft] = useState<number>(editor.getScrollLeft());
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [hoverProvider, setHoverProvider] =
    useState<monacoNamespace.IDisposable | null>(null);
  const [cachedLeft, setCachedLeft] = useState<number | null>(null);
  const { overlayWidth, setOverlayWidth } = useOverlayWidth();
  const draggerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const initialMouseX = useRef<number>(0);
  const initialWidth = useRef<number>(overlayWidth);

  function getMonacoContentWidth(
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
      const top = editor.getTopForLineNumber(startLine) - scrollTop;
      const height =
        editor.getBottomForLineNumber(endLine) -
        editor.getTopForLineNumber(startLine);

      let minColumn = Infinity;
      for (let line = startLine; line <= endLine; line++) {
        const firstNonWhitespaceColumn =
          editor.getModel()?.getLineFirstNonWhitespaceColumn(line) || 0;
        if (
          firstNonWhitespaceColumn < minColumn &&
          firstNonWhitespaceColumn !== 0
        ) {
          minColumn = firstNonWhitespaceColumn;
        }
      }

      const left = calculateLeftPosition(
        editor,
        startLine,
        endLine,
        scrollLeft,
        cachedLeft,
        setCachedLeft
      );
      const width = getMonacoContentWidth(editor) - left;
      setOverlayStyle({
        position: "absolute",
        border: "2px solid rgba(255, 255, 255, 0.5)", // Make white border slightly transparent
        pointerEvents: "none",
        width: `${width}px`,
        height: `${height}px`,
        top: `${top}px`,
        left: `${left}px`,
        display: "flex",
        justifyContent: "flex-end",
      });
    };

    calculateOverlayStyle();
  }, [startLine, endLine, editor, scrollTop, scrollLeft, cachedLeft]);

  useEffect(() => {
    if (hoverProvider) {
      hoverProvider.dispose();
    }
    const handleMouseMove = (
      e: monacoNamespace.editor.IEditorMouseEvent
    ): void => {
      const position = e.target.position;
      const isHover =
        (position &&
          position.lineNumber >= startLine &&
          position.lineNumber <= endLine) ||
        false;
      setIsHovered(isHover);
    };
    const newHoverProvider = editor.onMouseMove(handleMouseMove);
    setHoverProvider(newHoverProvider);
    return (): void => {
      newHoverProvider.dispose();
    };
  }, [editor, startLine, endLine]);

  const handleMouseDown = (e: React.MouseEvent): void => {
    isDragging.current = true;
    initialMouseX.current = e.clientX;
    initialWidth.current = overlayWidth;
  };

  const handleMouseMove = (e: MouseEvent): void => {
    if (isDragging.current) {
      const deltaX = e.clientX - initialMouseX.current;
      const newWidth = initialWidth.current - deltaX;
      setOverlayWidth(newWidth);
    }
  };

  const handleMouseUp = (): void => {
    isDragging.current = false;
  };

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return (): void => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="overlay-box" style={overlayStyle}>
      <div
        className="overlay-tab"
        style={{
          display: isHovered ? "block" : "none", // Show only when hovered;
          position: "absolute",
          top: "-30px" /* Adjust this value to position the tab above the box */,
          left: 0,
          backgroundColor: "white",
          border: "1px solid black",
          padding: "5px",
          pointerEvents: "auto",
        }}
      >
        Tab Content
      </div>

      <div
        style={{
          position: "relative",
          width: `${overlayWidth}px`,
          height: "100%",
          backgroundColor: "white",
        }}
      >
        <div
          ref={draggerRef}
          onMouseDown={handleMouseDown}
          style={{
            position: "absolute",
            pointerEvents: "auto",
            left: "0px",
            width: "5px",
            height: "100%",
            cursor: "ew-resize",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            zIndex: 10,
          }}
        />
        <Timeline
          logs={logs}
          startLine={startLine}
          endLine={endLine}
        />
      </div>
    </div>
  );
};

export default FunctionOverlay;
