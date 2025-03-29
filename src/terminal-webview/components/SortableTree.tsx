/* eslint-disable indent */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Switch from "@mui/material/Switch";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";

import type {
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
  DragOverEvent,
  DropAnimation,
  Modifier,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  MeasuringStrategy,
  defaultDropAnimation,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { List } from "@mui/material";

import { SortableTreeItem } from "./SortableTreeItem";
import {
  buildTree,
  flattenTree,
  getProjection,
  getChildCount,
  removeItem,
  removeChildrenOf,
  setProperty,
} from "./utils/utilities";
import type {
  FlattenedItem,
  SensorContext,
  TreeItem,
  TreeItems,
} from "./utils/types";
import { sortableTreeKeyboardCoordinates } from "./utils/keyboardCoordinates";
import Placeholder from "./Placeholder";
import type { AbstractNode, DynamicCallTree } from "../dynamic-call-tree";
import type { ConsoleLog } from "../../types/message";
import { Log } from "../../types/message";
import LogOutput from "./LogOutput";

/**
 * Here we configure when and how often DndContext
 * should measure its droppable elements.
 */
const measuring = {
  droppable: {
    // Measure droppable elements before dragging begins,
    // right after dragging has begun, and after it ends.
    strategy: MeasuringStrategy.Always,
  },
};

/**
 * The animation that moves the dragged item to its new
 * or old position.
 */
const dropAnimationConfig: DropAnimation = {
  duration: defaultDropAnimation.duration,
  keyframes({ transform }) {
    return [
      {
        opacity: 1,
        transform: CSS.Transform.toString(transform.initial),
      },
      {
        opacity: 0,
        transform: CSS.Transform.toString({
          ...transform.final,
          x: transform.final.x + 5,
          y: transform.final.y + 5,
        }),
      },
    ];
  },
  easing: "ease-out",
  // This is the animation that makes the item in teh final position
  // visible again
  sideEffects({ active }) {
    active.node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: defaultDropAnimation.duration,
      easing: defaultDropAnimation.easing,
    });
  },
};

/**
 * Properties expected by the SortableTree component.
 */
interface Props {
  /**
   * Initial set of items.
   */
  defaultItems?: TreeItems<AbstractNode>;

  /**
   * The items that have children can show/hide their children.
   */
  collapsible?: boolean;

  /**
   * Horizontal padding for each depth level.
   */
  indentationWidth?: number;

  /**
   * If true a blue line indicator replaces the content of the
   * item. If false the item is shown semi-transparent.
   */
  indicator?: boolean;

  /**
   * If true each item has a remove button.
   */
  removable?: boolean;

  originalTree: DynamicCallTree;

  allLogs: ConsoleLog[];

  searchQuery: string;

  onLogDragStart: (log: ConsoleLog) => void;
}

interface TreeItemList {
  isDraggable: boolean;
  items: TreeItems<AbstractNode>;
  invocationUUID?: string;
  type?: "log" | "function";
  lineNumber?: number;
  parentListIndex?: number;
  splitLabel?: string;
}

/**
 * Tree-view component.
 */
export function SortableTree({
  collapsible,
  allLogs,
  defaultItems = [],
  indicator = false,
  indentationWidth = 50,
  searchQuery,
  originalTree,
  onLogDragStart,
}: Props): JSX.Element {
  // The items as a tree.
  const [lists, setLists] = useState<TreeItemList[]>([
    { isDraggable: true, items: [] },
  ]);
  const [splittedIDSet, setSplittedIdSet] = useState<Set<string>>(new Set());
  // Tracks the item ID that is being dragged. null if not draggin.
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [sourceListIndex, setSourceListIndex] = useState<number | null>(null);
  const [gatherToTop, setGatherToTop] = useState(true); // State to control the visibility of the div
  const logRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [matchedIndices, setMatchedIndices] = useState<number[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && matchedIndices.length > 0) {
        const nextIdx = (currentMatchIdx + 1) % matchedIndices.length;
        setCurrentMatchIdx(nextIdx);
        const el = logRefs.current[matchedIndices[nextIdx]];
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [matchedIndices, currentMatchIdx]);

  useEffect(() => {
    const matches: number[] = [];

    allLogs.forEach((log, idx) => {
      const msg = String(log.logData[0] ?? "").toLowerCase();
      if (searchQuery && msg.includes(searchQuery.toLowerCase())) {
        matches.push(idx);
      }
    });

    setMatchedIndices(matches);
    setCurrentMatchIdx(0);
  }, [searchQuery, allLogs]);

  const flattenedLists = useMemo(
    () =>
      lists.map((list) => {
        const flattenedTree = flattenTree(list.items);

        // Get a list of collapsed item IDs
        const collapsedItems = flattenedTree.reduce<UniqueIdentifier[]>(
          (acc, { children, collapsed, id }) =>
            collapsed && children.length ? [...acc, id] : acc,
          []
        );

        // Remove children of collapsed items
        return removeChildrenOf(
          flattenedTree,
          activeId ? [activeId, ...collapsedItems] : collapsedItems
        );
      }),
    [activeId, lists]
  );

  const rootItemsPerLists = useMemo(
    () =>
      lists.map((list) =>
        list.items.map((i) => {
          return {
            type: i.data?.type,
            key: i.data?.key,
            name:
              i.data?.type === "function"
                ? i.data.functionName
                : i.data?.functionName + ":" + i.data?.lineNumber,
          };
        })
      ),
    [lists]
  );

  const flattenedAllItemSets = useMemo(
    () =>
      lists
        .map((l) => flattenTree(l.items))
        .map(
          (l) =>
            new Set(
              l
                .map((i) => i.data)
                .filter((i) => i?.type === "log")
                .map((i) => i?.key)
                .flat()
            )
        ),
    [activeId, lists]
  );

  const removeList = (
    log?: ConsoleLog,
    invocationUUID?: string,
    type?: "log" | "function"
  ) => {
    if (!invocationUUID || !type) {
      return;
    }
    if (type === "log") {
      const toRemoved = invocationUUID + log?.lineNumber;
      setSplittedIdSet((prevSet) => {
        const newSet = new Set([...prevSet]);
        newSet.delete(toRemoved);
        return newSet;
      });
    } else {
      setSplittedIdSet((prevSet) => {
        const toRemoved = invocationUUID;
        const newSet = new Set([...prevSet]);
        newSet.delete(toRemoved);
        return newSet;
      });
    }
    setLists((prevLists) => {
      const newLists = JSON.parse(JSON.stringify(prevLists)) as TreeItemList[];
      const filteredLists = newLists.filter(
        (x: any) => x.invocationUUID !== invocationUUID
      );
      return filteredLists;
    });

    setHoveredLabelId("");
    setGhostModeHoveredId("");
  };

  const clickLabel = (
    log: ConsoleLog,
    listIndex: number,
    invocationUUID?: string,
    type?: "log" | "function",
    splitLabel?: string
  ) => {
    if (!invocationUUID || !type) {
      return;
    }
    // we need to add a new list next to the listIndex
    if (type === "log") {
      setSplittedIdSet(
        (prevSet) => new Set([...prevSet, invocationUUID + log.lineNumber])
      );
    } else {
      setSplittedIdSet((prevSet) => new Set([...prevSet, invocationUUID]));
    }
    setLists((prevLists) => {
      const newLists = JSON.parse(JSON.stringify(prevLists)) as TreeItemList[];
      const newItem = JSON.parse(
        JSON.stringify(prevLists[listIndex])
      ) as TreeItemList;
      newItem.items.forEach((i) => {
        i.id = i.id + invocationUUID;
      });
      newItem.isDraggable = false;
      newLists.splice(listIndex + 1, 0, newItem);
      newItem.invocationUUID = invocationUUID;
      newItem.type = type;
      newItem.parentListIndex = listIndex;
      newItem.splitLabel = splitLabel;
      if (type === "log") {
        newItem.lineNumber = log.lineNumber;
      }
      return newLists;
    });
  };

  // The item ID that is beneath the dragged item.
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);

  // The horizontal offset of the pointer.
  const [offsetLeft, setOffsetLeft] = useState(0);

  useEffect(() => {
    if (defaultItems.length > 0) {
      setLists([
        { isDraggable: true, items: defaultItems },
        { isDraggable: true, items: [] },
      ]);
    } else {
      setLists([{ isDraggable: true, items: [] }]);
    }
    setSplittedIdSet(new Set());
  }, [defaultItems]);

  const activeFlattenedItems =
    sourceListIndex !== null ? flattenedLists[sourceListIndex] : [];
  const activeItem = activeFlattenedItems.find(({ id }) => id === activeId);
  // Compute `projected` for indentation-aware drop handling
  const projected =
    sourceListIndex !== null &&
    activeId &&
    overId &&
    (flattenedLists.flat().findIndex(({ id }) => id === overId) > 0 ||
      overId === "placeholder")
      ? getProjection(
          flattenedLists.flat(),
          activeId,
          overId,
          offsetLeft,
          indentationWidth
        )
      : null;

  const sensorContext: SensorContext<AbstractNode> = useRef({
    items: activeFlattenedItems,
    offset: offsetLeft,
  });
  const [coordinateGetter] = useState(() =>
    sortableTreeKeyboardCoordinates(sensorContext, indicator, indentationWidth)
  );
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    })
  );

  useEffect(() => {
    sensorContext.current = {
      items: flattenedLists.flat(),
      offset: offsetLeft,
    };
  }, [activeFlattenedItems, offsetLeft]);

  // Map to store label name and color pairs that have ever occurred
  const [everOccurredLabelColorMap, setEverOccurredLabelColorMap] = useState<
    Map<string, string>
  >(new Map());

  // Map to store label name and color pairs
  const [labelColorMap, setLabelColorMap] = useState<Map<string, string>>(
    new Map()
  );

  // Function to generate a random color
  const generateRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  // Function to handle pin click
  const handlePinClick = (labelName: string) => {
    setLabelColorMap((prevMap) => {
      const newMap = new Map(prevMap);
      if (newMap.has(labelName)) {
        newMap.delete(labelName);
      } else {
        let color = everOccurredLabelColorMap.get(labelName);
        if (!color) {
          color = generateRandomColor();
          setEverOccurredLabelColorMap((prevEverMap) => {
            const newEverMap = new Map(prevEverMap);
            newEverMap.set(labelName, color!);
            return newEverMap;
          });
        }
        newMap.set(labelName, color);
      }
      return newMap;
    });
  };

  const [hoveredLabelId, setHoveredLabelId] = useState<string>("");
  const [ghostModeHoveredId, setGhostModeHoveredId] = useState<string>("");

  const [invisibleIds, setInvisibleIds] = useState<Set<String>>(new Set());

  const addInvisibleIds = (collectedIds: Set<String>) => {
    setInvisibleIds((prevSet) => {
      const newSet = new Set(prevSet);
      collectedIds.forEach((id) => {
        newSet.add(id);
      });
      return newSet;
    });
  };

  const deleteInvisibleIds = (collectedIds: Set<String>) => {
    setInvisibleIds((prevSet) => {
      const newSet = new Set(prevSet);
      collectedIds.forEach((id) => {
        newSet.delete(id);
      });
      return newSet;
    });
  };

  function collectAllChildIds(item: any, collectedIds: Set<String>): void {
    if (item.data.type === "log") {
      collectedIds.add("log" + "||" + String(item.data.lineNumber));
      return;
    }

    collectedIds.add("function" + "||" + item.data.functionName);
    item?.children?.forEach((child: any) => {
      collectAllChildIds(child, collectedIds);
    });

    return;
  }

  return (
    <>
      <FormControlLabel
        control={
          <Switch
            checked={gatherToTop}
            onChange={() => setGatherToTop(!gatherToTop)}
            size="small"
            inputProps={{ "aria-label": "Show Div" }}
          />
        }
        label="Gather to the top"
        style={{
          color: "#f0f0f0",
          marginBottom: "10px",
          marginTop: "10px",
          marginLeft: "0px",
        }}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        measuring={measuring}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div style={{ display: "flex", gap: "20px", overflowX: "auto" }}>
          {flattenedLists.map((flattenedItems, listIndex) => (
            <SortableContext
              disabled={!lists[listIndex].isDraggable}
              items={
                flattenedItems.length > 0
                  ? flattenedItems.map(({ id }) => id)
                  : ["placeholder"]
              }
              strategy={verticalListSortingStrategy}
            >
              <List
                key={listIndex}
                style={{
                  width: "600px",
                  overflowX: "clip",
                  border: "1px dashed gray",
                  padding: "10px",
                  minHeight: "200px",
                }}
              >
                {flattenedItems.length === 0 ? (
                  <Placeholder></Placeholder>
                ) : (
                  flattenedItems.map((thisItem) => {
                    const { id, children, collapsed, depth, data } = thisItem;
                    let key = String(id);
                    if (!lists[listIndex].isDraggable) {
                      if (lists[listIndex].type === "function") {
                        key = key + lists[listIndex].invocationUUID;
                      } else {
                        key =
                          key +
                          lists[listIndex].invocationUUID +
                          ":" +
                          lists[listIndex].lineNumber;
                      }
                    }
                    return (
                      <SortableTreeItem
                        key={key}
                        id={key}
                        value={"" + id}
                        isDraggable={lists[listIndex].isDraggable}
                        depth={
                          id === activeId && projected ? projected.depth : depth
                        }
                        data={data}
                        indentationWidth={indentationWidth}
                        indicator={indicator}
                        collapsed={collapsed && children.length > 0}
                        onCollapse={
                          collapsible && children.length
                            ? (): void => handleCollapse(id)
                            : undefined
                        }
                        isVisible={(() => {
                          if (data?.type === "log") {
                            return !invisibleIds.has(
                              "log" + "||" + data?.lineNumber
                            );
                          } else if (data?.type === "function") {
                            return !invisibleIds.has(
                              "function" + "||" + data?.functionName
                            );
                          }
                          return true;
                        })()}
                        onVisibilityClick={() => {
                          const set = new Set<String>();
                          collectAllChildIds(thisItem, set);
                          if (
                            data?.type === "log" &&
                            !invisibleIds.has("log" + "||" + data?.lineNumber)
                          ) {
                            addInvisibleIds(set);
                          } else if (
                            data?.type === "log" &&
                            invisibleIds.has("log" + "||" + data?.lineNumber)
                          ) {
                            deleteInvisibleIds(set);
                          } else if (
                            data?.type === "function" &&
                            !invisibleIds.has(
                              "function" + "||" + data?.functionName
                            )
                          ) {
                            addInvisibleIds(set);
                          } else {
                            // data?.type === "function" && invisibleIds.has("function" + "||" + data?.functionName)
                            deleteInvisibleIds(set);
                          }
                        }}
                      />
                    );
                  })
                )}
              </List>
            </SortableContext>
          ))}
        </div>
        {createPortal(
          <DragOverlay
            dropAnimation={dropAnimationConfig}
            modifiers={indicator ? [adjustTranslate] : undefined}
          >
            {activeId && sourceListIndex !== null && activeItem ? (
              <SortableTreeItem
                isDraggable={true}
                id={activeId}
                depth={activeItem!.depth}
                clone
                data={activeItem.data}
                childCount={
                  getChildCount(lists[sourceListIndex].items, activeId) + 1
                }
                value={activeId.toString()}
                indentationWidth={indentationWidth}
              />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      <div style={{ display: "flex", gap: "20px", overflowX: "auto" }}>
        {flattenedAllItemSets.map((set, setIndex) => {
          const uuidHashList: { [functionKey: string]: string[] } = {};
          return (
            <>
              <List
                key={"log-" + setIndex}
                style={{
                  width: "600px",
                  overflowX: "clip",
                }}
              >
                {(!lists[setIndex].isDraggable &&
                  lists[setIndex].type === "function") ||
                lists[setIndex].type === "log" ? (
                  <div
                    style={{
                      fontSize: "12px",
                      height: "40px",
                      color: "#f0f0f0",
                      display: "flex",
                      flexDirection: "row",
                      opacity: 0.7,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ marginRight: "10px" }}>
                      Minimized call stacks and log outputs for the
                      <strong> {lists[setIndex].splitLabel}</strong>
                    </div>
                    <Chip
                      size="small"
                      style={{
                        fontSize: "12px",
                      }}
                      label={"Move split log(s) back"}
                      onClick={() => {
                        if (lists[setIndex].type === "function") {
                          removeList(
                            undefined,
                            lists[setIndex].invocationUUID,
                            lists[setIndex].type
                          );
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ height: "40px" }}></div>
                )}
                {allLogs
                  .sort((a, b) => a.timestamp - b.timestamp)
                  .map((log, index) => {
                    let uuid: string | undefined;
                    let sequenceId: number;
                    let name: string | undefined;
                    let type: "log" | "function" | undefined;
                    let functionKey: string | undefined;
                    rootItemsPerLists[setIndex].forEach((i) => {
                      if (i.type === "function" && !uuid) {
                        uuid =
                          originalTree.getParentLogNodeMatchingFunctionKey(
                            log.currentUUID,
                            i.key
                          )?.currentUUID ?? undefined;
                        type = i.type;
                        functionKey = i.key;
                        name = i.name;
                      } else if (i.type === "log" && i.key === getLogKey(log)) {
                        uuid = log.currentUUID;
                        type = i.type;
                        functionKey = i.key;
                        name = i.name;
                      }
                    });
                    if (uuid && functionKey! in uuidHashList) {
                      sequenceId = uuidHashList[functionKey!].length;
                      const foundIndex = uuidHashList[functionKey!].findIndex(
                        (i) => i === uuid
                      );
                      if (foundIndex < 0) {
                        uuidHashList[functionKey!] = [
                          ...uuidHashList[functionKey!],
                          uuid,
                        ];
                        name = name + " " + sequenceId;
                      } else {
                        sequenceId = foundIndex;
                        name = name + " " + sequenceId;
                      }
                    } else if (uuid) {
                      sequenceId = 0;
                      uuidHashList[functionKey!] = [uuid];
                      name = name + " " + sequenceId;
                    }

                    const pinColor = labelColorMap.get(name ?? "") ?? "#f8f8f8";

                    if (
                      invisibleIds.has("log" + "||" + log.lineNumber) ||
                      invisibleIds.has("function" + "||" + log.functionName)
                    ) {
                      return <div style={{ height: "0px" }}></div>;
                    } else if (
                      lists[setIndex].isDraggable &&
                      set.has(getLogKey(log)) &&
                      !splittedIDSet.has(uuid! + log.lineNumber) &&
                      !splittedIDSet.has(uuid!)
                    ) {
                      return (
                        <LogOutput
                          key={index}
                          log={log}
                          isOpen={false}
                          searchQuery={searchQuery}
                          label={name}
                          labelClick={(log) => {
                            clickLabel(log, setIndex, uuid, type, name);
                          }}
                          onDragStart={(log: ConsoleLog) => {
                            onLogDragStart(log);
                          }}
                          onPinClick={handlePinClick}
                          pinColor={pinColor}
                          isHighlight={
                            index === matchedIndices[currentMatchIdx]
                          }
                          forwardedRef={(el) => (logRefs.current[index] = el)}
                        />
                      );
                    } else if (
                      (!lists[setIndex].isDraggable &&
                        lists[setIndex].type === "function" &&
                        lists[setIndex].invocationUUID === uuid) ||
                      (lists[setIndex].type === "log" &&
                        lists[setIndex].invocationUUID === uuid &&
                        lists[setIndex].lineNumber === log.lineNumber)
                    ) {
                      return (
                        <LogOutput
                          key={index}
                          log={log}
                          searchQuery={searchQuery}
                          isOpen={false}
                          label={name}
                          onDragStart={(log: ConsoleLog) => {
                            onLogDragStart(log);
                          }}
                          labelClick={(log) => {
                            removeList(log, uuid, type);
                          }}
                          onPinClick={handlePinClick}
                          isHighlight={
                            index === matchedIndices[currentMatchIdx]
                          }
                          forwardedRef={(el) => (logRefs.current[index] = el)}
                          pinColor={pinColor}
                          isBackEnabled={true}
                          showBackLabel={hoveredLabelId === uuid}
                          setHoveredLabelId={() => {
                            setHoveredLabelId(uuid!);
                          }}
                          resetHoveredLabelId={() => {
                            setHoveredLabelId("");
                          }}
                        />
                      );
                    } else if (gatherToTop) {
                      return <div style={{ height: "0px" }}></div>;
                    } else if (
                      splittedIDSet.has(uuid! + log.lineNumber) ||
                      splittedIDSet.has(uuid!)
                    ) {
                      return (
                        <LogOutput
                          key={index}
                          log={log}
                          isOpen={false}
                          label={name}
                          labelClick={(log) => {
                            removeList(log, uuid, type);
                          }}
                          ghostMode={true}
                          isGhostModeHovered={ghostModeHoveredId === uuid}
                          setGhostModeHoveredId={() => {
                            setGhostModeHoveredId(uuid!);
                          }}
                          resetGhostModeHoveredId={() => {
                            setGhostModeHoveredId("");
                          }}
                        />
                      );
                    } else {
                      return <div style={{ height: "30px" }}></div>;
                    }
                  })}
              </List>
            </>
          );
        })}
      </div>
    </>
  );

  // Fires when a drag event that meets the activation constraints
  // for that sensor happens, along with the unique identifier of
  // the draggable element that was picked up.
  function handleDragStart({ active: { id: activeId } }: DragStartEvent): void {
    setActiveId(activeId);
    setOverId(activeId);
    setSourceListIndex(findListIndex(activeId));
    document.body.style.setProperty("cursor", "grabbing");
  }

  // Fires anytime as the draggable item is moved.
  // Depending on the activated sensor, this could for example be as
  // the Pointer is moved or the Keyboard movement keys are pressed.
  function handleDragMove({ delta }: DragMoveEvent): void {
    setOffsetLeft(delta.x);
  }

  // Fires when a draggable item is moved over a droppable container,
  // along with the unique identifier of that droppable container.
  function handleDragOver({ over }: DragOverEvent): void {
    setOverId(over ? over.id : null);
  }

  function getLogKey(log: ConsoleLog): string {
    return log.filename + "||" + log.functionName + "||" + log.lineNumber;
  }
  // Fires after a draggable item is dropped.
  // This event contains information about the active draggable id
  // along with information on whether the draggable item was dropped over.
  // If there are no collisions detected when the draggable item is dropped,
  // the over property will be null. If a collision is detected, the over
  // property will contain the id of the droppable over which it was dropped.
  function handleDragEnd({ active, over }: DragEndEvent): void {
    resetState();
    if (!over) {
      return;
    }

    const destinationIndex = findListIndex(over.id);
    if (destinationIndex === null) {
      return;
    }
    setLists((prevLists) => {
      const newLists = JSON.parse(JSON.stringify(prevLists)) as TreeItemList[];
      const itemToMove = getItemById(active.id);
      const clonedSourceItems: FlattenedItem<AbstractNode>[] = JSON.parse(
        JSON.stringify(flattenTree(newLists[sourceListIndex!].items))
      );
      const clonedDestinationItems: FlattenedItem<AbstractNode>[] = JSON.parse(
        JSON.stringify(flattenTree(newLists[destinationIndex].items))
      );
      if (!itemToMove || sourceListIndex === null) {
        return newLists;
      }

      // If moved within the same tree, apply projected depth
      if (sourceListIndex === destinationIndex && projected) {
        const { depth, parentId } = projected;
        if (parentId !== itemToMove.parentId) {
          resetState();
          return newLists;
        } else {
          const overIndex = clonedDestinationItems.findIndex(
            ({ id }) => id === over.id
          );
          const activeIndex = clonedDestinationItems.findIndex(
            ({ id }) => id === active.id
          );

          const activeTreeItem = clonedDestinationItems[activeIndex];

          clonedDestinationItems[activeIndex] = {
            ...activeTreeItem,
            depth,
            parentId,
          };

          const sortedItems = arrayMove(
            clonedDestinationItems,
            activeIndex,
            overIndex
          );
          const newItems = buildTree<AbstractNode>(sortedItems);
          newLists[destinationIndex].items = newItems;
        }
      } else if (projected) {
        let { depth, parentId } = projected;
        const originalParentId = originalTree.getOriginalParentId(
          itemToMove.id as string
        );
        if (
          clonedDestinationItems.findIndex(
            (item) => item.id === originalParentId
          ) >= 0
        ) {
          parentId = originalParentId;
          depth =
            clonedDestinationItems.find((item) => item.id === originalParentId)!
              .depth + 1;
        } else {
          depth = 0;
          parentId = null;
        }
        const itemCloned: FlattenedItem<AbstractNode> = JSON.parse(
          JSON.stringify(itemToMove)
        );
        // If moved to a different tree, remove from source and add to destination
        newLists[sourceListIndex].items = removeItem(
          newLists[sourceListIndex].items,
          active.id
        );

        itemCloned.depth = depth;
        itemCloned.parentId = parentId;
        // if the itemCloned has children, we need to remove them from the original list
        // and add it to the destination list recursively as well
        const addedItems: FlattenedItem<AbstractNode>[] = [itemCloned];
        function removeChildren(item: TreeItem, depthToParent: number): void {
          // find item in clonedSourceItems
          const itemToRemoved = clonedSourceItems.find(
            (clonedItem) => clonedItem.id === item.id
          );
          if (itemToRemoved) {
            addedItems.push({
              ...itemToRemoved,
              depth: depthToParent,
              parentId: itemToRemoved.parentId,
            });
          }
          item.children.forEach((child) => {
            removeChildren(child, depthToParent + 1);
          });
          newLists[sourceListIndex!].items = removeItem(
            newLists[sourceListIndex!].items,
            item.id
          );
        }
        itemCloned.children.forEach((child) => {
          removeChildren(child, 1);
        });

        newLists[destinationIndex].items = buildTree([
          ...clonedDestinationItems,
          ...addedItems,
        ]);
        // for each of the list within newlist check if it has at least one item
        // if it does not, remove it
        newLists.forEach((list, index) => {
          if (list.items.length === 0) {
            newLists.splice(index, 1);
          }
        });
        // if after moving the item, all the lists have at least one item, add an empty list
        if (newLists.every((list) => list.items.length > 0)) {
          newLists.push({ isDraggable: true, items: [] });
        }
      }

      return newLists;
    });
  }

  // Fires if a drag operation is cancelled, for example, if the
  // user presses escape while dragging a draggable item.
  function handleDragCancel(): void {
    resetState();
  }

  function resetState(): void {
    setOverId(null);
    setActiveId(null);
    setOffsetLeft(0);
    setSourceListIndex(null);
    document.body.style.setProperty("cursor", "");
  }

  // The user clicked the expand/collapse button.
  function handleCollapse(id: UniqueIdentifier): void {
    setLists((prevLists) =>
      prevLists.map((list) => {
        const newList = {
          ...list,
          items: setProperty(list.items, id, "collapsed", (value) => {
            return !value;
          }),
        };
        return newList;
      })
    );
  }

  function findListIndex(itemId: UniqueIdentifier): number | null {
    if (itemId === "placeholder") {
      // find the empty list
      return flattenedLists.findIndex((list) => list.length === 0);
    }
    return flattenedLists.findIndex((list) =>
      list.some((item) => item.id === itemId)
    );
  }

  function getItemById(
    itemId: UniqueIdentifier
  ): null | FlattenedItem<AbstractNode> {
    for (const list of flattenedLists) {
      for (const item of list) {
        if (item.id === itemId) {
          return item;
        }
      }
    }
    return null;
  }
}

const adjustTranslate: Modifier = ({ transform }) => {
  return {
    ...transform,
    y: transform.y - 25,
  };
};
