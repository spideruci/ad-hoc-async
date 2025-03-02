import type { Log } from "../types/message";

export type LogNode = Log & {
  children: LogNode[];
  associatedLogs: Log[];
};

export interface AbstractNode {
  filename: string;
  functionName: string;
  children: AbstractNode[];
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
      return this.roots; // Skip duplicates
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
  ) {
    const { filename, functionName } = node;

    const nodeKey = `${filename}||${functionName}`;

    if (parentNode) {
      const parentKey = `${parentNode.filename}||${parentNode.functionName}`;
      const parentAbstract = this.abstractNodeMap.get(parentKey);

      if (!parentAbstract) {
        throw new Error(`Abstract parent node not found for ${parentKey}`);
      }

      if (!this.abstractNodeMap.has(nodeKey)) {
        const newAbstractNode: AbstractNode = {
          filename,
          functionName,
          children: [],
        };
        parentAbstract.children.push(newAbstractNode);
        this.abstractNodeMap.set(nodeKey, newAbstractNode);
      }
    } else {
      // Root node
      if (!this.abstractNodeMap.has(nodeKey)) {
        const newRoot: AbstractNode = { filename, functionName, children: [] };
        this.abstractRoots.push(newRoot);
        this.abstractNodeMap.set(nodeKey, newRoot);
      }
    }
  }
}
