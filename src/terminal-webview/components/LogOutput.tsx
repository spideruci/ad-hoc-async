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
import PushPinIcon from "@mui/icons-material/PushPin"; // Import the pin icon
import type { ConsoleLog } from "../../types/message";

interface Props {
  log: ConsoleLog;
  isOpen: boolean;
  labelClick?: (log: ConsoleLog) => void;
  label?: string;
  onDragStart: (log: ConsoleLog) => void;
  onPinClick?: (labelName: string) => void;
  pinColor?: string;
}
export default function LogOutput({
  log,
  isOpen,
  label,
  labelClick,
  onDragStart,
  onPinClick,
  pinColor,
}: Props): JSX.Element {
  return (
    <div
      draggable={true}
      onDragStart={() => onDragStart(log)}
      style={{ height: "30px" }}
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
                {String(log.logData[0]).substring(0, 50)}
              </span>
            </>
          }
        />

        <Chip
          size="small"
          style={{ fontSize: "11px" }}
          label={label}
          onClick={() => {
            if (labelClick) {
              labelClick(log);
            }
          }}
        />
        <IconButton
          size="small"
          onClick={() => {
            onPinClick && label && onPinClick(label);
          }}
        >
          <PushPinIcon
            fontSize="small"
            style={{ color: pinColor ?? "#f8f8f8" }}
          />
        </IconButton>
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
