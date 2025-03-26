/* eslint-disable indent */
import { useState } from "react";
import {
  ListItemButton,
  ListItemText,
  IconButton,
  Collapse,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
} from "@mui/material";
import ReactJson from "react-json-view";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import type { ConsoleLog } from "../../types/message";

interface Props {
  log: ConsoleLog;
  isOpen: boolean;
  isHighlight?: boolean;
  labelClick?: (log: ConsoleLog) => void;
  label?: string;
  searchQuery?: string;
  onDragStart?: (log: ConsoleLog) => void;
  forwardedRef?: React.Ref<HTMLDivElement>;
  onPinClick?: (labelName: string) => void;
  pinColor?: string;
  isBackEnabled?: boolean;
  showBackLabel?: boolean;
  setHoveredLabelId?: () => void;
  resetHoveredLabelId?: () => void;
  ghostMode?: boolean;
  isGhostModeHovered?: boolean;
  setGhostModeHoveredId?: () => void;
  resetGhostModeHoveredId?: () => void;
}

function highlightWithContext(
  text: string,
  isHighlight?: boolean,
  query?: string
): JSX.Element | string {
  if (!query || !text.toLowerCase().includes(query.toLowerCase())) {
    return text.substring(0, 50);
  }

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  const start = Math.max(index - 25, 0);
  const end = Math.min(index + query.length + 25, text.length);
  const before = text.substring(start, index);
  const match = text.substring(index, index + query.length);
  const after = text.substring(index + query.length, end);
  return (
    <>
      {start > 0 && "..."}
      {before}
      <mark style={{ backgroundColor: isHighlight ? "red" : "yellow" }}>
        {match}
      </mark>
      {after}
      {end < text.length && "..."}
    </>
  );
}

export default function LogOutput({
  log,
  isOpen,
  searchQuery,
  isHighlight,
  label,
  labelClick,
  forwardedRef,
  onDragStart,
  onPinClick,
  pinColor,
  isBackEnabled,
  showBackLabel,
  setHoveredLabelId,
  resetHoveredLabelId,
  ghostMode,
  isGhostModeHovered,
  setGhostModeHoveredId,
  resetGhostModeHoveredId,
}: Props): JSX.Element {
  const [showBackButtonOnGhostModeHover, setShowBackButtonOnGhostModeHover] =
    useState(false);
  return (
    <div
      draggable={true}
      onDragStart={() => onDragStart && onDragStart(log)}
      style={{
        height: "30px",
        opacity: isGhostModeHovered ? 0.6 : ghostMode ? 0.2 : 1,
      }}
      ref={forwardedRef}
      onMouseEnter={() => {
        ghostMode && setGhostModeHoveredId && setGhostModeHoveredId();
        ghostMode && setShowBackButtonOnGhostModeHover(true);
      }}
      onMouseLeave={() => {
        ghostMode && resetGhostModeHoveredId && resetGhostModeHoveredId();
        ghostMode && setShowBackButtonOnGhostModeHover(false);
      }}
    >
      <ListItemButton sx={{ height: "30px" }}>
        <ListItemText
          primary={
            <>
              <span
                style={{
                  fontSize: "11px",
                  fontFamily: "var(--vscode-editor-font-family)",
                }}
              >
                {highlightWithContext(
                  String(log.logData[0] ?? ""),
                  isHighlight,
                  searchQuery
                )}
              </span>
            </>
          }
        />
        {!ghostMode && (
          <Chip
            size="small"
            style={{
              fontSize: "11px",
              width: "180px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            label={!showBackLabel ? label : "Unsplit and move back"}
            onClick={() => {
              if (labelClick) {
                labelClick(log);
              }
            }}
            onMouseEnter={() =>
              isBackEnabled && setHoveredLabelId && setHoveredLabelId()
            }
            onMouseLeave={() =>
              isBackEnabled && resetHoveredLabelId && resetHoveredLabelId()
            }
            deleteIcon={
              !showBackLabel ? (
                <FiberManualRecordIcon
                  fontSize="small"
                  style={{ color: pinColor ?? "#f8f8f8" }}
                />
              ) : undefined
            }
            onDelete={
              !showBackLabel
                ? () => {
                    onPinClick && label && onPinClick(label);
                  }
                : undefined
            }
          />
        )}
        {ghostMode && showBackButtonOnGhostModeHover && (
          <Chip
            size="small"
            style={{
              fontSize: "11px",
            }}
            label={"Moved splitted logs back"}
            onClick={() => {
              if (labelClick) {
                labelClick(log);
              }
            }}
          />
        )}
      </ListItemButton>
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <Card sx={{ height: "auto" }}>
          <CardContent>
            {log.logData.map((data) => {
              if (typeof data === "object") {
                return (
                  <ReactJson
                    theme={"monokai"}
                    onEdit={false}
                    onAdd={false}
                    onDelete={false}
                    collapseStringsAfterLength={100}
                    collapsed={true}
                    src={data}
                  />
                );
              } else {
                return <Typography variant="body2">{String(data)}</Typography>;
              }
            })}
          </CardContent>
        </Card>
      </Collapse>
      <Divider />
    </div>
  );
}
