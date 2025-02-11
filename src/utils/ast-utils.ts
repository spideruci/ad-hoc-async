import type { TSESTree } from "@typescript-eslint/typescript-estree";

export type NodeWithParent = TSESTree.Node & { parent: TSESTree.Node | undefined };
function _findAllDownward(
  current: TSESTree.Node,
  targetFunc: (node: TSESTree.Node) => boolean,
  targets: TSESTree.Node[] = [],
  visited: WeakSet<TSESTree.Node> = new WeakSet()
): void {
  if (!current || typeof current !== "object") {
    return;
  }
  if (visited.has(current)) {
    return;
  }
  if (targetFunc(current)) {
    targets.push(current);
  }
  visited.add(current);
  for (const key in current) {
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      const value = (current as TSESTree.Node)[key as keyof TSESTree.Node];
      if (Array.isArray(value)) {
        value.forEach((child) => {
          if (child && typeof child === "object" && "type" in child) {
            _findAllDownward(child, targetFunc, targets, visited);
          }
        });
      } else if (value && typeof value === "object" && "type" in value) {
        _findAllDownward(value, targetFunc, targets, visited);
      }
    }
  }
}

function _findOneUpward(
  current: NodeWithParent,
  targetFunc: (node: TSESTree.Node) => boolean
): TSESTree.Node | undefined {
  let currentNode: TSESTree.Node | undefined = current;
  const visited = new Set<TSESTree.Node>(); // Track visited nodes to detect cycles

  while (currentNode) {
    if (targetFunc(currentNode)) {
      return currentNode;
    }
    if (visited.has(currentNode)) {
      return undefined;
    }
    visited.add(currentNode);

    currentNode = (currentNode as NodeWithParent)?.parent;
  }
  return undefined;
}

export const isConsoleLogNode = (node: TSESTree.Node): boolean =>
  node.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  node.callee.object?.type === "Identifier" &&
  node.callee.object.name === "console" &&
  node.callee.property?.type === "Identifier" &&
  node.callee.property.name === "log";

export const isFunctionNodes = (node: TSESTree.Node): boolean =>
  node.type === "FunctionDeclaration" ||
  node.type === "FunctionExpression" ||
  node.type === "ArrowFunctionExpression";

export function findAllTargetChildNodes(
  node: TSESTree.Node,
  targetFunc: (node: TSESTree.Node) => boolean
): TSESTree.Node[] {
  const results: TSESTree.Node[] = [];
  if (!node || typeof node !== "object") {
    return results;
  }
  _findAllDownward(node, targetFunc, results);
  return results;
}

export function assignParents(
  node: TSESTree.Node,
  parent: TSESTree.Node | undefined = undefined,
  visited: WeakSet<TSESTree.Node> = new WeakSet()
): NodeWithParent | undefined {
  if (!node || typeof node !== "object" || visited.has(node)) {
    return undefined; // Prevent infinite recursion
  }
  visited.add(node);
  node.parent = parent; // Assign parent

  for (const key of Object.keys(node)) {
    // Use Object.keys to avoid prototype chain issues
    const value = (node as NodeWithParent)[key as keyof NodeWithParent];

    if (Array.isArray(value)) {
      for (const child of value as any) {
        if (child && typeof child === "object" && "type" in child) {
          assignParents(child, node, visited);
        }
      }
    } else if (value && typeof value === "object" && "type" in value) {
      assignParents(value, node, visited);
    }
  }
  return node as NodeWithParent;
}

export function findOneTargetParent(
  node: TSESTree.Node,
  targetFunc: (node: TSESTree.Node) => boolean
): TSESTree.Node | undefined {
  const result: TSESTree.Node | undefined = undefined;
  if (!node || typeof node !== "object") {
    return result;
  }
  return _findOneUpward(node, targetFunc);
}