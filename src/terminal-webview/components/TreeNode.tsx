import { useDraggable } from "@dnd-kit/core";
import type { AbstractNode } from "../dynamic-call-tree";

const TreeNode: React.FC<{ node: AbstractNode }> = ({ node }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: node.key,
  });

  const style = {
    transform: `translate3d(${transform?.x}px, ${transform?.y}px, 0)`,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {node.functionName}
      {node.children.length > 0 && (
        <div style={{ marginLeft: 20 }}>
          {node.children.map((child) => (
            <TreeNode key={child.key} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;