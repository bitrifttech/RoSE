import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Terminal from "@/components/Terminal";
import CodeEditor from "@/components/CodeEditor";
import Chat from "@/components/Chat";
import FileExplorer from "@/components/FileExplorer";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ContainerControls } from "@/components/ContainerControls";
import { ContainerList } from "@/components/ContainerList";
import { Container } from "@/types/container";

const ProjectDesign = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState<string>(`// Write your code here
console.log("Hello, World!");`);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isContainerRunning, setIsContainerRunning] = useState(false);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [containerError, setContainerError] = useState<string>();

  const refreshContainers = useCallback(async () => {
    try {
      const response = await fetch('/api/containers', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch containers');
      }
      const containers = await response.json();
      setContainers(containers);
      setContainerError(undefined);
      
      // Update container running state based on if we find our container
      if (containerId) {
        setIsContainerRunning(containers.some(c => c.id === containerId));
      }
    } catch (err) {
      setContainerError(err instanceof Error ? err.message : 'Failed to fetch containers');
      setContainers([]);
    }
  }, [containerId]);

  const handleStartContainer = useCallback(async () => {
    try {
      const response = await fetch('/api/container', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to start container');
      }
      const data = await response.json();
      setContainerId(data.containerId);
      setIsContainerRunning(true);
      toast({
        title: "Container started",
        description: `Container ID: ${data.containerId.substring(0, 12)}`,
      });
      refreshContainers();
    } catch (err) {
      toast({
        title: "Failed to start container",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }
  }, [toast, refreshContainers]);

  const handleStopContainer = useCallback(async () => {
    if (!containerId) return;
    
    try {
      const response = await fetch(`/api/container/${containerId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to stop container');
      }
      setIsContainerRunning(false);
      toast({
        title: "Container stopped",
        description: `Container ID: ${containerId.substring(0, 12)}`,
      });
      setContainerId(null);
      refreshContainers();
    } catch (err) {
      toast({
        title: "Failed to stop container",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }
  }, [containerId, toast, refreshContainers]);

  const connectToServer = useCallback(() => {
    const ws = new WebSocket('/api/ws');

    ws.onopen = () => {
      setIsConnected(true);
      toast({
        title: "Connected to server",
        description: "Successfully connected to the design server",
      });
    };

    ws.onclose = () => {
      setIsConnected(false);
      setSocket(null);
      toast({
        title: "Disconnected from server",
        description: "Connection lost",
        variant: "destructive",
      });
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection error",
        description: "Failed to connect to the design server",
        variant: "destructive",
      });
    };

    setSocket(ws);
  }, [toast]);

  const disconnectFromServer = useCallback(() => {
    if (socket) {
      socket.close();
    }
  }, [socket]);

  // Refresh containers periodically
  useEffect(() => {
    refreshContainers();
    const interval = setInterval(refreshContainers, 5000);
    return () => clearInterval(interval);
  }, [refreshContainers]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 right-0 left-0 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 z-50">
        <div className="container h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-accent/50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <ConnectionStatus isConnected={isConnected} />
          </div>
          <ContainerControls
            isConnected={isConnected}
            isContainerRunning={isContainerRunning}
            onStartContainer={handleStartContainer}
            onStopContainer={handleStopContainer}
            onConnect={connectToServer}
            onDisconnect={disconnectFromServer}
          />
          <DarkModeToggle />
        </div>
      </header>

      <div className="flex flex-col h-[calc(100vh-4rem)] mt-16">
        <div className="container py-4">
          <ContainerList containers={containers} error={containerError} />
        </div>
        
        <div className="flex flex-1 min-h-0">
          {/* Chat Window */}
          <div className="w-[400px] border-r border-border/40 p-4 bg-sidebar">
            <div className="h-full rounded-lg border border-border/40 bg-background">
              <Chat />
            </div>
          </div>

          {/* Code Editor and Preview */}
          <div className="flex-1">
            <Tabs defaultValue="editor" className="h-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="editor">Code Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="editor" className="h-[calc(100%-3rem)]">
                <div className="h-full rounded-lg border border-border/40 bg-background p-4">
                  <div className="h-full flex">
                    <FileExplorer />
                    <div className="flex-1">
                      <CodeEditor 
                        value={code}
                        onChange={(value) => setCode(value ?? "")}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="preview" className="h-[calc(100%-3rem)]">
                <div className="h-full rounded-lg border border-border/40 bg-background p-4">
                  <h2 className="text-lg font-semibold mb-4">Preview</h2>
                  {/* Preview content will go here */}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Terminal Window */}
        <div className="p-4">
          <Terminal />
        </div>
      </div>
    </div>
  );
};

export default ProjectDesign;