import { Button } from "@/components/ui/button";
import { Play, Square, Power, PowerOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContainerControlsProps {
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
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-2 border-r border-border/40 pr-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onStartContainer}
          disabled={isContainerRunning}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Start Container
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onStopContainer}
          className="gap-2"
        >
          <Square className="h-4 w-4" />
          Stop Container
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onConnect}
          disabled={isConnected || !isContainerRunning}
          className="gap-2"
        >
          <Power className="h-4 w-4" />
          Connect
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDisconnect}
          disabled={!isConnected}
          className="gap-2"
        >
          <PowerOff className="h-4 w-4" />
          Disconnect
        </Button>
      </div>
    </div>
  );
}
