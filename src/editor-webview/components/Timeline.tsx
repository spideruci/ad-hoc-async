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
import type { ActionMeta, MultiValue } from "react-select";
import Select from "react-select";
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
  const functionKeyMapping = useMemo(() => {
    const mapping: Record<string, Record<string, number>> = {};
    const counters: Record<string, number> = {};

    const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);

    sortedLogs
      .filter((log) => log.lineNumber >= startLine && log.lineNumber <= endLine)
      .forEach((log) => {
        if (!(log.functionName in mapping)) {
          mapping[log.functionName] = {};
          counters[log.functionName] = 1;
        }
        if (!(log.functionKey in mapping[log.functionName])) {
          mapping[log.functionName][log.functionKey] = counters[log.functionName];
          counters[log.functionName] = counters[log.functionName] + 1;
        }
      });
    return mapping;
  }, [logs]);
  // Group logs by functionKey and convert to chart data
  const chartData = useMemo(() => {
    const groupedLogs: Record<
      string,
      { timestamp: number; value: number; log: Log }[]
    > = {};
    logs
      .filter((log) => log.lineNumber >= startLine && log.lineNumber <= endLine)
      .forEach((log) => {
        const key = `${log.functionName}::-::${log.functionKey}`;
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
    setSelectedFunctions(new Set(functionKeys));
  }, [functionKeys]);

  const handleSelectChange = (
    newValue: MultiValue<{ value: string; label: string }>,
    _actionMeta: ActionMeta<{ value: string; label: string }>
  ): void => {
    const selectedKeys = new Set(newValue.map((option) => option.value));
    setSelectedFunctions(selectedKeys);
  };

  useEffect(() => {
    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
      const chartElement = chartRef.current;
      if (!chartElement) {
        return;
      }
      const rect = chartElement.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorRatio = cursorX / rect.width;
      setRange(([min, max]) => {
        const rangeSize = max - min;
        const newRangeSize = rangeSize * zoomFactor;
        const cursorValue = min + rangeSize * cursorRatio;
        const newMin = Math.max(
          originalRange[0],
          cursorValue - newRangeSize * cursorRatio
        );
        const newMax = Math.min(
          originalRange[1],
          cursorValue + newRangeSize * (1 - cursorRatio)
        );
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

  const options = functionKeys.map((key) => {
    const functionName = key.split("::-::")[0];
    const functionKey = key.split("::-::")[1];
    return {
      value: key,
      label: String(functionKeyMapping[functionName][functionKey]), // Display as 1, 2, 3...
    };
  });

  return (
    <div
      ref={chartRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        pointerEvents: "auto",
        userSelect: "none",
        backgroundColor: "#1e1e1e",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-40px",
          left: "10px",
          zIndex: 10,
          display: "flex",
          gap: "5px",
          flexWrap: "wrap",
        }}
      >
        <Select
          isMulti
          options={options}
          value={options.filter((option) =>
            selectedFunctions.has(option.value)
          )}
          onChange={handleSelectChange}
          styles={{
            control: (base) => ({
              ...base,
              backgroundColor: "#333",
              borderColor: "#555",
              color: "#fff",
            }),
            menu: (base) => ({
              ...base,
              backgroundColor: "#333",
              color: "#fff",
            }),
            multiValue: (base) => ({
              ...base,
              backgroundColor: "#555",
              color: "#fff",
            }),
            multiValueLabel: (base) => ({ ...base, color: "#fff" }),
            multiValueRemove: (base) => ({
              ...base,
              color: "#fff",
              ":hover": { backgroundColor: "#777", color: "#fff" },
            }),
          }}
        />
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart syncId="timelinesync" syncMethod="value">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={range}
            allowDataOverflow
            hide
          />
          <YAxis
            reversed
            domain={["dataMax", "dataMin"]}
            allowDataOverflow
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value) => [`${value}`, "Value"]}
            labelFormatter={(label) => `Timestamp: ${label}`}
            contentStyle={{ color: "#000000" }}
            itemStyle={{ color: "#000000" }}
          />
          {functionKeys
            .filter((key) => selectedFunctions.has(key))
            .map((key) => (
              <Line
                key={key}
                type="stepBefore"
                dataKey="value"
                data={chartData[key]}
                stroke="#ffffff"
                fill="#ffffff"
                strokeWidth="1.392px"
                dot={(props) => <CustomizedDot {...props} />}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
