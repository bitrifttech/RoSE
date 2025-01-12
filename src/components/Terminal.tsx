import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TerminalProps {
  shellSocket: WebSocket | null;
}

const Terminal: React.FC<TerminalProps> = ({ shellSocket }) => {
  const [lines, setLines] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shellSocket) {
      const handleMessage = (event: MessageEvent) => {
        setLines(prev => [...prev, event.data]);
        // Scroll to bottom
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      };

      shellSocket.addEventListener('message', handleMessage);

      return () => {
        shellSocket.removeEventListener('message', handleMessage);
      };
    }
  }, [shellSocket]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (shellSocket && shellSocket.readyState === WebSocket.OPEN) {
      // Send key events to the terminal
      shellSocket.send(JSON.stringify({
        type: 'input',
        data: e.key
      }));
    }
  };

  return (
    <div className="h-[300px] w-full rounded-lg border border-border/40 bg-background p-4 font-mono text-sm text-green-400">
      <div className="flex items-center justify-between mb-2 border-b border-border/40 pb-2">
        <div className="flex space-x-2">
          <div className="h-3 w-3 rounded-full bg-red-500"></div>
          <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-xs text-muted-foreground">Terminal</span>
      </div>
      <div 
        ref={terminalRef}
        className="h-[calc(100%-2rem)] overflow-auto focus:outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {lines.length === 0 ? (
          <div className="flex items-start">
            <span className="text-blue-400 mr-2">$</span>
            <span>{shellSocket ? 'Connected to terminal...' : 'Waiting for connection...'}</span>
          </div>
        ) : (
          <div className="space-y-1 whitespace-pre-wrap">
            {lines.map((line, index) => (
              <div key={index} className="break-all">
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Terminal;