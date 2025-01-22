import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";

export interface ContainerControlsProps {
  isConnected: boolean;
  isContainerRunning: boolean;
  onStartContainer: () => void;
  onStopContainer: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  className?: string;
}

export function ContainerControls({
  isConnected,
  isContainerRunning,
  onStartContainer,
  onStopContainer,
  onConnect,
  onDisconnect,
  className,
}: ContainerControlsProps) {
  const handleToggleContainer = () => {
    if (isContainerRunning) {
      onStopContainer();
    } else {
      onStartContainer();
    }
  };

  const handleToggleConnection = () => {
    if (isConnected) {
      onDisconnect();
    } else {
      onConnect();
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant={isContainerRunning ? "destructive" : "default"}
        size="sm"
        onClick={handleToggleContainer}
        className="gap-2"
      >
        {isContainerRunning ? (
          <>
            <Square className="h-4 w-4" />
            Stop Container
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Start Container
          </>
        )}
      </Button>
      <Button
        variant={isConnected ? "destructive" : "default"}
        size="sm"
        onClick={handleToggleConnection}
        className="gap-2"
      >
        {isConnected ? "Disconnect" : "Connect"}
      </Button>
      <div className="text-sm text-muted-foreground">
        Container: {isContainerRunning ? 'Running' : 'Stopped'} | 
        Connection: {isConnected ? 'Connected' : 'Disconnected'}
      </div>
    </div>
  );
}
