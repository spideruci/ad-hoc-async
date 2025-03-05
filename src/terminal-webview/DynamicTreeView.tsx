import type { INode } from "react-accessible-treeview";
import TreeView from "react-accessible-treeview";
import type { IFlatMetadata } from "react-accessible-treeview/dist/TreeView/utils";
import { Chip } from "@mui/material";
import type { AbstractNode, DynamicCallTree } from "./dynamic-call-tree";
import "./tree.css";
// Utility to extract the filename (last part of the path)
function getFilenameOnly(fullpath: string): string {
  return fullpath.split("/").pop() || fullpath; // Fallback to fullpath if split fails
}
// Convert the abstract node tree to the format TreeView expects
function convertToTreeData(
  node: AbstractNode,
  parentId: string | null = null
): INode<IFlatMetadata>[] {
  const { filename, functionName, children, callCount, consoleLogLines } = node;
  const nodeId = `${filename}||${functionName}`;
  const treeNode = {
    id: nodeId,
    name: functionName,
    parent: parentId,
    metadata: {
      filename: getFilenameOnly(filename),
      callCount,
      consoleLogCount: consoleLogLines.size, // Number of unique console.log lines
    },
    children: children.map(
      (child) => `${child.filename}||${child.functionName}`
    ),
  };
  return [
    treeNode,
    ...children.flatMap((child) => convertToTreeData(child, nodeId)),
  ];
}

const AbstractTreeView = ({
  dynamicCallTree,
}: {
  dynamicCallTree: DynamicCallTree;
}): JSX.Element => {
  const abstractedTrees = dynamicCallTree.getAbstractedTree();
  const virtualRoot = {
    id: "virtual-root",
    name: "Root",
    parent: null,
    children: abstractedTrees.map(
      (root) => `${root.filename}||${root.functionName}`
    ),
  };

  const treeData = [
    virtualRoot,
    ...abstractedTrees.flatMap((root) =>
      convertToTreeData(root, virtualRoot.id)
    ),
  ];

  return (
    <div className="call-tree">
      <TreeView
        data={treeData}
        aria-label="Abstract Function Call Tree"
        nodeRenderer={({ element, getNodeProps, level }) => (
          <div
            {...getNodeProps()}
            style={{
              paddingLeft: 5 * (level - 1),
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.75rem", // smaller text
            }}
          >
            <span>{element.name}</span>
            {element.metadata?.filename && (
              <Chip
                label={element.metadata.filename}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: "0.6rem", // smaller font
                  height: "16px", // smaller height
                  padding: "0 2px", // tighter padding
                }} />
            )}
            {element.metadata?.callCount !== undefined && (
              <Chip
                label={`Calls: ${element.metadata.callCount}`}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: "0.6rem", // smaller font
                  height: "16px", // smaller height
                  padding: "0 2px", // tighter padding
                }} />
            )}
            {element.metadata?.consoleLogCount !== undefined && (
              <Chip
                label={`Logs: ${element.metadata.consoleLogCount}`}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: "0.6rem", // smaller font
                  height: "16px", // smaller height
                  padding: "0 2px", // tighter padding
                }} />
            )}
          </div>
        )}
      />
    </div>
  );
};

export default AbstractTreeView;
