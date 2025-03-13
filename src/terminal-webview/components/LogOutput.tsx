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
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import type { ConsoleLog } from "../../types/message";

interface Props {
  log: ConsoleLog;
  isOpen: boolean;
  label?: string;
}
export default function LogOutput({ log, isOpen, label }: Props): JSX.Element {
  return (
    <>
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

        <Chip style={{ fontSize: "11px" }} label={label} />
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
    </>
  );
}
