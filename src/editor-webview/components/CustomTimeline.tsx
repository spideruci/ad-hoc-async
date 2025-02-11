import React from "react";
import { useTimelineContext, useItem } from "dnd-timeline";
import Item from "./dnd-timeline-components/Item";
import Row from "./dnd-timeline-components/Row";

interface CustomTimelineProps {
  rows: { id: string; lineNumber: number }[];
  items: {
    id: string;
    rowId: string;
    span: { start: number; end: number };
    data: any;
  }[];
}

const CustomTimeline: React.FC<CustomTimelineProps> = ({ rows, items }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {rows.map((row) => (
        <Row key={row.id} id={row.id} lineNumber={row.lineNumber}>
          {items.filter((item) => item.rowId === row.id).map((item) => (
            <Item key={item.id} id={item.id} span={item.span} data={item.data} />
          ))}
        </Row>
      ))}
    </div>
  );
};


export default CustomTimeline;
