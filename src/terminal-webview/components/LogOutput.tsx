import { ListItemButton, ListItemText, IconButton, Collapse, Card, CardContent, Typography, Divider } from "@mui/material";
import ReactJson from "react-json-view";
import { ConsoleLog } from "../../types/message";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
interface Props
{
    log: ConsoleLog;
    isOpen: boolean;
}
export default function LogOutput({ log, isOpen }: Props) {
    return (
        <>
            <ListItemButton
                sx={{ height: "30px" }}
            >
                <ListItemText
                    primary={String(log.logData[0]).substring(
                        0,
                        100
                    )}
                />
                <IconButton
                    edge="end"
                    aria-label="delete"
                    size="small"
                >
                    <KeyboardArrowRightIcon fontSize="inherit" />
                </IconButton>
            </ListItemButton>
            <Collapse
                in={isOpen}
                timeout="auto"
                unmountOnExit
            >
                <Card
                    sx={{ height: "auto" }}
                >
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
                                return (
                                    <Typography variant="body2">
                                        {String(data)}
                                    </Typography>
                                );
                            }
                        })}
                    </CardContent>
                </Card>
            </Collapse>
            <Divider />
        </>
    );
}