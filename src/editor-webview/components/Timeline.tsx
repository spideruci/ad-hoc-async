import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useGesture } from "@use-gesture/react";
import type { Log } from "../../types/message";

interface TimelineProps {
  logs: Log[];
  startLine: number;
  endLine: number;
}

export default function Timeline({ logs, startLine, endLine }: TimelineProps) {
  const [scale, setScale] = useState(1); // Zoom level
  const [offset, setOffset] = useState(0); // Panning offset
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 100 });

  // Get container size dynamically
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateDimensions(); // Initial size
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [containerRef]);

  // Convert logs to chart data (grouped by timestamp)
  const chartData = useMemo(() => {
    return logs
      .filter((log) => log.lineNumber >= startLine && log.lineNumber <= endLine)
      .map((log) => ({
        timestamp: new Date(log.timestamp).toLocaleTimeString(),
        value: log.lineNumber,
      }));
  }, [logs, startLine, endLine]);

  // Handle panning & zooming
  const bind = useGesture({
    onWheel: ({ delta: [, dy] }) => {
      setScale((prev) => Math.max(0.5, Math.min(prev - dy * 0.01, 5)));
    },
    onDrag: ({ offset: [dx] }) => {
      setOffset((prev) =>
        Math.max(0, Math.min(prev - dx * 0.05, chartData.length - 10))
      );
    },
  });

  return (
    <div
      ref={containerRef}
      {...bind()}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        userSelect: "none",
        pointerEvents: "auto",
        backgroundColor: "#1e1e1e",
      }}
    >
      <LineChart
        width={dimensions.width}
        height={dimensions.height}
        data={chartData.slice(offset, offset + 10 * scale)}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis
          reversed
          domain={[
            (dataMin: number) => dataMin - 5,
            (dataMax: number) => dataMax + 5,
          ]}
        />
        {/* Reversed Y-axis */}
        <Tooltip
          formatter={(value) => [`${value}`, "Value"]}
          labelFormatter={(label) => `Timestamp: ${label}`}
          contentStyle={{ color: "#000000", height: "100%" }}
          itemStyle={{ color: "#000000" }}
        />
        <Line
          type="stepAfter"
          dataKey="value"
          stroke="#ffffff"
          fill="#ffffff"
          strokeWidth="1.392px"
        />
      </LineChart>
    </div>
  );
}
