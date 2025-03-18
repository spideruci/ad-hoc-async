import type { CSSProperties } from "react";
import type { AnimateLayoutChanges} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { UniqueIdentifier } from "@dnd-kit/core";

import type { Props as TreeItemProps } from "./TreeItem";
import { TreeItem } from "./TreeItem";
import { iOS } from "./utils/utilities";
import type { AbstractNode } from "../dynamic-call-tree";

const animateLayoutChanges: AnimateLayoutChanges = ({
  isSorting,
  wasDragging,
}) => (isSorting || wasDragging ? false : true);

/**
 * Properties expected by the SortableTreeItem component.
 */
interface Props extends TreeItemProps {
  /**
   * Unique identifier for the item that we're representing here.
   */
  id: UniqueIdentifier;
  isDraggable: boolean;
  data?: AbstractNode;
}

/**
 * A smart component for representing an item in the tree-view.
 *
 * Uses the `useSortable` dnd-kit hook to create the item and renders
 * the TreeItem with provided data.
 */
export function SortableTreeItem({ id, isDraggable, depth, data, ...props }: Props) {
  const {
    attributes,
    isDragging,
    isSorting,
    listeners,
    setDraggableNodeRef,
    setDroppableNodeRef,
    transform,
    transition,
  } = useSortable({
    id,
    animateLayoutChanges,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <TreeItem
      ref={setDraggableNodeRef}
      wrapperRef={setDroppableNodeRef}
      style={style}
      isDraggable={isDraggable}
      depth={depth}
      ghost={isDragging}
      data={data}
      disableSelection={iOS}
      disableInteraction={isSorting}
      handleProps={{
        ...attributes,
        ...listeners,
      }}
      {...props}
    />
  );
}
