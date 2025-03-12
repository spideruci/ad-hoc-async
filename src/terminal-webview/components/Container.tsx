import { styled } from "@mui/material";

/**
 * Properties expected by the Container component.
 */
export interface ContainerProps {
  clone?: boolean;
  ghost?: boolean;
  indicator?: boolean;
}

/**
 * The div that contains the other elements in the item.
 */
export const Container = styled("div", {
  shouldForwardProp: (p: string) =>
    !["ghost", "indicator", "clone"].includes(p),
})<ContainerProps>(({ clone, ghost, indicator }) => ({
  width: "100%",
  position: "relative",
  display: "flex",
  alignItems: "center",
  backgroundColor: ghost && indicator ? "#007acc" : "#252526",
  border: "1px solid #3c3c3c",
  color: "#d4d4d4",
  boxSizing: "border-box",
  padding: ghost && indicator ? 0 : clone ? "5px 10px" : "10px 10px",

  paddingRight: clone ? "12px" : undefined,
  borderRadius: clone ? "4px" : undefined,
  boxShadow: clone ? "0px 15px 15px 0 rgba(0, 0, 0, 0.3)" : undefined,

  height: ghost && indicator ? "4px" : undefined,
  borderColor: ghost && indicator ? "#007acc" : undefined,

  ":before":
    ghost && indicator
      ? {
        position: "absolute",
        left: "-8px",
        top: "-4px",
        display: "block",
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        border: "1px solid #007acc",
        backgroundColor: "#1e1e1e",
        content: '""',
      }
      : undefined,
  ">*": {
    opacity: ghost && indicator ? 0 : undefined,
    height: ghost && indicator ? 0 : undefined,
    boxShadow: ghost ? "none" : undefined,
    backgroundColor: ghost ? "transparent" : undefined,
  },
}));
