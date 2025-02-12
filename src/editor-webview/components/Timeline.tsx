import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Log } from "../../types/message";

interface TimelineProps {
  logs: Log[];
  startLine: number;
  endLine: number;
}

export default function Timeline({ logs, startLine, endLine }: TimelineProps) {
  const chartData = useMemo(() => {
    const groupedLogs: { [key: string]: { timestamp: number; value: number }[] } = {};

    logs
      .filter((log) => log.lineNumber >= startLine && log.lineNumber <= endLine)
      .forEach((log) => {
        const key = log.functionKey;
        if (!groupedLogs[key]) {
          groupedLogs[key] = [];
        }
        groupedLogs[key].push({
          timestamp: new Date(log.timestamp).getTime(),
          value: log.lineNumber,
        });
      });

    return groupedLogs;
  }, [logs, startLine, endLine]);

  // Get function keys for floating tabs
  const functionKeys = useMemo(() => Object.keys(chartData), [chartData]);

  // Multi-select state for function keys, defaulting to all selected
  const [selectedFunctions, setSelectedFunctions] = useState(new Set(functionKeys));

  // Update selection when functionKeys change (select all by default)
  useEffect(() => {
    setSelectedFunctions(new Set(functionKeys));
  }, [functionKeys]);

  // Function to toggle function selection
  const toggleFunction = (key: string) => {
    setSelectedFunctions((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(key)) {
        if (newSelected.size > 1) {
          newSelected.delete(key); // Ensure at least one function remains selected
        }
      } else {
        newSelected.add(key);
      }
      return newSelected;
    });
  };

  return (
    <div style={{ 
      width: "100%",
      height: "100%",
      position: "relative",
      pointerEvents: "auto",
      overflow: "hidden",
      userSelect: "none",
      backgroundColor: "#1e1e1e"
    }}>
      <div
        style={{
          position: "absolute",
          top: "-20px",
          left: "10px",
          zIndex: 10,
          display: "flex",
          gap: "5px",
          flexWrap: "wrap",
        }}
      >
        {functionKeys.map((key, index) => (
          <div
            key={key}
            onClick={() => toggleFunction(key)}
            style={{
              padding: "5px 10px",
              backgroundColor: selectedFunctions.has(key) ? "#4CAF50" : "#8884d8",
              color: "white",
              borderRadius: "5px",
              cursor: "pointer",
              userSelect: "none",
              fontWeight: selectedFunctions.has(key) ? "bold" : "normal",
              border: selectedFunctions.has(key) ? "2px solid #fff" : "2px solid transparent",
            }}
          >
            {index}
          </div>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" type="number" domain={["dataMax", "dataMin"]} />
          <YAxis reversed domain={["dataMax", "dataMin"]} />
          <Tooltip
            formatter={(value) => [`${value}`, "Value"]}
            labelFormatter={(label) => `Timestamp: ${label}`}
            contentStyle={{ color: "#000000", height: "100%" }}
            itemStyle={{ color: "#000000" }}
          />          {/* Render only selected function keys */}
          {Object.keys(chartData)
            .filter((key) => selectedFunctions.has(key)) // Only render selected functions
            .map((key) => (
              <Line
                key={key}
                type="step"
                dataKey="value"
                data={chartData[key]}
                name={key}
                stroke="#ffffff"
                fill="#ffffff"
                strokeWidth="1.392px"
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
