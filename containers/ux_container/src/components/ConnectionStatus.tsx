import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  isConnected: boolean;
  className?: string;
}

export function ConnectionStatus({ isConnected, className }: ConnectionStatusProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "h-2 w-2 rounded-full",
          isConnected ? "bg-green-500" : "bg-red-500",
          "animate-pulse"
        )}
      />
      <span className="text-sm text-muted-foreground">
        {isConnected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}
