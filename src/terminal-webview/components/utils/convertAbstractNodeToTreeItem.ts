import type { AbstractNode } from "../../dynamic-call-tree";
import type { TreeItem } from "./types";

const convertAbstractNodeToTreeItem = (node: AbstractNode): TreeItem<AbstractNode> => {
  return {
    id: node.key,
    children: node.children.map(convertAbstractNodeToTreeItem),
    collapsed: true, // Default to false, adjust as needed
    data: node,
  };
};

export default convertAbstractNodeToTreeItem;