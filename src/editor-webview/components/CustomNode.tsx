import type { Node, NodeProps } from "@xyflow/react";
import type { Log } from "../../types/message";

type CustomNodeData = Node<Log, "customNode">;
const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({data}: NodeProps<CustomNodeData> ) => {
  if (data.type === "statement") {
    return (
      <>
        <div style={{ height: "20px", width: "20px", background: "white"}}>O</div>
      </>
    );
  } else if (data.type === "console.log") {
    return (
      <>
        <div style={{ height: "20px", background: "white" }} data-it="test">
          {data.logData.map((datum: any) => String(datum))}
        </div>
      </>
    );
  } else if (data.type === "branch") {
    return (
      <>
        <div style={{ height: "20px", width: "20px", background: "white" }} >T</div>
      </>
    );
  }
};

export default CustomNode;