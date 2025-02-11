import React, { useState, useCallback, useEffect } from "react";
import type { ResizeEndEvent, Range } from "dnd-timeline";
import { TimelineContext } from "dnd-timeline";
import type { Log } from "../../types/message";
import CustomTimeline from "./CustomTimeline";

interface TimelineProps {
  logs: Log[];
  startLine: number;
  endLine: number;
}

const getDefaultRange = (logs: Log[]): Range => {
  if (logs.length === 0) {
    return {
      start: 0,
      end: 1,
    };
  }

  const minTimestamp = Math.min(...logs.map((log) => log.timestamp));
  const maxTimestamp = Math.max(...logs.map((log) => log.timestamp));

  return {
    start: minTimestamp,
    end: maxTimestamp + 1000, // Add a small buffer to ensure visibility
  };
};

const Timeline: React.FC<TimelineProps> = ({ logs, startLine, endLine }) => {
  const [range, setRange] = useState(getDefaultRange(logs));

  const [items, setItems] = useState(
    logs
      .filter((log) => log.lineNumber >= startLine && log.lineNumber <= endLine)
      .map((log, index) => ({
        id: `log-${index}`,
        rowId: `row-${log.lineNumber}`,
        span: {
          start: log.timestamp,
          end: log.timestamp + 10,
        },
        data: log,
      }))
  );

  useEffect(() => {
    setItems(
      logs
        .filter(
          (log) => log.lineNumber >= startLine && log.lineNumber <= endLine
        )
        .map((log, index) => ({
          id: `log-${index}`,
          rowId: `row-${log.lineNumber}`,
          span: {
            start: log.timestamp,
            end: log.timestamp + 10,
          },
          data: log,
        }))
    );
    setRange(getDefaultRange(logs));
  }, [logs, startLine, endLine]);
  const rows = Array.from(
    new Set(
      logs
        .filter(
          (log) => log.lineNumber >= startLine && log.lineNumber <= endLine
        )
        .map((log) => log.lineNumber)
    )
  ).map((lineNumber) => ({
    id: `row-${lineNumber}`,
    lineNumber: lineNumber,
  }));

  const onResizeEnd = useCallback((event: ResizeEndEvent) => {
    const updatedSpan =
      event.active.data.current.getSpanFromResizeEvent?.(event);
    if (!updatedSpan) {
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === event.active.id ? { ...item, span: updatedSpan } : item
      )
    );
  }, []);

  return (
    <div style={{ height: "100%", width: "100%", pointerEvents: "auto" }}>
      <TimelineContext
        range={range}
        onRangeChanged={setRange}
        onResizeEnd={onResizeEnd}
      >
        <CustomTimeline rows={rows} items={items} />
      </TimelineContext>
    </div>
  );
};

export default Timeline;
