import React, { useEffect, useState } from "react";

const TerminalApp = () => {
  const [message, setMessage] = useState<string>("Test React App");

  return (
    <div>
      <h1>Terminal Sidebar</h1>
      <p>{message}</p>
    </div>
  );
};
export default TerminalApp;