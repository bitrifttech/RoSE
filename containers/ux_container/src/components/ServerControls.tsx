import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Play, Square } from 'lucide-react';
import { startServer, stopServer, getServerStatus } from '../lib/api';
import { useToast } from './ui/use-toast';

export function ServerControls({ className = '' }: { className?: string }) {
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await getServerStatus();
        console.log('Server status:', status);
        setIsRunning(status.running);
      } catch (error) {
        console.error('Failed to check server status:', error);
      }
    };

    checkStatus();
    // Check more frequently to be more responsive
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleServer = async () => {
    setIsLoading(true);
    try {
      if (isRunning) {
        await stopServer();
        const status = await getServerStatus();
        setIsRunning(status.running);
        toast({
          title: 'Server Stopped',
          description: 'Node server has been stopped',
        });
      } else {
        await startServer();
        const status = await getServerStatus();
        setIsRunning(status.running);
        toast({
          title: 'Server Started',
          description: 'Node server is now running',
        });
      }
    } catch (error) {
      console.error('Server toggle error:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isRunning ? 'stop' : 'start'} server`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant={isRunning ? "destructive" : "default"}
        size="sm"
        onClick={handleToggleServer}
        disabled={isLoading}
        className="gap-2"
      >
        {isRunning ? (
          <>
            <Square className="h-4 w-4" />
            Stop Server
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Start Server
          </>
        )}
      </Button>
      <div className="text-sm text-muted-foreground">
        Status: {isRunning ? 'Running' : 'Stopped'}
      </div>
    </div>
  );
}
