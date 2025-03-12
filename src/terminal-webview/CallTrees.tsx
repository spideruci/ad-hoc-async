// this component is responsible for rendering the call trees
// it takes dynamic-call-tree as a prop and renders the call tree through the abstracted tree node {AbstractedNode}

import React, { useEffect, useState } from "react";
import type { DynamicCallTree } from "./dynamic-call-tree";
import { SortableTree } from "./components/SortableTree";
import convertAbstractNodeToTreeItem from "./components/utils/convertAbstractNodeToTreeItem";

export interface CallTreesProps {
  dynamicCallTree: DynamicCallTree;
}
// use SortableTree.tsx to render the call trees
const CallTrees: React.FC<CallTreesProps> = ({ dynamicCallTree }) => {

  const [abstractRoots, setAbstractRoots] = useState(
    dynamicCallTree.getAbstractedTrees().map(convertAbstractNodeToTreeItem)
  );

  useEffect(() => {
    setAbstractRoots(dynamicCallTree.getAbstractedTrees().map(convertAbstractNodeToTreeItem));
  }, [dynamicCallTree]);

  return (
    <div style={{ display: "flex" }}>
      <div>
        <h3>Original Tree</h3>
        <SortableTree defaultItems={abstractRoots} collapsible originalTree={dynamicCallTree}/>
      </div>
    </div>
  );
};

export default CallTrees;
