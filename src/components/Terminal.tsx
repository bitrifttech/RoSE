import React, { useEffect, useRef } from "react";
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

interface TerminalProps {
  shellSocket: WebSocket | null;
}

const Terminal: React.FC<TerminalProps> = ({ shellSocket }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm>();
  const fitAddonRef = useRef<FitAddon>();

  useEffect(() => {
    // Initialize terminal
    if (!terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#000000',
        foreground: '#ffffff'
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle terminal input
    term.onData(data => {
      if (shellSocket?.readyState === WebSocket.OPEN) {
        shellSocket.send(JSON.stringify({
          type: 'input',
          data: data
        }));
      }
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      if (shellSocket?.readyState === WebSocket.OPEN) {
        shellSocket.send(JSON.stringify({
          type: 'resize',
          data: {
            cols: term.cols,
            rows: term.rows
          }
        }));
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    if (!xtermRef.current || !shellSocket) return;

    const term = xtermRef.current;

    // Write initial message
    if (!shellSocket) {
      term.writeln('\r\nWaiting for connection...\r\n');
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'output':
            term.write(message.data);
            break;
          case 'connected':
            term.writeln(`\r\nShell session started (${message.data.shell})`);
            term.writeln(`Working directory: ${message.data.cwd}`);
            term.writeln('');
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    const handleOpen = () => {
      term.clear();
      term.writeln('\r\n🚀 Connected to shell server\r\n');
    };

    const handleClose = () => {
      term.writeln('\r\n❌ Disconnected from shell server\r\n');
    };

    const handleError = () => {
      term.writeln('\r\n⚠️ Error connecting to shell server\r\n');
    };

    shellSocket.addEventListener('message', handleMessage);
    shellSocket.addEventListener('open', handleOpen);
    shellSocket.addEventListener('close', handleClose);
    shellSocket.addEventListener('error', handleError);

    return () => {
      shellSocket.removeEventListener('message', handleMessage);
      shellSocket.removeEventListener('open', handleOpen);
      shellSocket.removeEventListener('close', handleClose);
      shellSocket.removeEventListener('error', handleError);
    };
  }, [shellSocket]);

  return (
    <div className="relative h-[300px] w-full rounded-lg border border-border/40 bg-background overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
        <div className="flex space-x-2">
          <div className="h-3 w-3 rounded-full bg-red-500"></div>
          <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-xs text-muted-foreground">Terminal</span>
      </div>
      <div 
        ref={terminalRef} 
        className="h-[calc(100%-2.5rem)] w-full"
      />
    </div>
  );
};

export default Terminal;