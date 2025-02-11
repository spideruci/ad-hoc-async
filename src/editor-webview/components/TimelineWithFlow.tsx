import React, { useEffect } from "react";
import type { Node } from "@xyflow/react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
} from "@xyflow/react";
import type { Log } from "../../types/message";
import CustomNode from "./CustomNode";

interface TimelineProps {
  logs: Log[];
  startLine: number;
  endLine: number;
}
const nodeTypes = { customNode: CustomNode };
const proOptions = { hideAttribution: true };

const Timeline: React.FC<TimelineProps> = ({ logs, startLine, endLine }) => {
  const [nodes, setNodes] = useNodesState<Node>([]);
  useEffect(() => {
    const filteredLogs = logs.filter(
      (log) => log.lineNumber >= startLine && log.lineNumber <= endLine
    );
    const timestamps = filteredLogs.map((log) =>
      new Date(log.timestamp).getTime()
    );
    const minTimestamp = Math.min(...timestamps);

    const adjustX = (timestamp: number) => {
      return (timestamp - minTimestamp); // Adjust by subtracting the minimum timestamp
    };

    const normalizeY = (lineNumber: number) => {
      return ((lineNumber - startLine) / (endLine - startLine + 1)) * 200; // Scale to a range of 0 to 200
    };

    const initialNodes = filteredLogs.map((log, index) => ({
      id: `${index}`,
      type: "customNode",
      data: { ...log },
      position: {
        x: adjustX(new Date(log.timestamp).getTime()),
        y: normalizeY(log.lineNumber),
      },
    }));
    setNodes(initialNodes);

  }, [logs, startLine, endLine, setNodes]);

  return (
    <div style={{ height: "100%", width: "100%", pointerEvents: "auto" }}>
      <ReactFlow 
        nodeTypes={nodeTypes}
        proOptions={proOptions}
        nodes={nodes} fitView colorMode="dark">
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

export default Timeline;