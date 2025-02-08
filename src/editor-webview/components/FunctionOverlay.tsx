import type * as monacoNamespace from "monaco-editor";
import { useEffect, useState } from "react";

interface FunctionOverlayProps {
  startLine: number;
  endLine: number;
  editor: monacoNamespace.editor.IStandaloneCodeEditor;
}

const FunctionOverlay: React.FC<FunctionOverlayProps> = ({ startLine, endLine, editor }) => {
  const [scrollTop, setScrollTop] = useState<number>(editor.getScrollTop());

  useEffect(() => {
    const handleScroll = () => {
      setScrollTop(editor.getScrollTop()); // Update scroll position
    };

    const disposable = editor.onDidScrollChange(handleScroll); // Listen for scroll changes

    return () => disposable.dispose(); // Cleanup on unmount
  }, [editor]);

  const top = editor.getTopForLineNumber(startLine) - scrollTop; // Adjust position
  const height = editor.getBottomForLineNumber(endLine) - editor.getTopForLineNumber(startLine);

  return (
    <div
      style={{
        position: "absolute",
        border: "2px solid red",
        background: "rgba(255, 0, 0, 0.1)",
        pointerEvents: "none",
        width: "100%",
        height: `${height}px`,
        top: `${top}px`,
        left: "0",
      }}
    />
  );
};

export default FunctionOverlay;
