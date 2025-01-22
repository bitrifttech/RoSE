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

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    console.log('Initializing terminal...');
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        cursor: 'hsl(var(--foreground))',
      },
      convertEol: true,
      cursorStyle: 'block',
      scrollback: 1000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    console.log('Terminal initialized');
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle window resize
    const handleResize = () => {
      if (!term || !fitAddon) return;
      console.log('Fitting terminal');
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      term.dispose();
    };
  }, []);

  // Handle WebSocket connection
  useEffect(() => {
    const term = xtermRef.current;
    if (!term || !shellSocket) return;

    console.log('Setting up WebSocket handlers');

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
        
        switch (message.type) {
          case 'output':
            term.write(message.data);
            break;
          case 'connected':
            console.log('Shell connected:', message.data);
            term.writeln(`\r\nConnected to ${message.data.shell}`);
            term.writeln(`Working directory: ${message.data.cwd}`);
            term.writeln('');
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    const handleOpen = () => {
      console.log('WebSocket opened');
      term.clear();
      term.writeln('\r\n🚀 Connected to shell server\r\n');

      // Send initial terminal size
      const { cols, rows } = term;
      shellSocket.send(JSON.stringify({
        type: 'resize',
        data: { cols, rows }
      }));
    };

    const handleClose = () => {
      console.log('WebSocket closed');
      term.writeln('\r\n❌ Disconnected from shell server\r\n');
    };

    const handleError = (error: Event) => {
      console.error('WebSocket error:', error);
      term.writeln('\r\n⚠️ Error connecting to shell server\r\n');
    };

    // Set up terminal input handling
    const handleTerminalData = (data: string) => {
      if (shellSocket.readyState === WebSocket.OPEN) {
        console.log('Sending terminal data:', data);
        shellSocket.send(JSON.stringify({
          type: 'input',
          data: data
        }));
      }
    };

    term.onData(handleTerminalData);
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
    <div 
      ref={terminalRef}
      className="h-full w-full"
    />
  );
};

export default Terminal;