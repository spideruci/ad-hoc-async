import React from "react";
import { useItem } from "dnd-timeline";
import type { Span } from "dnd-timeline";

interface ItemProps {
  id: string;
  span: Span;
  data: any;
}

const Item: React.FC<ItemProps> = (props: ItemProps) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    itemStyle,
    itemContentStyle,
  } = useItem({
    id: props.id,
    span: props.span,
  });
  return (
    <div
      ref={setNodeRef}
      style={itemStyle}
      {...listeners}
      {...attributes}
    >
      <div style={itemContentStyle}>
        {"hi"}
      </div>
    </div>
  );
};
export default Item;
