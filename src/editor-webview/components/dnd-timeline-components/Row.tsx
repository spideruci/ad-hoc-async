import type { RowDefinition } from "dnd-timeline";
import { useRow } from "dnd-timeline";
import type React from "react";

interface RowProps extends RowDefinition {
  lineNumber: number; // The line number associated with this row
  children: React.ReactNode;
}

const Row: React.FC<RowProps> = ({ id, lineNumber, children }) => {
  const { setNodeRef, setSidebarRef, rowWrapperStyle, rowStyle, rowSidebarStyle } = useRow({ id });

  return (
    <div style={{ ...rowWrapperStyle, minHeight: 20 }}>
      {/* Sidebar shows line number */}
      <div ref={setSidebarRef} style={{ ...rowSidebarStyle, fontWeight: "bold", padding: "5px" }}>
        Line {lineNumber}
      </div>
      {/* Timeline row for log items */}
      <div ref={setNodeRef} style={{ ...rowStyle, border: "1px solid grey" }}>
        {children}
      </div>
    </div>
  );
};

export default Row;
