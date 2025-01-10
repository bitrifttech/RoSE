import React from "react";

const Terminal = () => {
  return (
    <div className="h-[300px] w-full rounded-lg border border-border/40 bg-background p-4 font-mono text-sm text-green-400 overflow-hidden">
      <div className="flex items-center justify-between mb-2 border-b border-border/40 pb-2">
        <div className="flex space-x-2">
          <div className="h-3 w-3 rounded-full bg-red-500"></div>
          <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-xs text-muted-foreground">Terminal</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-start">
          <span className="text-blue-400 mr-2">$</span>
          <span className="typing-animation">Connecting to server...</span>
        </div>
      </div>
    </div>
  );
};

export default Terminal;