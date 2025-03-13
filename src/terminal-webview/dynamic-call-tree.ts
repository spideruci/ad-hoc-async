import type { Log } from "../types/message";

export type LogNode = Log & {
  children: LogNode[];
  associatedLogs: Log[];
};

export type AbstractNode = {
  key: string;
  filename: string;
  functionName: string;
  children: AbstractNode[];
  parentId: null | string;
  callCount: number;
  type: "function" | "log";
  name: string;
  lineNumber?: number;
};

export class DynamicCallTree {
  private nodeMap = new Map<string, LogNode>();
  private roots: LogNode[] = [];

  private abstractRoots: AbstractNode[] = [];
  private abstractNodeMap = new Map<string, AbstractNode>();

  private originalAbstractRoots: AbstractNode[] = [];
  private originalAbstractNodeMap = new Map<string, AbstractNode>(); // Track original locations
  
  public appendNode(log: Log): LogNode[] {
    if (log.type === "functionStart") {
      const updatedNodes = this.handleFunctionStart(log);
      this.createAbstractedTree();
      return updatedNodes;
    } else {
      this.associateLogWithCurrent(log);
      this.createAbstractedTree();
      return this.roots;
    }
  }

  public getOriginalParentId(uuid: string): string | null {
    return this.originalAbstractNodeMap.get(uuid)?.parentId || null;
  }

  private handleFunctionStart(log: Log): LogNode[] {
    if (this.nodeMap.has(log.currentUUID)) {
      return this.roots;
    }

    const newNode: LogNode = { ...log, children: [], associatedLogs: [] };
    this.nodeMap.set(log.currentUUID, newNode);

    const parentNode = this.nodeMap.get(log.parentUUID);

    if (parentNode) {
      parentNode.children.push(newNode);
    } else {
      this.roots.push(newNode); // If no parent, it's a root node
    }
    this.associateLogWithCurrent(log);
    this.updateOriginalAbstractTreeOnAdd(newNode, parentNode);
    return this.roots;
  }

  private createAbstractedTree(): void {
    // deep clone the original abstract tree to the abstract tree
    const that = this;
    this.abstractNodeMap = new Map<string, AbstractNode>();
    function deepCloneAbstractNode(node: AbstractNode): AbstractNode {
      // update the abstractNodeMap as well
      const cloneNode = {
        key: node.key,
        filename: node.filename,
        functionName: node.functionName,
        children: node.children.map((child) => {
          return deepCloneAbstractNode(child);
        }),
        name: node.name,
        parentId: node.parentId,
        callCount: node.callCount,
        type: node.type,
        lineNumber: node.lineNumber,
      };
      that.abstractNodeMap.set(cloneNode.key, cloneNode);
      return cloneNode;
    }

    this.abstractRoots = this.originalAbstractRoots.map((root) => {
      return deepCloneAbstractNode(root);
    });
  }

  private associateLogWithCurrent(log: Log): void {
    const currentFunctionNode = this.nodeMap.get(log.currentUUID);
    if (!currentFunctionNode) {
      console.warn(
        `Log ${log.currentUUID} has no active function with UUID=${log.currentUUID}`
      );
      return;
    }
    
    if (log.type === "console.log") {
      const nodeKey = `${currentFunctionNode.filename}||${currentFunctionNode.functionName}`;
      let originalAbstractNode = this.originalAbstractNodeMap.get(nodeKey)!;

      
      const logKey = `${nodeKey}||${log.lineNumber}`;
      let logNode = this.originalAbstractNodeMap.get(logKey);
      if (!logNode) {
        logNode = {
          key: logKey,
          filename: currentFunctionNode.filename,
          functionName: currentFunctionNode.functionName,
          children: [],
          callCount: 0,
          name: log.consoleLogText, // TODO: update this to a better name with actual console.log contents
          type: "log",
          parentId: nodeKey,
          lineNumber: log.lineNumber,
        };
        originalAbstractNode.children.push(logNode);
        this.originalAbstractNodeMap.set(logKey, logNode);
      }
      logNode.callCount += 1;
    }
    currentFunctionNode.associatedLogs.push(log);
  }
  
  splitAbstractedTreesBySubtreeId(key: string): void {
    // Split the abstracted trees by the subtree id
    // find the subtree with the given key
    const subtree = this.abstractNodeMap.get(key);
    if (!subtree) {
      throw new Error(`Subtree with key ${key} not found.`);
    }
    // remove the subtree from the parent
    // traverse all the roots in the abstracted tree
    // find the parent of the subtree
    let parent: AbstractNode | undefined;
    for (let i = 0; i < this.abstractRoots.length; i++) {
      const root = this.abstractRoots[i];
      if (this.findAndRemoveSubtree(root, subtree)) {
        parent = root;
        break;
      }
    }
    if (!parent) {
      throw new Error(`Parent of the subtree with key ${key} not found.`);
    }
    // create a new abstracted tree with the subtree as the root
    // add the new abstracted tree to the list of abstracted trees
    this.abstractRoots.push(subtree);
  }
  
  mergeTwoAbstractedTrees(root1: string, root2: string): AbstractNode | AbstractNode[] {
    // this function will merge the tree based on the original abstracted trees location
    // if one of the trees is a subtree of the other, then we merge one of them under the other, and return the new tree
    // if they are siblings, then we do not merge them but return two separate trees
    // if they are not related, then we return the original trees
    const originalSubtree1 = this.originalAbstractNodeMap.get(root1);
    if (!originalSubtree1) {
      throw new Error(`Subtree with key ${root1} not found.`);
    }
    const originalSubtree2 = this.originalAbstractNodeMap.get(root2);
    if (!originalSubtree2) {
      throw new Error(`Subtree with key ${root2} not found.`);
    }
  
    const abstractedTree1 = this.abstractNodeMap.get(root1);
    if (!abstractedTree1) {
      throw new Error(`Abstracted tree with key ${root1} not found.`);
    }
    const abstractedTree2 = this.abstractNodeMap.get(root2);
    if (!abstractedTree2) {
      throw new Error(`Abstracted tree with key ${root2} not found.`);
    }
  
    // remove the two subtrees from the list of abstracted trees
    this.abstractRoots = this.abstractRoots.filter((root) => root.key !== root1 && root.key !== root2);
    const findParent = (node: AbstractNode, target: AbstractNode): AbstractNode | undefined => {
      for (const child of node.children) {
        if (child.key === target.key) {
          return node;
        }
        const found = findParent(child, target);
        if (found) {
          return found;
        }
      }
      return undefined;
    };
    // check if root1 is a subtree of root2
    if (this.findSubtree(originalSubtree2, originalSubtree1)) {
      // if root1 is originally a subtree of root2, then root2 is the new root
      this.abstractRoots.push(abstractedTree2);
      // now we need to figure out the original location of the subtree1 in the originalSubtree2
      // find the parent of the subtree1 in the originalSubtree2 and add it to the children of that node
      let parent: AbstractNode | undefined;

      parent = findParent(originalSubtree2, originalSubtree1);
      if (parent) {
        const abstractParent = this.abstractNodeMap.get(parent.key);
        if (abstractParent) {
          abstractParent.children.push(abstractedTree1);
        } else {
          throw new Error(`Abstract parent node with key ${parent.key} not found.`);
        }
      } else {
        throw new Error(`Parent of the subtree with key ${root1} not found in ${root2}.`);
      }
      return abstractedTree2;
    } else if (this.findSubtree(originalSubtree1, originalSubtree2)) {
      // if root2 is originally a subtree of root1, then root1 is the new root
      this.abstractRoots.push(abstractedTree1);
      // now we need to figure out the original location of the subtree2 in the originalSubtree1
      // find the parent of the subtree2 in the originalSubtree1 and add it to the children of that node
      let parent: AbstractNode | undefined;
      parent = findParent(originalSubtree1, originalSubtree2);
      if (parent) {
        const abstractParent = this.abstractNodeMap.get(parent.key);
        if (abstractParent) {
          abstractParent.children.push(abstractedTree2);
        } else {
          throw new Error(`Abstract parent node with key ${parent.key} not found.`);
        }
      } else {
        throw new Error(`Parent of the subtree with key ${root2} not found in ${root1}.`);
      }
      return abstractedTree1;
    } else {
      // if they are not related, then we return the original trees
      this.abstractRoots.push(abstractedTree1);
      this.abstractRoots.push(abstractedTree2);
      return [abstractedTree1, abstractedTree2];
    }
  }

  private findSubtree(root: AbstractNode, subTree: AbstractNode): boolean {
    if (root.key === subTree.key) {
      return true;
    }
    for (let i = 0; i < root.children.length; i++) {
      const child = root.children[i];
      if (this.findSubtree(child, subTree)) {
        return true;
      }
    }
    return false;
  }

  // findAndRemoveSubtree is a recursive function that traverses the tree and removes the subtree with the given key
  private findAndRemoveSubtree(node: AbstractNode, subtree: AbstractNode): boolean {
    if (node === subtree) {
      return true;
    }
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (this.findAndRemoveSubtree(child, subtree)) {
        node.children.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  public getRoots(): LogNode[] {
    return this.roots;
  }

  public getAbstractedTrees(): AbstractNode[] {
    return this.abstractRoots;
  }

      

  public getLogsWithinTheFunctionCall(uuid: string): Log[] {
    const node = this.nodeMap.get(uuid);
    if (!node) {
      throw new Error(`Function call with UUID ${uuid} not found.`);
    }
    return node.associatedLogs;
  }

  public getSubtree(uuid: string): LogNode | null {
    const node = this.nodeMap.get(uuid);
    if (!node) {
      return null;
    }
    return this.deepCloneNode(node);
  }

  private deepCloneNode(node: LogNode): LogNode {
    return {
      ...node,
      children: node.children.map((child) => this.deepCloneNode(child)),
      associatedLogs: [...node.associatedLogs],
    };
  }

  private updateOriginalAbstractTreeOnAdd(
    node: LogNode,
    parentNode: LogNode | undefined
  ): void {
    const { filename, functionName } = node;
    const nodeKey = `${filename}||${functionName}`;
  
    if (this.originalAbstractNodeMap.has(nodeKey)) {
      const existingNode = this.originalAbstractNodeMap.get(nodeKey);
      if (existingNode) {
        existingNode.callCount += 1;
      }
    } else {
      const newAbstractNode: AbstractNode = {
        key: nodeKey,
        filename,
        functionName,
        parentId: parentNode ? `${parentNode.filename}||${parentNode.functionName}` : null,
        children: [],
        callCount: 1,
        name: functionName,
        type: "function",
      };
  
      if (parentNode) {
        const parentKey = `${parentNode.filename}||${parentNode.functionName}`;
        const parentAbstract = this.originalAbstractNodeMap.get(parentKey);
  
        if (!parentAbstract) {
          throw new Error(`Abstract parent node not found for ${parentKey}`);
        }
  
        parentAbstract.children.push(newAbstractNode);
      } else {
        this.originalAbstractRoots.push(newAbstractNode);
      }
  
      this.originalAbstractNodeMap.set(nodeKey, newAbstractNode);
    }
  }
}

