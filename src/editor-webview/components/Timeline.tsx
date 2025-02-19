import React, { useState, useMemo, useEffect, useRef } from "react";
import type { ActionMeta, MultiValue } from "react-select";
import Select from "react-select";
import Highcharts, { Series } from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import "highcharts/modules/boost";
import type { ConsoleLog, Log } from "../../types/message";
import { useRange } from "../context-providers/RangeProvider";

(function (H) {
  // Keep a reference to the original reset function
  const originalReset = H.Pointer.prototype.reset;

  H.Pointer.prototype.reset = function () {
    const pointer = this as Highcharts.Pointer & { chart: Highcharts.Chart };
    if (!pointer.chart.hoverPoint) {
      originalReset.call(this);
    }
  };

  /**
   * Highlight a point by showing tooltip, setting hover state, and drawing crosshair.
   */
  (H.Point.prototype as any).highlight = function (event: any) {
    const chart = this.series.chart;
    event = chart.pointer.normalize(event);
    this.onMouseOver(); // Show hover marker
    chart.tooltip.refresh(this); // Show tooltip
    chart.xAxis[0].drawCrosshair(event, this); // Show crosshair
  };

  const syncHighlight = (e: MouseEvent) => {
    Highcharts.charts.forEach((chart) => {
      if (!chart) { return; }
  
      const event = chart.pointer.normalize(e as any);
  
      // 🔹 First, clear hover state for all points in the chart
      chart.series.forEach((series) => {
        series.points.forEach((point) => {
          if (point.setState) {
            point.setState(); // Reset hover state
          }
        });
      });
  
      // 🔹 Then, find and highlight the closest scatter point
      chart.series?.forEach((s) => {
        if (s.type === "scatter") {
          const point = s.searchPoint(event, true);
          if (point) {
            (point as any).highlight(e);
          }
        }
      });
    });
  };

  // Attach event listeners
  document.addEventListener("mousemove", syncHighlight);
})(Highcharts);
// --- Types ---
interface TimelineProps {
  logs: Log[];
  startLine: number;
  endLine: number;
}

// Store each point’s original Log data in Highcharts
interface CustomLogPoint extends Highcharts.PointOptionsObject {
  log: Log;
}

interface SelectFunctionInvocationProps {
  options: { value: string; label: string }[];
  selectedFunctions: Set<string>;
  handleSelectChange: (
    newValue: MultiValue<{ value: string; label: string }>,
    actionMeta: ActionMeta<{ value: string; label: string }>
  ) => void;
}

// Multi-Select for Functions
const SelectFunctionInvocation = ({
  options,
  selectedFunctions,
  handleSelectChange,
}: SelectFunctionInvocationProps) => {
  return (
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
        value={options.filter((option) => selectedFunctions.has(option.value))}
        closeMenuOnSelect={false}
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
  );
};

export default function TimelineHighcharts({
  logs,
  startLine,
  endLine,
}: TimelineProps): JSX.Element {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartComponentRef = useRef<HighchartsReact.RefObject>(null);
  const [logMapping, setLogMapping] = useState<Record<string, ConsoleLog>>({});

  // Range context
  const { range, setRange } = useRange();

  // Map functionName->functionKey->(label index)
  const functionKeyMapping = useMemo(() => {
    const mapping: Record<string, Record<string, number>> = {};
    const counters: Record<string, number> = {};

    const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);

    sortedLogs
      .filter((log) => log.lineNumber >= startLine && log.lineNumber <= endLine)
      .forEach((log) => {
        if (!mapping[log.functionName]) {
          mapping[log.functionName] = {};
          counters[log.functionName] = 1;
        }
        if (!mapping[log.functionName][log.functionKey]) {
          mapping[log.functionName][log.functionKey] =
            counters[log.functionName];
          counters[log.functionName] += 1;
        }
      });

    return mapping;
  }, [logs, startLine, endLine]);

  // Group logs by function key
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

  // All possible function keys
  const functionKeys = useMemo(() => Object.keys(chartData), [chartData]);

  // Multi-select (defaults to all selected)
  const [selectedFunctions, setSelectedFunctions] = useState(
    new Set(functionKeys)
  );
  useEffect(() => {
    setSelectedFunctions(new Set(functionKeys));
  }, [functionKeys]);

  const yPlotBands = useMemo(() => {
    if (!startLine || !endLine) { return []; }
  
    return Array.from({ length: endLine - startLine + 1 }, (_, i) => {
      const yValue = startLine + i;
      return {
        from: yValue - 0.5,
        to: yValue + 0.5,
        color: yValue % 2 === 0 ? "rgba(68, 170, 213, 0.1)" : "rgba(0, 0, 0, 0)",
        label: {
          text: `${yValue}`, // Label each band with its value
          style: {
            color: "#606060",
          },
        },
      };
    });
  }, [startLine, endLine]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSetRange = (min: number, max: number) => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); }
    debounceRef.current = setTimeout(() => {
      setRange([min, max]);
    }, 300); // Adjust debounce delay as needed
  };
  
  // For the dropdown
  const options = useMemo(
    () =>
      functionKeys.map((key) => {
        const [functionName, functionKey] = key.split("::-::");
        const labelIndex = functionKeyMapping[functionName][functionKey];
        return { value: key, label: String(labelIndex) };
      }),
    [functionKeyMapping, functionKeys]
  );

  const handleSelectChange = (
    newValue: MultiValue<{ value: string; label: string }>,
    _actionMeta: ActionMeta<{ value: string; label: string }>
  ) => {
    setSelectedFunctions(new Set(newValue.map((option) => option.value)));
  };

  useEffect(() => {
    const newLogMapping: Record<string, ConsoleLog> = {};
    
    functionKeys.forEach((key) => {
      const sortedData = [...chartData[key]].sort((a, b) => a.timestamp - b.timestamp);
  
      sortedData.forEach((d, index) => {
        if (d.log.type === "console.log") {
          newLogMapping[d.log.logId] = d.log; // Store the log with an ID
        }
      });
    });
  
    setLogMapping(newLogMapping);
  }, [chartData, functionKeys]);
  /**
   * Build 2 series per functionKey:
   * 1) A line series with non-console.log points (no mouse tracking)
   * 2) A scatter series with console.log points (mouse tracking enabled)
   */
  const series = useMemo(() => {
    return functionKeys
      .filter((key) => selectedFunctions.has(key))
      .flatMap((key) => {
        const sortedData = [...chartData[key]].sort(
          (a, b) => a.timestamp - b.timestamp
        );
        // Non-console.log => line
        const lineData = sortedData
          .filter((d) => d.log.type !== "console.log")
          .map((d) => ({
            x: d.timestamp,
            y: d.value,
          }));

        // console.log => scatter
        const scatterData = sortedData
          .filter((d) => d.log.type === "console.log")
          .map((d) => ({
            x: d.timestamp,
            y: d.value,
            id: d.log.type === "console.log" ? d.log.logId : "",
          }));

        return [
          {
            name: `${key}-line`,
            type: "line" as const,
            step: "left" as const,
            data: lineData,
            marker: { enabled: false },
            enableMouseTracking: false, // no hover or tooltips for non-console logs
          },
          {
            name: `${key}-scatter`,
            type: "scatter" as const,
            data: scatterData,
            enableMouseTracking: true, // default anyway, but explicit
            marker: {
              symbol: "circle",
              radius: 3,
              fillColor: "#FF0000",
            },
          },
        ] as Highcharts.SeriesOptionsType[];
      });
  }, [chartData, functionKeys, selectedFunctions]);
  
  // Build final Highcharts config
  const chartOptions: Highcharts.Options = useMemo(() => {
    return {
      boost: {
        enabled: true,
        seriesThreshold: 200,
      },
      chart: {
        type: "stockChart", // <-- This is important
        backgroundColor: "#1e1e1e",
        zooming: {
          type: "x",
        }
      },
      rangeSelector: {
        enabled: false, // Add stock range selector
      },
      navigator: {
        enabled: false, // Enables the navigator for better zoom control
      },
      scrollbar: {
        enabled: false, // Enables scrollbar for smooth scrolling
      },
      tooltip: {
        enabled: true,
        shared: true,
        split: false,
        useHTML: true,
        followPointer: true, // Ensures tooltip follows mouse
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        style: { color: "#000" },
        formatter: function () {
          if ((this as any).id && logMapping[(this as any).id]) {
            return "<strong>Log Data:</strong><br/>" +
              logMapping[(this as any).id].logData.map(d => `${JSON.stringify(d)}<br/>`).join("");
          }
          return `<strong>Time:</strong> ${new Date(this.x).toLocaleString()}<br/>
                  <strong>Line:</strong> ${this.y}`;
        },
      },
      title: { text: undefined },
      xAxis: {
        visible: false,
        type: "datetime",
        min: range[0],
        max: range[1],
        crosshair: {snap: false},
        tickLength: 0,
        lineColor: "#999",
        tickColor: "#999",
        events: {
          setExtremes: function (e) {
            if (e.trigger !== "sync" && e.min !== null && e.max !== null) {
              debouncedSetRange(e.min, e.max);
            }
          },
        },
      },
      yAxis: {
        reversed: true,
        tickLength: 0,
        lineColor: "#999",
        gridLineWidth: 0,
        tickColor: "#999",
        title: { text: "" },
        plotBands: yPlotBands,
        min: startLine,
        max: endLine,
      },
      legend: { enabled: false },

      plotOptions: {
        series: {
          showInNavigator: true, // Enable navigator for each series
          marker: {
            enabled: true, // Makes scatter points more visible
          },
        },
      },
      credits: { enabled: false },
      series: series as Highcharts.SeriesOptionsType[],
    };
  }, [range, series, setRange, yPlotBands]);

  // Keep chart in sync if external range changes
  useEffect(() => {
    const chartObj = chartComponentRef.current?.chart;
    if (!chartObj) {
      return;
    }

    const currentMin = chartObj.xAxis[0].min;
    const currentMax = chartObj.xAxis[0].max;

    if (currentMin !== range[0] || currentMax !== range[1]) {
      chartObj.xAxis[0].setExtremes(range[0], range[1], true, false, {
        trigger: "sync",
      });
    }
  }, [range]);

  return (
    <div
      ref={chartContainerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        pointerEvents: "auto",
        userSelect: "none",
        backgroundColor: "#1e1e1e",
      }}
    >
      <SelectFunctionInvocation
        options={options}
        selectedFunctions={selectedFunctions}
        handleSelectChange={handleSelectChange}
      />

      <HighchartsReact
        ref={chartComponentRef}
        highcharts={Highcharts}
        constructorType={"stockChart"}
        options={chartOptions}
        containerProps={{ style: { height: "100%", width: "100%" } }}
      />
    </div>
  );
}