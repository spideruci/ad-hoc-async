import React from "react";
import { type DotProps } from "recharts";
import { type Log } from "../../types/message";

const CustomizedDot: React.FC<DotProps & {payload: {log: Log}}> = (props) => {
  const { cx, cy, payload } = props;
  if (payload.log.type === "console.log") {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        stroke="none"
        fill="red"
      />
    );
  }
  return <circle cx={cx} cy={cy} r={3} stroke="none" fill="#8884d8" />;
};

export default CustomizedDot;