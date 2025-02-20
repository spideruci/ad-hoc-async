import React, { useState, useMemo, useEffect, useRef } from "react";
import type { ActionMeta, MultiValue } from "react-select";
import Select from "react-select";
import Highcharts, { Series } from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import "highcharts/modules/boost";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

import type { ConsoleLog, Log } from "../../types/message";
import { useRange } from "../context-providers/RangeProvider";
import SelectFunctionInvocation from "./SelectFunctionInvocation";

declare module "highcharts" {
  export function each<T>(
    arr: Array<T>,
    fn: (item: T, index: number, arr: Array<T>) => void
  ): void;
}

interface TimelineProps {
  logs: Log[];
  startLine: number;
  endLine: number;
}

export default function TimelineHighcharts({
  logs,
  startLine,
  endLine,
}: TimelineProps): JSX.Element {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartComponentRef = useRef<HighchartsReact.RefObject>(null);
  const [isRuntimeContext, setIsRuntimeContext] = React.useState(false);
  const handleChange = (event: React.MouseEvent<HTMLElement>, runtimeContext: boolean) => {
    setIsRuntimeContext(runtimeContext);
  };
  // Range context
  const { range, setRange } = useRange();

  const functionKeyMapping = useMemo(() => {
    const mapping: Record<string, Record<string, number>> = {};
    const counters: Record<string, number> = {};

    logs.forEach((log) => {
      if (log.lineNumber >= startLine && log.lineNumber <= endLine) {
        if (!mapping[log.functionName]) {
          mapping[log.functionName] = {};
          counters[log.functionName] = 1;
        }
        if (!mapping[log.functionName][log.functionKey]) {
          mapping[log.functionName][log.functionKey] = counters[log.functionName]++;
        }
      }
    });

    return mapping;
  }, [logs, startLine, endLine]);
  // Group logs by function key
  const chartData = useMemo(() => {
    return logs.reduce((acc, log) => {
      if (log.lineNumber >= startLine && log.lineNumber <= endLine) {
        const key = `${log.functionName}::-::${log.functionKey}`;
        acc[key] = acc[key] || [];
        acc[key].push({
          timestamp: log.timestamp,
          value: log.lineNumber,
          log,
        });
      }
      return acc;
    }, {} as Record<string, { timestamp: number; value: number; log: Log }[]>);
  }, [logs, startLine, endLine]);


  // All possible function keys
  const functionKeys = useMemo(() => Object.keys(chartData), [chartData]);

  // Multi-select (defaults to all selected)
  const [selectedFunctions, setSelectedFunctions] = useState(
    new Set(functionKeys)
  );
  useEffect(() => {
    setSelectedFunctions((prev) => {
      const newSelection = new Set(prev);
      functionKeys.forEach((key) => newSelection.add(key)); // Add new keys but keep existing selections
      return newSelection;
    });
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
  const logMapping = useMemo(() => {
    const mapping: Record<string, ConsoleLog> = {};
    functionKeys.forEach((key) => {
      chartData[key].forEach((d) => {
        if (d.log.type === "console.log") {
          mapping[d.log.logId] = d.log;
        }
      });
    });
    return mapping;
  }, [chartData, functionKeys]);

  useEffect(() => {
    if (chartComponentRef.current) {
      const chart = chartComponentRef.current.chart;

      functionKeys.forEach((key) => {
        // Find existing series in Highcharts
        const lineSeries = chart.series.find((s) => s.name === `${key}-line`);
        const scatterSeries = chart.series.find((s) => s.name === `${key}-scatter`);

        const sortedData = [...chartData[key]].sort((a, b) => a.timestamp - b.timestamp);

        const lineData = isRuntimeContext
          ? sortedData.filter((d) => d.log.type !== "console.log")
            .map((d) => [d.timestamp, d.value])
          : [];

        const scatterData = sortedData
          .filter((d) => d.log.type === "console.log")
          .map((d) => ({
            x: d.timestamp,
            y: d.value,
            id: d.log.type === "console.log" ? d.log.logId : "",
          }));

        // **Update existing series or create new ones**
        if (lineSeries) {
          lineSeries.setData(lineData, false);
        } else {
          chart.addSeries(
            {
              name: `${key}-line`,
              type: "line",
              step: "left",
              data: lineData,
              marker: { symbol: "rectangle", radius: 3, fillColor: "white" },
              enableMouseTracking: false,
            },
            false
          );
        }

        if (scatterSeries) {
          scatterSeries.setData(scatterData, false);
        } else {
          chart.addSeries(
            {
              name: `${key}-scatter`,
              type: "scatter",
              data: scatterData,
              marker: { symbol: "circle", radius: 3, fillColor: "#FF0000" },
              dataLabels: {
                enabled: !isRuntimeContext, // Show logs only when `isRuntimeContext` is false
                align: "left",
                verticalAlign: "middle",
                formatter: function () {
                  if ((this as any).id && logMapping[(this as any).id]) {
                    const logOutput = logMapping[(this as any).id].logData
                      .map(d => JSON.stringify(d))
                      .join(" ");
                    return logOutput.length > 100 ? `${logOutput.substring(0, 100)}...` : logOutput;
                  }
                  return "";
                },
              },
            },
            false
          );
        }
        if (scatterSeries) {
          scatterSeries.update(
            {
              dataLabels: {
                enabled: !isRuntimeContext, // ✅ Ensure labels update dynamically
              },
              type: "scatter"
            },
            false
          );
        }
      });

      chart.redraw(); // Apply updates without full re-render
    }
  }, [chartData, functionKeys, isRuntimeContext, logMapping]);

  // Build final Highcharts config
  const chartOptions: Highcharts.Options = useMemo(() => {
    return {
      boost: {
        enabled: true,
        seriesThreshold: 200,
      },
      chart: {
        spacing: [0, 0, 0, 0],
        type: "stockChart", // <-- This is important
        backgroundColor: "#1e1e1e",
        zooming: {
          type: "x"
        },
        panning: {
          enabled: true,
          type: "x"
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
        type: "linear",
        crosshair: { snap: false },
        tickLength: 0,
        min: range[0],
        startOnTick: false,
        ordinal: false,
        endOnTick: false,
        max: range[1],
        tickAmount: 10,
        lineColor: "#FFFFFF",
        tickColor: "#FFFFFF",
        events: {
          setExtremes: function (e) {
            if (e.trigger !== "syncExtremes") { // Prevent feedback loop
              const thisChart = this.chart;
              Highcharts.charts.forEach(function (chart) {
                if (chart !== thisChart) {
                  if (chart && chart.xAxis[0].setExtremes !== null) {
                    chart.xAxis[0].setExtremes(
                      e.min,
                      e.max,
                      undefined,
                      false,
                      { trigger: "syncExtremes" }
                    );
                  }
                }
              });
            }
          }
        }
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
    };
  }, [range, setRange, yPlotBands]);


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
      <ToggleButtonGroup
        size="small"
        orientation="vertical"
        color="primary"
        value={isRuntimeContext}
        exclusive
        style={{ position: "absolute", left: "-40px" }}
        onChange={handleChange}
        aria-label="Platform"
      >
        <ToggleButton value={false}>Line</ToggleButton>
        <ToggleButton value={true}>Log</ToggleButton>
      </ToggleButtonGroup>
      <HighchartsReact
        ref={chartComponentRef}
        highcharts={Highcharts}
        allowChartUpdate={true}
        constructorType={"stockChart"}
        options={chartOptions}
        containerProps={{ style: { height: "100%", width: "100%" } }}
      />
    </div>
  );
}