import React, { useState, useMemo, useEffect, useRef } from "react";
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
import { useRange } from "../context-providers/RangeProvider";
import CustomizedDot from "./CustomizedDot";

interface TimelineProps {
  logs: Log[];
  startLine: number;
  endLine: number;
}

export default function Timeline({
  logs,
  startLine,
  endLine,
}: TimelineProps): JSX.Element {
  const chartRef = useRef<HTMLDivElement>(null);
  const { range, setRange, originalRange } = useRange();

  // Group logs by functionKey and convert to chart data
  const chartData = useMemo(() => {
    const groupedLogs: { [key: string]: { timestamp: number; value: number, log: Log}[] } = {};
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
          log,
        });
      });

    return groupedLogs;
  }, [logs, startLine, endLine]);

  // Get function keys for floating tabs
  const functionKeys = useMemo(() => Object.keys(chartData), [chartData]);

  // Multi-select state for function keys, defaulting to all selected
  const [selectedFunctions, setSelectedFunctions] = useState(
    new Set(functionKeys)
  );

  // Update selection when functionKeys change (select all by default)
  useEffect(() => {
    setSelectedFunctions((prevSelected) => {
      const newSelected = new Set(prevSelected);
      functionKeys.forEach((key) => {
        if (!prevSelected.has(key)) {
          newSelected.add(key);
        }
      });
      return newSelected;
    });
  }, [functionKeys]);

  const toggleFunction = (key: string): void => {
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

  useEffect(() => {
    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9; // Zoom in or out

      const chartElement = chartRef.current;
      if (!chartElement) { return; }

      const rect = chartElement.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorRatio = cursorX / rect.width;

      setRange(([min, max]) => {
        const rangeSize = max - min;
        const newRangeSize = rangeSize * zoomFactor;
        const cursorValue = min + rangeSize * cursorRatio;
        const newMin = Math.max(originalRange[0], cursorValue - newRangeSize * cursorRatio);
        const newMax = Math.min(originalRange[1], cursorValue + newRangeSize * (1 - cursorRatio));
        return [newMin, newMax];
      });
    };

    const chartElement = chartRef.current;
    if (chartElement) {
      chartElement.addEventListener("wheel", handleWheel);
    }

    return (): void => {
      if (chartElement) {
        chartElement.removeEventListener("wheel", handleWheel);
      }
    };
  }, [originalRange, setRange]);

  return (
    <div
      ref={chartRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        pointerEvents: "auto",
        overflow: "hidden",
        userSelect: "none",
        backgroundColor: "#1e1e1e",
      }}
    >
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
              backgroundColor: selectedFunctions.has(key)
                ? "#4CAF50"
                : "#8884d8",
              color: "white",
              borderRadius: "5px",
              cursor: "pointer",
              userSelect: "none",
              fontWeight: selectedFunctions.has(key) ? "bold" : "normal",
              border: selectedFunctions.has(key)
                ? "2px solid #fff"
                : "2px solid transparent",
            }}
          >
            {index}
          </div>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart syncId={"timelinesync"} syncMethod="value">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" type="number" domain={range} allowDataOverflow hide/>
          <YAxis reversed domain={["dataMax", "dataMin"]} allowDataOverflow allowDecimals={false}/>
          <Tooltip
            formatter={(value) => [`${value}`, "Value"]}
            labelFormatter={(label) => `Timestamp: ${label}`}
            contentStyle={{ color: "#000000", height: "100%" }}
            itemStyle={{ color: "#000000" }}
          />
          {Object.keys(chartData)
            .filter((key) => selectedFunctions.has(key)) // Only render selected functions
            .map((key) => (
              <Line
                key={key}
                type="stepBefore"
                dataKey="value"
                data={chartData[key]}
                name={key}
                stroke="#ffffff"
                fill="#ffffff"
                strokeWidth="1.392px"
                dot={(props) => <CustomizedDot {...props}/>}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
