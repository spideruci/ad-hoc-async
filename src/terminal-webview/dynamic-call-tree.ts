import type { Log } from "../types/message";

export type LogNode = Log & {
  children: LogNode[];
  associatedLogs: Log[];
};
export interface AbstractNode {
  filename: string;
  functionName: string;
  children: AbstractNode[];
  callCount: number;
  consoleLogLines: Set<number>; // Tracks unique console.log line numbers
}


export class DynamicCallTree {
  private nodeMap = new Map<string, LogNode>();
  private roots: LogNode[] = [];

  private abstractRoots: AbstractNode[] = [];
  private abstractNodeMap = new Map<string, AbstractNode>();

  public appendNode(log: Log): LogNode[] {
    if (log.type === "functionStart") {
      return this.handleFunctionStart(log);
    } else {
      this.associateLogWithCurrent(log);
      return this.roots;
    }
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
    this.updateAbstractTreeOnAdd(newNode, parentNode);
    return this.roots;
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
      const abstractNode = this.abstractNodeMap.get(nodeKey);
      if (abstractNode) {
        abstractNode.consoleLogLines.add(log.lineNumber);
      }
    }
    currentFunctionNode.associatedLogs.push(log);
  }
  

  public getRoots(): LogNode[] {
    return this.roots;
  }

  public getAbstractedTree(): AbstractNode[] {
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

  private updateAbstractTreeOnAdd(
    node: LogNode,
    parentNode: LogNode | undefined
  ): void {
    const { filename, functionName } = node;
    const nodeKey = `${filename}||${functionName}`;
  
    if (this.abstractNodeMap.has(nodeKey)) {
      // If the node already exists, increment its call count
      const existingNode = this.abstractNodeMap.get(nodeKey);
      if (existingNode) {
        existingNode.callCount += 1;
      }
    } else {
      // If the node doesn't exist, create it with a call count of 1
      const newAbstractNode: AbstractNode = {
        filename,
        functionName,
        children: [],
        callCount: 1,
        consoleLogLines: new Set<number>(), // Initialize the Set
      };
  
      if (parentNode) {
        const parentKey = `${parentNode.filename}||${parentNode.functionName}`;
        const parentAbstract = this.abstractNodeMap.get(parentKey);
  
        if (!parentAbstract) {
          throw new Error(`Abstract parent node not found for ${parentKey}`);
        }
  
        parentAbstract.children.push(newAbstractNode);
      } else {
        // Root node
        this.abstractRoots.push(newAbstractNode);
      }
  
      this.abstractNodeMap.set(nodeKey, newAbstractNode);
    }
  }
  
}
